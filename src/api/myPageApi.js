// src/api/myPageApi.js
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export async function fetchMyPageBundle(authUid) {
  if (!authUid) throw new Error("no-authUid");

  const q = query(
    collection(db, "play_results"),
    where("authUid", "==", authUid)
  );

  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  // 단순 계산
  let totalPlays = rows.length;
  let bestScore = 0;
  let maxCombo = 0;

  for (const r of rows) {
    bestScore = Math.max(bestScore, r.score ?? 0);
    maxCombo = Math.max(maxCombo, r.comboMax ?? 0);
  }

  // 날짜 최신순 정렬 (My Page 표시용)
  rows.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });

  return {
    summary: {
      totalPlays,
      bestScore,
      maxCombo,
    },
    recentPlays: rows, // 날짜 보여주기용
  };
}
