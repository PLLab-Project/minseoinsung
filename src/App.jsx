import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import { getMyUser, clearMyUserCache } from "./api/userApi";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import GamePage from "./pages/GamePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import RankingPage from "./pages/RankingPage";
import MyPage from "./pages/MyPage";

import AdminPage from "./pages/admin/AdminPage";
import AdminGuard from "./routes/AdminGuard";

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);

  // ✅ 추가: adminUsers/{uid} 존재 여부로 관리자 판단
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user || null);

      // 로그아웃
      if (!user) {
        clearMyUserCache?.();
        setMe(null);
        setIsAdmin(false); // ✅ 추가
        setMeLoading(false);
        return;
      }

      // 로그인
      try {
        setMeLoading(true);

        // 1) 내 프로필 로드 (기존 그대로)
        const profile = await getMyUser();
        setMe(profile);

        // 2) ✅ 관리자 여부 로드 (adminUsers 기준)
        const adminSnap = await getDoc(doc(db, "adminUsers", user.uid));
        setIsAdmin(adminSnap.exists());
      } catch (e) {
        console.error("LOAD ME ERROR:", e);
        setMe(null);
        setIsAdmin(false); // ✅ 추가
      } finally {
        setMeLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const isAuthed = !!authUser;
  const role = me?.role ?? null; // role은 다른 곳(Home 등)에서 쓸 수 있으니 유지해도 됨

  const displayName =
    me?.name || authUser?.displayName || authUser?.email?.split("@")?.[0] || "사용자";

  const handleLogout = async () => {
    await signOut(auth);
    clearMyUserCache?.();
    setMe(null);
    setIsAdmin(false); // ✅ 추가
  };

  if (meLoading && isAuthed) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <Layout
              isAuthed={isAuthed}
              meLoading={meLoading}
              displayName={displayName}
              onLogout={handleLogout}
              // (선택) Layout에서 관리자 메뉴를 보여줄 거면 isAdmin 내려보내기
              isAdmin={isAdmin}
              role={role}
            />
          }
        >
          {/* 일반 페이지 */}
          <Route path="/" element={<Home isAuthed={isAuthed} role={role} meLoading={meLoading} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/game" element={<GamePage />} />

          {/* 관리자 전용 */}
          {/* ✅ role 대신 isAdmin을 AdminGuard에 전달 */}
          <Route element={<AdminGuard isAuthed={isAuthed} isAdmin={isAdmin} meLoading={meLoading} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}