import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithUserId } from "../api/authApi";

function toUserMessage(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();

  if (lower.includes("차단된 계정")) return "차단된 계정입니다.";
  if (lower.includes("auth/invalid-credential")) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("auth/wrong-password")) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("auth/user-not-found")) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  if (lower.includes("auth/too-many-requests")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (lower.includes("auth/network-request-failed")) return "네트워크 오류입니다. 잠시 후 다시 시도해 주세요.";

  return msg || "로그인 실패";
}

export default function LoginPage() {
  const nav = useNavigate();

  const [form, setForm] = useState({ userId: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const validation = useMemo(() => {
    const issues = [];
    const userId = form.userId.trim();
    if (!userId) issues.push("아이디를 입력해 주세요.");
    if (!form.password) issues.push("비밀번호를 입력해 주세요.");
    return { isValid: issues.length === 0, issues };
  }, [form]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");

    if (!validation.isValid) {
      setError(validation.issues[0]);
      return;
    }

    try {
      setLoading(true);

      await loginWithUserId(form.userId.trim(), form.password);

      setOk("로그인 성공");
      nav("/", { replace: true });
    } catch (err) {
      console.error("RAW LOGIN ERROR:", err);
      setError(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-sm backdrop-blur-sm">
        <div className="mb-5">
          <div className="text-xs font-medium text-white/60">PL lab</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">로그인</h1>
          <div className="mt-3 h-px w-24 bg-gradient-to-r from-yellow-200/40 via-white/15 to-transparent" />
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-white/60">아이디</span>
            <input
              name="userId"
              value={form.userId}
              onChange={onChange}
              placeholder="아이디"
              autoComplete="username"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/30 focus:ring-2 focus:ring-yellow-200/10"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">비밀번호</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="비밀번호"
              autoComplete="current-password"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/30 focus:ring-2 focus:ring-yellow-200/10"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-200/20 bg-red-200/10 px-4 py-3 text-sm text-white/90">
              {error}
            </div>
          )}
          {ok && (
            <div className="rounded-xl border border-emerald-200/20 bg-emerald-200/10 px-4 py-3 text-sm text-white/90">
              {ok}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !validation.isValid}
            className={[
              "mt-2 h-11 rounded-xl text-sm font-semibold border border-yellow-200/65" ,
              "bg-gradient-to-r from-amber-200/65 via-yellow-100/65 to-amber-200/65 text-slate-950",
              "shadow-[0_0_0_1px_rgba(255,230,170,0.25),0_10px_30px_rgba(0,0,0,0.35)]",
              "hover:brightness-105 active:brightness-95",
              "disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "로그인 중..." : "Login"}
          </button>

          <div className="mt-2 text-center text-xs text-white/55">
            계정이 없다면{" "}
            <Link to="/signup" className="text-yellow-100/90 hover:text-yellow-100">
              회원가입
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
