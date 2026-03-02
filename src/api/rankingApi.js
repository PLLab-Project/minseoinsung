import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { computeMacroFeatures, evaluateMacroIndex } from "./macroIndex";
import { fetchActiveMacroModel, resolveMacroScoringModel } from "./macroModelApi";
import { calculateAccuracy, clamp, round2, toMillis, toNumber } from "./playMetrics";

const DEFAULT_LIMIT = 200;
const DEFAULT_GAME_TITLE = "Rhythm";
const HITS_CONCURRENCY = 20;

export { calculateAccuracy };

export function calculateMacroIndex({
  hits = [],
  perfect = 0,
  good = 0,
  miss = 0,
  notes = null,
  meanAbsDeltaMs = null,
  stdAbsDeltaMs = null,
} = {}) {
  const features = computeMacroFeatures({
    hits,
    perfect,
    good,
    miss,
    notes,
    meanAbsDeltaMs,
    stdAbsDeltaMs,
  });

  return evaluateMacroIndex({ features }).macroScore;
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeStoredMacroFeatures(rawMacroFeatures) {
  if (!rawMacroFeatures || typeof rawMacroFeatures !== "object") return null;

  return {
    meanAbsDelta: toOptionalNumber(rawMacroFeatures.meanAbsDelta),
    stdAbsDelta: toOptionalNumber(rawMacroFeatures.stdAbsDelta),
    perfectRate: toOptionalNumber(rawMacroFeatures.perfectRate),
    missRate: toOptionalNumber(rawMacroFeatures.missRate),
    impossiblyFastRate: toOptionalNumber(rawMacroFeatures.impossiblyFastRate),
    deltaAutocorr: toOptionalNumber(rawMacroFeatures.deltaAutocorr),
    fixedOffsetRate: toOptionalNumber(rawMacroFeatures.fixedOffsetRate),
    goodRate: toOptionalNumber(rawMacroFeatures.goodRate),
    weightedAccuracy: toOptionalNumber(rawMacroFeatures.weightedAccuracy),
    comboRate: toOptionalNumber(rawMacroFeatures.comboRate),
    scorePerNote: toOptionalNumber(rawMacroFeatures.scorePerNote),
    meanSignedDelta: toOptionalNumber(rawMacroFeatures.meanSignedDelta),
  };
}

async function fetchSessionHits(sessionDocId) {
  try {
    const hitsSnap = await getDocs(collection(db, "play_results", sessionDocId, "hits"));
    return {
      hits: hitsSnap.docs.map((docSnap) => docSnap.data()),
      readOk: true,
    };
  } catch (error) {
    console.warn(`[ranking] Failed to load hits for session ${sessionDocId}.`, error);
    return { hits: [], readOk: false };
  }
}

function buildMacroFeatures(data, hits) {
  const computedFeatures = computeMacroFeatures({
    hits,
    perfect: data.perfect,
    good: data.good,
    miss: data.miss,
    notes: data.notes,
    comboMax: data.comboMax,
    score: data.score,
    meanAbsDeltaMs: data.meanAbsDeltaMs ?? data.macroFeatures?.meanAbsDelta ?? null,
    stdAbsDeltaMs: data.stdAbsDeltaMs ?? data.macroFeatures?.stdAbsDelta ?? null,
  });

  if (hits.length > 0) {
    return {
      features: computedFeatures,
      source: "HITS",
    };
  }

  const storedFeatures = normalizeStoredMacroFeatures(data.macroFeatures);
  if (storedFeatures) {
    return {
      features: {
        ...computedFeatures,
        ...Object.fromEntries(
          Object.entries(storedFeatures).filter(([, value]) => value !== undefined)
        ),
      },
      source: "STORED_FEATURES",
    };
  }

  return {
    features: computedFeatures,
    source: "SUMMARY_ONLY",
  };
}

async function normalizeRankingRow(snapshot, { scoringModel }) {
  const data = snapshot.data();

  const score = Math.round(Math.max(0, toNumber(data.score, 0)));
  const accuracy =
    data.accuracy == null
      ? calculateAccuracy({
          perfect: data.perfect,
          good: data.good,
          miss: data.miss,
          notes: data.notes,
        })
      : round2(clamp(toNumber(data.accuracy, 0), 0, 100));

  const { hits, readOk } = await fetchSessionHits(snapshot.id);
  const { features, source } = buildMacroFeatures(data, hits);
  const computedMacro = evaluateMacroIndex({
    features,
    model: scoringModel,
  });

  const macroScore = round2(clamp(toNumber(computedMacro.macroScore, 0), 0, 100));
  const macroThreshold = Math.max(0, toNumber(computedMacro.threshold, 60));
  const macroSuspicious = macroScore >= macroThreshold;
  const macroReasons = Array.isArray(computedMacro.reasons) ? [...computedMacro.reasons] : [];

  if (!readOk) {
    macroReasons.push("Hits read failed: summary fallback used.");
  } else if (!hits.length && source !== "HITS") {
    macroReasons.push("No hits data: summary/macroFeatures fallback used.");
  }

  return {
    id: snapshot.id,
    authUid: data.authUid ?? null,
    userId: data.userId ?? null,
    nickname: data.nickname ?? data.userId ?? "Unknown",
    gameTitle: data.gameTitle ?? data.game ?? DEFAULT_GAME_TITLE,
    score,
    accuracy,
    macroScore,
    macroSuspicious,
    macroThreshold,
    macroDetector: computedMacro.detector,
    macroReasons,
    macroDataSource: source,
    hitCount: hits.length,
    hasStoredMacroFeatures: Boolean(data.macroFeatures && typeof data.macroFeatures === "object"),
    playedAt: toMillis(data.createdAt) || toNumber(data.playedAt, 0),
  };
}

async function mapWithConcurrency(items, mapper, concurrency = HITS_CONCURRENCY) {
  if (!items.length) return [];

  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function logDataQualitySummary(rows) {
  if (!import.meta.env.DEV || !rows.length) return;

  const missingHits = rows.filter((row) => row.hitCount === 0).length;
  const summaryOnly = rows.filter((row) => row.macroDataSource === "SUMMARY_ONLY").length;
  const storedFallback = rows.filter(
    (row) => row.macroDataSource === "STORED_FEATURES"
  ).length;

  console.info(
    `[ranking] sessions=${rows.length}, missingHits=${missingHits}, storedFeatureFallback=${storedFallback}, summaryOnly=${summaryOnly}`
  );
}

// ✅ 추가: bannedUsers 컬렉션에서 차단된 authUid Set을 가져옴
async function fetchBannedUidSet() {
  try {
    const snap = await getDocs(collection(db, "bannedUsers"));
    return new Set(snap.docs.map((d) => d.id)); // 문서 ID = authUid
  } catch (error) {
    console.warn("[ranking] Failed to load bannedUsers. Skipping ban filter.", error);
    return new Set();
  }
}

export async function fetchRankingRows({ limitCount = DEFAULT_LIMIT } = {}) {
  const safeLimit = Math.min(Math.max(1, toNumber(limitCount, DEFAULT_LIMIT)), 1000);

  const rankingQuery = query(
    collection(db, "play_results"),
    orderBy("score", "desc"),
    limit(safeLimit)
  );

  // ✅ 랭킹 쿼리와 bannedUsers를 병렬로 조회해서 속도 유지
  const [rankingSnap, bannedUidSet] = await Promise.all([
    getDocs(rankingQuery),
    fetchBannedUidSet(),
  ]);

  let scoringModel = null;
  try {
    const activeModel = await fetchActiveMacroModel();
    scoringModel = resolveMacroScoringModel(activeModel).modelForScoring;
  } catch (error) {
    console.warn("[ranking] Failed to load active macro model. Using rules only.", error);
  }

  const rows = await mapWithConcurrency(
    rankingSnap.docs,
    (snapshot) => normalizeRankingRow(snapshot, { scoringModel })
  );

  logDataQualitySummary(rows);

  // ✅ 차단된 유저의 세션을 랭킹에서 제외
  return rows.filter((row) => !bannedUidSet.has(row.authUid));
}