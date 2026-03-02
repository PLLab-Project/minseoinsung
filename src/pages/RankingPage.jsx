import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { fetchRankingRows } from "../api/rankingApi";
import { getMyUser } from "../api/userApi";
import { auth } from "../firebase";

const SORT_OPTIONS = {
  scoreDesc: "점수 높은 순",
  accuracy: "정확도 높은 순",
  macro: "매크로 지수 높은 순",
  recent: "최신 플레이 순",
};

const safeNum = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatDate = (playedAt) => {
  const date = new Date(safeNum(playedAt, 0));
  if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "-";

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

function PodiumCard({ rank, row }) {
  const toneClass =
    rank === 1
      ? "border-yellow-200/25 bg-yellow-200/10 text-yellow-100"
      : rank === 2
      ? "border-white/20 bg-white/10 text-white/90"
      : "border-orange-200/20 bg-orange-200/10 text-orange-100";

  return (
    <div className="rounded-2xl border border-white/12 bg-black/25 p-5 shadow-sm backdrop-blur transition hover:bg-black/20">
      <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${toneClass}`}>
        {rank === 1 ? "GOLD" : rank === 2 ? "SILVER" : "BRONZE"}
      </div>

      <div className="mt-4 text-3xl font-semibold tracking-tight text-white">#{rank}</div>

      <div className="mt-2 text-sm text-white/65">
        <div className="truncate text-white">{row?.nickname ?? "기록 없음"}</div>
        <div className="truncate text-white/65">{row?.gameTitle ?? "-"}</div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
        <div>점수</div>
        <div>정확도</div>
        <div>매크로</div>

        <div className="text-right tabular-nums text-white/85">{safeNum(row?.score).toLocaleString()}</div>
        <div className="text-right tabular-nums text-white/85">
          {row?.accuracy != null ? `${safeNum(row.accuracy).toFixed(2)}%` : "-"}
        </div>
        <div className="text-right tabular-nums text-white/85">
          {row?.macroScore != null ? safeNum(row.macroScore).toFixed(2) : "-"}
        </div>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const reduceMotion = useReducedMotion();
  const Section = reduceMotion ? "section" : motion.section;
  const MDiv = reduceMotion ? "div" : motion.div;

  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [queryText, setQueryText] = useState("");
  const [sortKey, setSortKey] = useState("scoreDesc");

  const [isAuthed, setIsAuthed] = useState(!!auth.currentUser);
  const [myUserId, setMyUserId] = useState(null);
  const [myNickname, setMyNickname] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthed(!!user);

      if (!user) {
        setMyUserId(null);
        setMyNickname(null);
        return;
      }

      try {
        const me = await getMyUser();
        setMyUserId(me?.userId ?? null);
        setMyNickname(me?.name ?? me?.userId ?? null);
      } catch {
        setMyUserId(null);
        setMyNickname(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRanking() {
      setLoading(true);
      setError("");

      try {
        const rows = await fetchRankingRows({ limitCount: 300 });
        if (!active) return;
        setScores(rows);
      } catch (err) {
        console.error("Failed to load ranking:", err);
        if (!active) return;
        setError("랭킹 데이터를 불러오지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRanking();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const container = reduceMotion
    ? {}
    : {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1, delayChildren: 0.1 },
        },
      };

  const item = reduceMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      };

  const { rows, top3, myBestRow } = useMemo(() => {
    const normalize = (value) => String(value ?? "").trim().toLowerCase();
    const allRows = Array.isArray(scores) ? [...scores] : [];

    const byScore = [...allRows].sort((a, b) => safeNum(b.score) - safeNum(a.score));
    const top = byScore.slice(0, 3);

    const mine = byScore.find((row) => {
      if (myUserId && row.userId) return row.userId === myUserId;
      if (myNickname && row.nickname) return String(row.nickname) === String(myNickname);
      return false;
    });

    let filtered = allRows;
    if (queryText.trim()) {
      const query = normalize(queryText);
      filtered = allRows.filter(
        (row) =>
          normalize(row.nickname).includes(query) ||
          normalize(row.gameTitle).includes(query) ||
          normalize(row.userId).includes(query)
      );
    }

    filtered.sort((a, b) => {
      if (sortKey === "recent") return safeNum(b.playedAt) - safeNum(a.playedAt);
      if (sortKey === "accuracy") return safeNum(b.accuracy) - safeNum(a.accuracy);
      if (sortKey === "macro") return safeNum(b.macroScore) - safeNum(a.macroScore);
      return safeNum(b.score) - safeNum(a.score);
    });

    return {
      rows: filtered,
      top3: top,
      myBestRow: mine ?? null,
    };
  }, [scores, queryText, sortKey, myUserId, myNickname]);

  return (
    <div className="mx-auto max-w-5xl">
      <Section
        className="text-center"
        variants={container}
        initial={reduceMotion ? undefined : "hidden"}
        animate={reduceMotion ? undefined : "show"}
      >
        <MDiv
          variants={item}
          className="mx-auto inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 shadow-sm backdrop-blur"
        >
          PL lab
        </MDiv>

        <MDiv variants={item} className="mx-auto mt-10 grid w-full grid-cols-[1fr_auto_1fr] items-center">
          <div />
          <h1 className="justify-self-center text-4xl font-semibold tracking-tight text-white">Ranking</h1>
        </MDiv>

        <MDiv variants={item} className="mx-auto mt-5 w-full max-w-2xl text-sm leading-7 tracking-[-0.01em] text-white/70">
          Firebase 플레이 결과 기준으로 점수, 정확도, 매크로 지수를 비교합니다.
          매크로 지수는 규칙 기반이며, 활성화된 ML 모델이 있으면 함께 반영됩니다.
        </MDiv>

        <MDiv variants={item} className="mx-auto mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-3">
          <PodiumCard rank={1} row={top3[0]} />
          <PodiumCard rank={2} row={top3[1]} />
          <PodiumCard rank={3} row={top3[2]} />
        </MDiv>

        <MDiv
          variants={item}
          className="mx-auto mt-10 flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
        >
          <div className="w-full sm:w-[520px]">
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 backdrop-blur outline-none focus:border-yellow-200/30"
              placeholder="닉네임 또는 게임명 검색"
            />
          </div>

          <div className="w-full sm:w-[220px]">
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white backdrop-blur outline-none focus:border-yellow-200/30"
            >
              {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setRefreshTick((value) => value + 1)}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            새로고침
          </button>
        </MDiv>
      </Section>

      <div className="mx-auto mt-16 h-px w-28 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-80" />

      {error && (
        <div className="mt-6 rounded-xl border border-red-200/20 bg-red-200/10 px-4 py-3 text-sm text-white/90">
          {error}
        </div>
      )}

      <Section
        className="mt-6 overflow-hidden rounded-2xl border border-white/12 bg-black/30 shadow-sm backdrop-blur"
        variants={container}
        initial={reduceMotion ? undefined : "hidden"}
        animate={reduceMotion ? undefined : "show"}
      >
        <MDiv
          variants={item}
          className="grid grid-cols-[48px_1.2fr_1.1fr_1fr_1fr_1fr_1fr] items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-medium text-white/50"
        >
          <div>#</div>
          <div>닉네임</div>
          <div>게임</div>
          <div className="text-right tabular-nums">점수</div>
          <div className="text-right tabular-nums">정확도</div>
          <div className="text-right tabular-nums">매크로 지수</div>
          <div className="text-right tabular-nums">날짜</div>
        </MDiv>

        {isAuthed && myBestRow && (
          <div className="sticky top-16 z-20 border-b border-white/10 bg-slate-950/55 backdrop-blur">
            <div className="grid grid-cols-[48px_1.2fr_1.1fr_1fr_1fr_1fr_1fr] items-center gap-2 px-4 py-3 text-sm text-white bg-yellow-200/10">
              <div className="text-center font-semibold text-white">MY</div>
              <div className="truncate">
                {myBestRow.nickname ?? "-"}
                <span className="ml-2 inline-flex items-center rounded-full border border-yellow-200/25 bg-yellow-200/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-100">
                  ME
                </span>
              </div>
              <div className="truncate text-white/70">{myBestRow.gameTitle ?? "-"}</div>
              <div className="text-right tabular-nums">{safeNum(myBestRow.score).toLocaleString()}</div>
              <div className="text-right tabular-nums">
                {myBestRow.accuracy != null ? `${safeNum(myBestRow.accuracy).toFixed(2)}%` : "-"}
              </div>
              <div className="text-right tabular-nums">
                {myBestRow.macroScore != null ? safeNum(myBestRow.macroScore).toFixed(2) : "-"}
              </div>
              <div className="text-right tabular-nums">{formatDate(myBestRow.playedAt)}</div>
            </div>
          </div>
        )}

        {loading ? (
          <MDiv variants={item} className="px-4 py-12 text-center text-sm text-white/50">
            랭킹 데이터를 불러오는 중입니다...
          </MDiv>
        ) : rows.length === 0 ? (
          <MDiv variants={item} className="px-4 py-12 text-center text-sm text-white/50">
            표시할 랭킹 데이터가 없습니다.
          </MDiv>
        ) : (
          rows.map((row, index) => (
            <MDiv
              key={row.id ?? `${row.userId ?? "u"}-${index}`}
              variants={item}
              className="grid grid-cols-[48px_1.2fr_1.1fr_1fr_1fr_1fr_1fr] items-center gap-2 px-4 py-3 text-sm text-white/80 transition hover:bg-white/5"
            >
              <div className="text-center font-semibold text-white">{index + 1}</div>
              <div className="truncate">{row.nickname ?? "-"}</div>
              <div className="truncate text-white/70">{row.gameTitle ?? "-"}</div>
              <div className="text-right tabular-nums">{safeNum(row.score).toLocaleString()}</div>
              <div className="text-right tabular-nums">
                {row.accuracy != null ? `${safeNum(row.accuracy).toFixed(2)}%` : "-"}
              </div>
              <div className="text-right tabular-nums">
                {row.macroScore != null ? safeNum(row.macroScore).toFixed(2) : "-"}
              </div>
              <div className="text-right tabular-nums">{formatDate(row.playedAt)}</div>
            </MDiv>
          ))
        )}
      </Section>
    </div>
  );
}
