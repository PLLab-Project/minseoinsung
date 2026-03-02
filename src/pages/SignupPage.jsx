import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/authApi";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 아이디 규칙 예시: 영문/숫자/_ 4~16
const idRegex = /^[a-zA-Z0-9_]{4,16}$/;

function toUserMessage(err) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();

  if (lower.includes("이미 사용중인 아이디")) return "이미 사용중인 아이디입니다.";
  if (lower.includes("auth/email-already-in-use")) return "이미 가입된 이메일입니다.";
  if (lower.includes("auth/invalid-email")) return "이메일 형식이 올바르지 않습니다.";
  if (lower.includes("auth/weak-password")) return "비밀번호가 너무 약합니다. (8자 이상 권장)";
  if (lower.includes("auth/network-request-failed")) return "네트워크 오류입니다. 잠시 후 다시 시도해 주세요.";

  return msg || "회원가입 실패";
}

export default function SignupPage() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    userId: "",
    email: "",
    password: "",
    password2: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const validation = useMemo(() => {
    const issues = [];
    const email = form.email.trim();
    const name = form.name.trim();
    const userId = form.userId.trim();

    if (!name) issues.push("이름을 입력해 주세요.");
    else if (name.length < 2) issues.push("이름은 2글자 이상 입력해 주세요.");

    if (!userId) issues.push("아이디를 입력해 주세요.");
    else if (!idRegex.test(userId)) issues.push("아이디는 영문/숫자/_ 4~16자만 가능합니다.");

    if (!email) issues.push("이메일을 입력해 주세요.");
    else if (!emailRegex.test(email)) issues.push("이메일 형식이 올바르지 않습니다.");

    if (!form.password) issues.push("비밀번호를 입력해 주세요.");
    else if (form.password.length < 8) issues.push("비밀번호는 8자 이상을 권장합니다.");

    if (form.password !== form.password2) issues.push("비밀번호 확인이 일치하지 않습니다.");

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

      await signup(
        form.email.trim(),
        form.password,
        form.userId.trim(),
        form.name.trim()
      );

      setOk("회원가입 성공");
      setForm({ name: "", userId: "", email: "", password: "", password2: "" });

      nav("/login", { replace: true });
    } catch (err) {
      console.error("RAW SIGNUP ERROR:", err);
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
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            회원가입
          </h1>
          <div className="mt-3 h-px w-24 bg-gradient-to-r from-yellow-200/40 via-white/15 to-transparent" />
        </div>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-white/60">이름</span>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="이름"
              autoComplete="name"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/30 focus:ring-2 focus:ring-yellow-200/10"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">아이디</span>
            <input
              name="userId"
              value={form.userId}
              onChange={onChange}
              placeholder="영문/숫자/_ 4~16"
              autoComplete="username"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/30 focus:ring-2 focus:ring-yellow-200/10"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">이메일</span>
            <input
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              autoComplete="email"
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
              placeholder="8자 이상 권장"
              autoComplete="new-password"
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/30 focus:ring-2 focus:ring-yellow-200/10"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-white/60">비밀번호 확인</span>
            <input
              name="password2"
              type="password"
              value={form.password2}
              onChange={onChange}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
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
            {loading ? "가입 중..." : "Sign Up"}
          </button>

          <div className="mt-2 text-center text-xs text-white/55">
            이미 계정이 있다면{" "}
            <Link to="/login" className="text-yellow-100/90 hover:text-yellow-100">
              로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
