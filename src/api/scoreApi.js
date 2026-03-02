import {
  addDoc,
  collection,
  serverTimestamp,
  writeBatch,
  doc as fsDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { fetchActiveMacroModel, resolveMacroScoringModel } from "./macroModelApi";
import { computeMacroFeatures, evaluateMacroIndex } from "./macroIndex";
import { calculateAccuracy, toNumOrNull, toNumber } from "./playMetrics";
import { getMyUser } from "./userApi";

const CHUNK = 500;

export async function savePlayResult(payload = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("not-authenticated");

  const me = await getMyUser();
  const userId = me?.userId;
  if (!userId) throw new Error("user-profile-not-found");

  const hits = Array.isArray(payload.hits) ? payload.hits : [];

  const score = Math.round(Math.max(0, toNumber(payload.score)));
  const comboMax = Math.round(Math.max(0, toNumber(payload.comboMax)));
  const perfect = Math.round(Math.max(0, toNumber(payload.perfect)));
  const good = Math.round(Math.max(0, toNumber(payload.good)));
  const miss = Math.round(Math.max(0, toNumber(payload.miss)));
  const notes = Math.round(
    Math.max(Math.max(0, toNumber(payload.notes)), perfect + good + miss)
  );

  const meanAbsDeltaMs = toNumOrNull(payload.meanAbsDeltaMs);
  const stdAbsDeltaMs = toNumOrNull(payload.stdAbsDeltaMs);

  const accuracy = calculateAccuracy({ perfect, good, miss, notes });
  const macroFeatures = computeMacroFeatures({
    hits,
    perfect,
    good,
    miss,
    notes,
    comboMax,
    score,
    meanAbsDeltaMs,
    stdAbsDeltaMs,
  });

  let macroModel = null;
  try {
    macroModel = await fetchActiveMacroModel();
  } catch (error) {
    console.warn("Failed to load active macro model. Falling back to rule score.", error);
  }

  const macroModelState = resolveMacroScoringModel(macroModel);
  const macroEvaluation = evaluateMacroIndex({
    features: macroFeatures,
    model: macroModelState.modelForScoring,
  });

  const macroScore = macroEvaluation.macroScore;
  const macroSuspicious = macroScore >= macroEvaluation.threshold;
  const macroReasons = macroModelState.readyForMl
    ? macroEvaluation.reasons
    : [
        `${macroModelState.reason} (${macroModelState.trainingSampleCount}/${macroModelState.minSampleCountForMl}, pos ${macroModelState.trainingPositiveCount}/${macroModelState.minClassCountForMl}, neg ${macroModelState.trainingNegativeCount}/${macroModelState.minClassCountForMl})`,
        ...macroEvaluation.reasons,
      ];

  const gameTitleCandidate =
    typeof payload.gameTitle === "string"
      ? payload.gameTitle.trim()
      : typeof payload.game === "string"
      ? payload.game.trim()
      : "";

  const gameTitle = gameTitleCandidate || "Rhythm";
  const nickname = me?.name ?? userId;

  const parentRef = await addDoc(collection(db, "play_results"), {
    userId,
    authUid: user.uid,
    nickname,
    gameTitle,
    score,
    comboMax,
    perfect,
    good,
    miss,
    notes,
    accuracy,
    macroScore,
    macroSuspicious,
    macroThreshold: macroEvaluation.threshold,
    macroRuleScore: macroEvaluation.ruleScore,
    macroMlScore: macroEvaluation.mlScore,
    macroDetector: macroEvaluation.detector,
    macroReasons,
    macroModelReady: macroModelState.readyForMl,
    macroModelMinSampleCount: macroModelState.minSampleCountForMl,
    macroModelMinClassCount: macroModelState.minClassCountForMl,
    macroModelTrainingSampleCount: macroModelState.trainingSampleCount,
    macroModelTrainingPositiveCount: macroModelState.trainingPositiveCount,
    macroModelTrainingNegativeCount: macroModelState.trainingNegativeCount,
    macroFeatureVersion: macroEvaluation.featureVersion,
    macroRulesetVersion: macroEvaluation.rulesetVersion,
    macroModelVersion: macroEvaluation.modelVersion,
    macroFeatures,
    meanAbsDeltaMs,
    stdAbsDeltaMs,
    createdAt: serverTimestamp(),
  });

  for (let i = 0; i < hits.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = hits.slice(i, i + CHUNK);

    chunk.forEach((hit, idx) => {
      const noteIndex = Number.isFinite(Number(hit.noteIndex))
        ? Number(hit.noteIndex)
        : i + idx;

      const hitRef = fsDoc(
        collection(db, "play_results", parentRef.id, "hits"),
        String(noteIndex)
      );

      batch.set(hitRef, {
        lane: toNumber(hit.lane),
        hitTime: toNumOrNull(hit.hitTime),
        delta: toNumOrNull(hit.deltaMs ?? hit.delta),
        result: typeof hit.result === "string" ? hit.result : "",
      });
    });

    await batch.commit();
  }

  return { id: parentRef.id, hitCount: hits.length };
}
