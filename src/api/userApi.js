import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";

let cachedMe = null;

export async function getMyUser() {
  if (cachedMe) return cachedMe;

  const user = auth.currentUser;
  if (!user) return null;

  const q = query(collection(db, "users"), where("authUid", "==", user.uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const data = snap.docs[0].data();

  cachedMe = {
    userId: data.userId ?? null,
    role: data.role ?? "user",
    banned: !!data.banned,
    name: data.name ?? null,
    email: data.email ?? null,
    authUid: data.authUid ?? null,
  };

  return cachedMe;
}

export function clearMyUserCache() {
  cachedMe = null;
}
