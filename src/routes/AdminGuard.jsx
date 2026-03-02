import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function AdminGuard({ isAuthed, isAdmin, meLoading }) {
  // 로그인 안 했으면 로그인으로
  if (!isAuthed) return <Navigate to="/login" replace />;

  // 내 정보/관리자 여부 로딩 중이면 잠깐 대기
  if (meLoading) return null;

  // 관리자 아니면 홈으로
  if (!isAdmin) return <Navigate to="/" replace />;

  // 관리자면 admin 라우트 통과
  return <Outlet />;
}