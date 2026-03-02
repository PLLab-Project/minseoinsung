// src/hooks/useMyPageData.js
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { fetchMyPageBundle } from "../api/myPageApi";

export function useMyPageData() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [summary, setSummary] = useState(null);
  const [recentPlays, setRecentPlays] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function run() {
      setLoading(true);
      const data = await fetchMyPageBundle(user.uid);
      setSummary(data.summary);
      setRecentPlays(data.recentPlays);
      setLoading(false);
    }

    run();
  }, [user?.uid]);

  return { loading, user, summary, recentPlays };
}
