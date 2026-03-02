import React, { useEffect, useMemo, useState } from "react";
import { fetchRankingRows } from "../../api/rankingApi";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth"; // 추가


export default function AdminPage() {
  const [banned, setBanned] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousRows, setSuspiciousRows] = useState([]);
  const [myUid, setMyUid] = useState(""); // 추가

  // ✅ Fix 2: 변수명을 authUidInput으로 변경 (실제로 authUid를 다루므로)
  const [authUidInput, setAuthUidInput] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // ✅ 관리자 승격/해제용 input
const [adminUidInput, setAdminUidInput] = useState("");

// ✅ 관리자 승격
const handlePromoteAdmin = async () => {
  const uid = adminUidInput.trim();
  if (!uid) {
    alert("승격할 유저의 Auth UID를 입력해주세요.");
    return;
  }

  // (선택) 존재 여부 확인
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    // users 문서 id가 uid가 아닐 수도 있어서, 이 경고는 그냥 참고용
    console.warn("users/{uid} 문서가 없을 수 있어요. 그래도 adminUsers는 생성합니다.");
  }

  await setDoc(
    doc(db, "adminUsers", uid),
    { role: "admin", createdAt: serverTimestamp() },
    { merge: true }
  );

  // 로그 남기고 싶으면 (선택)
  await addDoc(collection(db, "adminLogs"), {
    action: "PROMOTE_ADMIN",
    targetUid: uid,
    adminUid: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  });

  alert(`✅ ${uid} 관리자 승격 완료`);
  setAdminUidInput("");
};

// ✅ 관리자 해제 (원하면 쓰고, 필요 없으면 안 써도 됨)
const handleDemoteAdmin = async () => {
  const uid = adminUidInput.trim();
  if (!uid) {
    alert("해제할 유저의 Auth UID를 입력해주세요.");
    return;
  }

  // 실수 방지: 자기 자신 해제 금지
  if (uid === auth.currentUser?.uid) {
    alert("본인 관리자 권한은 여기서 해제 못하게 막아뒀어.");
    return;
  }

  await deleteDoc(doc(db, "adminUsers", uid));

  await addDoc(collection(db, "adminLogs"), {
    action: "DEMOTE_ADMIN",
    targetUid: uid,
    adminUid: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  });

  alert(`✅ ${uid} 관리자 해제 완료`);
  setAdminUidInput("");
};

  const load = async () => {
    try {
      setLoading(true);
      setError("");
  
      // 1) 의심 세션(랭킹 기반)
      const rows = await fetchRankingRows({ limitCount: 200 });
      const suspicious = (rows || []).filter((r) => r.macroSuspicious);
      setSuspiciousRows(suspicious);
  
      // 2) bannedUsers 읽기
      const bannedSnap = await getDocs(collection(db, "bannedUsers"));
      const bannedRows = bannedSnap.docs.map((d) => {
        const data = d.data();
        return {
          authUid: d.id, // ✅ Fix 1: 문서 ID = authUid이므로 authUid로 명시
          nickname: data.nickname ?? "Unknown",
          email: data.email ?? "",
          bannedAt: data.bannedAtText ?? "",
          reason: data.reason ?? "",
          createdAt: data.createdAt ?? null,
        };
      });
      setBanned(bannedRows);
  
      // 3) adminLogs 읽기 (최신 50개)
      const logsQ = query(
        collection(db, "adminLogs"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const logsSnap = await getDocs(logsQ);
      const logRows = logsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          adminId: data.adminUid ?? "-",
          action: data.action ?? "-",
          targetUserId: data.targetUid ?? "-",
          createdAt: data.createdAt?.toDate?.()?.toLocaleString?.() ?? "",
        };
      });
      setActions(logRows);
    } catch (e) {
      console.error(e);
      setBanned([]);
      setActions([]);
      setSuspiciousRows([]);
      setError(e?.message ?? "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setMyUid(user?.uid ?? "");
      load();
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return banned;
    const lower = q.toLowerCase();
    return banned.filter(
      (u) =>
        u.nickname?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower)
    );
  }, [banned, q]);

  const handleBan = async () => {
    const uid = authUidInput.trim(); // ✅ Fix 2: authUidInput 사용
  
    if (!uid) {
      alert("Auth UID를 입력해주세요.");
      return;
    }

    // ✅ Fix 1: authUid로 의심 유저 찾기 (authUid 기준으로 통일)
    const matchedRow = suspiciousRows.find((r) => r.authUid === uid);
  
    // bannedUsers/{authUid} 문서 생성/갱신
    await setDoc(
      doc(db, "bannedUsers", uid),
      {
        targetUid: uid,
        nickname: matchedRow?.nickname ?? "Unknown",
        reason: "manual ban",
        createdAt: serverTimestamp(),
        bannedAtText: new Date().toLocaleString(),
      },
      { merge: true }
    );
  
    // adminLogs 추가
    await addDoc(collection(db, "adminLogs"), {
      action: "BAN",
      targetUid: uid,
      adminUid: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  
    alert(`유저 ${uid} 차단 완료`);
    setAuthUidInput("");
    load();
  };

  const handleUnban = async (authUid) => {
    // bannedUsers/{authUid} 삭제
    await deleteDoc(doc(db, "bannedUsers", String(authUid)));
  
    // adminLogs 추가
    await addDoc(collection(db, "adminLogs"), {
      action: "UNBAN",
      targetUid: String(authUid),
      adminUid: auth.currentUser?.uid ?? null,
      createdAt: serverTimestamp(),
    });
  
    alert(`유저 ${authUid} 차단 해제 완료`);
    load();
  };

  // 폭/패딩/패널 스타일 
  const wrap = "mx-auto w-full max-w-5xl";
  const label = "text-xs font-medium text-white/60";
  const title = "mt-2 text-3xl font-semibold tracking-tight text-white";
  const line =
    "mt-3 h-px w-24 bg-gradient-to-r from-yellow-200/40 via-white/15 to-transparent";
  const desc = "mt-4 text-sm leading-7 tracking-[-0.01em] text-white/70";
  const panel =
    "rounded-2xl border border-white/12 bg-black/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur";

  return (
    <div className={wrap}>
      {/* Header */}
      <div className="relative mb-10">
        <div className="pointer-events-none absolute -left-24 -top-10 h-44 w-44 rounded-full bg-yellow-200/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-10 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

        <div className={label}>PL lab · Admin</div>
        <h1 className={title}>유저 차단 관리</h1>
        <div className={line} />
        <p className={desc}>비정상 행동을 보이는 사용자를 차단하거나 해제합니다.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200/20 bg-red-200/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Suspicious sessions */}
        <section className={panel}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                의심 세션 <span className="text-white/50">({suspiciousRows.length})</span>
              </h2>
              <p className="mt-1 text-sm text-white/50">
                랭킹 조회 시 macroScore 재계산 결과에서 의심으로 판단된 세션입니다.
              </p>
            </div>

            <button
              onClick={load}
              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 hover:bg-white/10 active:brightness-95"
              title="새로고침"
            >
              새로고침
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {suspiciousRows.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
                의심 세션 없음
              </div>
            ) : (
              suspiciousRows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-yellow-200/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-200">
                        SUSPICIOUS
                      </span>
                      <span className="text-xs text-white/35">sessionId {r.id}</span>
                    </div>

                    <div className="mt-1 truncate text-base font-semibold text-white">
                      {r.nickname}{" "}
                      {/* ✅ Fix 2: authUid 표시로 변경 */}
                      <span className="text-xs font-normal text-white/45">
                        (authUid {String(r.authUid ?? "-")})
                      </span>
                    </div>

                    <div className="mt-1 text-sm text-white/60">
                      score {r.score} · accuracy {r.accuracy}% · macroScore {r.macroScore} (≥ {r.macroThreshold})
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      detector {r.macroDetector} · hits {r.hitCount}
                    </div>
                  </div>

                  {/* ✅ Fix 2: authUid를 입력칸에 넣도록 수정 */}
                  <button
                    onClick={() => {
                      if (r.authUid != null) {
                        setAuthUidInput(String(r.authUid));
                        alert("차단 입력칸에 Auth UID를 넣었어. 아래에서 '차단' 누르면 됨.");
                      } else {
                        alert("이 세션에 authUid 정보가 없어. 직접 입력해줘.");
                      }
                    }}
                    className={[
                      "inline-flex items-center justify-center",
                      "h-10 rounded-xl px-4 text-xs font-medium transition",
                      "border border-red-400/20",
                      "bg-red-400/20 text-red-200 backdrop-blur",
                      "hover:bg-red-400/20 hover:text-red-100",
                      "focus:outline-none focus:ring-2 focus:ring-red-400/30",
                    ].join(" ")}
                  >
                    차단 대상으로 넣기
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Ban input */}
        <section className={panel}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">유저 차단</h2>
              {/* ✅ Fix 2: authUid 기준임을 명시 */}
              <p className="mt-1 text-sm text-white/50">
                Auth UID 기준으로 차단 처리합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/45">
              <span className="inline-flex h-2 w-2 rounded-full bg-red-400/80" />
              <span>Ban</span>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300/80 ml-2" />
              <span>Unban</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:flex-1">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/35">
                UID
              </div>
              {/* ✅ Fix 2: value/onChange를 authUidInput으로 변경, placeholder도 수정 */}
              <input
                value={authUidInput}
                onChange={(e) => setAuthUidInput(e.target.value)}
                placeholder="Auth UID 입력"
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-12 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/40 focus:ring-2 focus:ring-yellow-200/10"
              />
            </div>

            <button
              onClick={handleBan}
              disabled={!authUidInput}
              title={!authUidInput ? "Auth UID를 입력하세요" : ""}
              className={[
                "inline-flex items-center justify-center",
                "h-10 rounded-xl px-5 text-xs font-medium transition",
                "border border-red-400/20",
                "bg-red-400/20 text-red-200 backdrop-blur",
                "hover:bg-red-400/20 hover:text-red-100",
                "focus:outline-none focus:ring-2 focus:ring-red-400/30",
                !authUidInput ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            >
              차단
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/55">
            팁: 의심 유저를 차단하면 해당 사용자의 접근/기록이 제한됩니다. (실제 동작은 서버 로직에
            따름)
          </div>
        </section>

        {/* Admin promote/demote */}
<section className={panel}>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h2 className="text-base font-semibold text-white">관리자 승격/해제</h2>
      <p className="mt-1 text-sm text-white/50">
        Auth UID 기준으로 관리자 권한을 부여/해제합니다.
      </p>
    </div>
  </div>

  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
    <div className="relative w-full sm:flex-1">
      <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/35">
        Auth UID
      </div>
      <input
        value={adminUidInput}
        onChange={(e) => setAdminUidInput(e.target.value)}
        placeholder="승격/해제할 Auth UID 입력"
        className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-20 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/40 focus:ring-2 focus:ring-yellow-200/10"
      />
    </div>

    <button
      onClick={handlePromoteAdmin}
      disabled={!adminUidInput}
      className={[
        "inline-flex items-center justify-center",
        "h-10 rounded-xl px-5 text-xs font-medium transition",
        "border border-yellow-200/20",
        "bg-yellow-200/10 text-yellow-200 backdrop-blur",
        "hover:bg-yellow-200/20 hover:text-yellow-100",
        "focus:outline-none focus:ring-2 focus:ring-yellow-200/20",
        !adminUidInput ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      관리자 승격
    </button>

    <button
      onClick={handleDemoteAdmin}
      disabled={!adminUidInput}
      className={[
        "inline-flex items-center justify-center",
        "h-10 rounded-xl px-5 text-xs font-medium transition",
        "border border-white/10",
        "bg-white/5 text-white/70 backdrop-blur",
        "hover:bg-white/10 hover:text-white",
        "focus:outline-none focus:ring-2 focus:ring-white/10",
        !adminUidInput ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      관리자 해제
    </button>
  </div>
</section>

        {/* Banned list */}
        <section className={panel}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                차단된 유저{" "}
                <span className="text-white/50">({banned.length})</span>
              </h2>
              <p className="mt-1 text-sm text-white/50">
                닉네임 또는 이메일로 검색합니다.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="opacity-80"
                >
                  <path
                    d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M16.5 16.5 21 21"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="닉네임 / 이메일 검색"
                className="h-10 w-full rounded-xl border border-white/10 bg-black/30 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-yellow-200/40 focus:ring-2 focus:ring-yellow-200/10"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
                차단된 유저 없음
              </div>
            ) : (
              filtered.map((u) => (
                <div
                  key={u.authUid} // ✅ Fix 1: key를 authUid로
                  className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-red-200/10 px-2 py-0.5 text-[11px] font-semibold text-red-200">
                        BANNED
                      </span>
                      {/* ✅ Fix 2: authUid 표시 */}
                      <span className="text-xs text-white/35">
                        authUid {u.authUid}
                      </span>
                    </div>

                    <div className="mt-1 truncate text-base font-semibold text-white">
                      {u.nickname}
                    </div>

                    <div className="mt-1 truncate text-sm text-white/60">
                      {u.email}
                    </div>

                    <div className="mt-1 text-xs text-white/40">
                      차단일 {u.bannedAt}
                    </div>
                  </div>

                  {/* ✅ Fix 1: authUid 기준으로 unban */}
                  <button
                    onClick={() => handleUnban(u.authUid)}
                    className={[
                      "inline-flex items-center justify-center",
                      "h-10 rounded-xl px-4 text-xs font-medium transition",
                      "border border-emerald-300/30",
                      "bg-emerald-300/10 text-emerald-200 backdrop-blur",
                      "hover:bg-emerald-300/20 hover:text-emerald-100",
                      "focus:outline-none focus:ring-2 focus:ring-emerald-300/30",
                    ].join(" ")}
                  >
                    차단 해제
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Admin log */}
        <section className={panel}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">관리자 처리 로그</h2>
              <p className="mt-1 text-sm text-white/50">
                관리자 조치 이력을 시간순으로 확인합니다.
              </p>
            </div>

            <button
              onClick={load}
              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 hover:bg-white/10 active:brightness-95"
              title="새로고침"
            >
              새로고침
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {actions.length === 0 ? (
              <div className="rounded-xl bg-black/40 p-6 text-center text-sm text-white/50">
                로그 없음
              </div>
            ) : (
              actions.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-3"
                >
                  <span
                    className={[
                      "inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                      a.action === "BAN"
                        ? "bg-red-200/10 text-red-200"
                        : "bg-emerald-200/10 text-emerald-200",
                    ].join(" ")}
                  >
                    {a.action}
                  </span>

                  <span className="flex-1 font-mono text-xs text-white/55 sm:text-sm sm:font-sans sm:text-white/70">
                    관리자 {a.adminId} → 유저 {a.targetUserId}
                  </span>

                  <span className="font-mono text-xs text-white/45">
                    {a.createdAt}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="h-10" />
      </div>
    </div>
  );
}