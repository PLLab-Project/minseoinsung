import { db } from "../firebase"; // 경로 맞춰줘
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

// 의심유저 목록
export async function fetchSuspiciousUsers() {
  const q = query(collection(db, "suspiciousUsers"), orderBy("updatedAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 차단유저 목록
export async function fetchBannedUsers() {
  const q = query(collection(db, "bannedUsers"), orderBy("bannedAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 차단하기 (uid 기준으로 doc id 통일 추천)
export async function banUser(uid, payload = {}) {
  await setDoc(
    doc(db, "bannedUsers", uid),
    {
      authUid: uid,
      reason: payload.reason || "관리자 차단",
      bannedBy: payload.bannedBy || null, // admin uid 넣으면 좋음
      bannedAt: serverTimestamp(),
      ...payload,
    },
    { merge: true }
  );
}

// 차단 해제
export async function unbanUser(uid) {
  await deleteDoc(doc(db, "bannedUsers", uid));
}
