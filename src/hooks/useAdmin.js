import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase"; // 너희 경로에 맞게!

export function useAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // users에서 authUid == 내 uid 인 문서를 찾음
        const q = query(
          collection(db, "users"),
          where("authUid", "==", user.uid)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setIsAdmin(false);
        } else {
          const data = snap.docs[0].data();
          setIsAdmin(data?.role === "admin");
        }
      } catch (e) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { loading, isAdmin };
}

