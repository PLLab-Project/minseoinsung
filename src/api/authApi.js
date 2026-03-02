// authApi.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, // 추가
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const userDocId = (userId) => `user-${userId}`;

// 회원가입
export async function signup(email, password, userId, name) {
  const cleanEmail = email.trim();
  const cleanUserId = userId.trim();
  const cleanName = name.trim();

  if (!cleanUserId) throw new Error("아이디를 입력해 주세요.");

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const uid = cred.user.uid;

  const ref = doc(db, "users", userDocId(cleanUserId));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) throw new Error("이미 사용중인 아이디입니다.");

    tx.set(ref, {
      authUid: uid,
      name: cleanName,
      userId: cleanUserId,
      email: cleanEmail,
      role: "user",
      banned: false,
      createdAt: serverTimestamp(),
    });
  });

  // 회원가입 직후 자동 로그인 상태 해제
  await signOut(auth);

  return uid;
}

// 로그인: userId로 users/user-{userId} 찾아서 email로 Auth 로그인
export async function loginWithUserId(userId, password) {
  const cleanUserId = String(userId ?? "").trim();
  if (!cleanUserId) throw new Error("아이디를 입력해 주세요.");

  const ref = doc(db, "users", userDocId(cleanUserId));
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");

  const data = snap.data();
  if (data?.banned) throw new Error("차단된 계정입니다.");

  const email = data?.email;
  if (!email) throw new Error("계정 데이터에 이메일이 없습니다.");

  await signInWithEmailAndPassword(auth, email, password);

  return { userDocKey: userDocId(cleanUserId), ...data };
}
