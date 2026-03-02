// src/pages/MyPage.jsx
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMyPageData } from "../hooks/useMyPageData";
import { game } from "../styles/ui";

/* ---------------- 유틸 ---------------- */

function fmtDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/* ================= MyPage ================= */

export default function MyPage() {
  const { loading, user, summary, recentPlays } = useMyPageData();

  /* 모든 Hook은 최상단에 고정 */
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [bestOpen, setBestOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all | 7days

  /* 조건 없이 항상 실행되는 useMemo */
  const filteredPlays = useMemo(() => {
    if (!recentPlays) return [];

    if (filter === "all") return recentPlays;

    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;

    return recentPlays.filter((p) => {
      const t = p.createdAt?.toMillis?.() ?? 0;
      return now - t <= week;
    });
  }, [filter, recentPlays]);

  /* Hook 뒤에서 early return */
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-white">
        로딩중...
      </div>
    );
  }

  const bestPlay =
    recentPlays.find((p) => p.score === summary.bestScore) || null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-4 text-white">
      <div className="text-xs font-medium text-white/60">PL lab</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">My Page</h1>
      <div className="mt-3 h-px w-24 bg-gradient-to-r from-yellow-200/40 via-white/15 to-transparent"></div>
      <p className="mt-4 text-sm leading-7 tracking-[-0.01em] text-white/70">내 플레이 기록과 계정 정보를 확인합니다.</p>


      {/* 요약 카드 */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          tone="blue"
          label="총 플레이 횟수"
          value={`${summary.totalPlays}회`}
        />

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
          <SummaryCard
            tone="gold"
            label="최고 점수"
            value={summary.bestScore}
            clickable
            onClick={() => setBestOpen(true)}
          />
        </motion.div>

        <SummaryCard
          tone="violet"
          label="최대 콤보"
          value={summary.maxCombo}
        />
      </section>


      {/* 플레이 기록 + 필터 */}
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">플레이 기록</h2>

          <div className="flex gap-2 text-xs">
            <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
              전체
            </FilterBtn>
            <FilterBtn
              active={filter === "7days"}
              onClick={() => setFilter("7days")}
            >
              최근 7일
            </FilterBtn>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-white/60">
              <tr>
                <th className="py-2 text-left">날짜</th>
                <th className="py-2 text-right">점수</th>
                <th className="py-2 text-right">콤보</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlays.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPlay(p)}
                  className="cursor-pointer border-b border-white/5 hover:bg-white/10"
                >
                  <td className="py-2">{fmtDate(p.createdAt)}</td>
                  <td className="py-2 text-right font-medium">{p.score}</td>
                  <td className="py-2 text-right">{p.comboMax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 판 상세 모달 */}
      {selectedPlay && (
        <PlayDetailModal
          play={selectedPlay}
          onClose={() => setSelectedPlay(null)}
        />
      )}

      {/* 최고 점수 모달 */}
      {bestOpen && bestPlay && (
        <BestScoreModal
          play={bestPlay}
          onClose={() => setBestOpen(false)}
        />
      )}

      {/* 계정 정보 */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <h2 className="text-sm font-semibold text-white/80">계정 정보</h2>
        <p className="mt-2 text-sm text-white/70">Email · {user.email}</p>
        <p className="text-sm text-white/70">UID · {user.uid}</p>
      </section>
    </div>
  );
}

/* ================= 하위 컴포넌트 ================= */
function SummaryCard({ label, value, hint, clickable, onClick, tone = "blue" }) {
  const toneCls = {
    blue: {
      ring: "ring-blue-300/15",
      glow: "bg-blue-400/10",
      bar: "from-blue-300/45 via-white/10 to-transparent",
      chip: "border-blue-300/20 bg-blue-400/10 text-blue-100/80",
    },
    gold: {
      ring: "ring-yellow-200/15",
      glow: "bg-yellow-300/10",
      bar: "from-yellow-200/45 via-white/10 to-transparent",
      chip: "border-yellow-200/20 bg-yellow-300/10 text-yellow-100/85",
    },
    violet: {
      ring: "ring-violet-300/15",
      glow: "bg-violet-400/10",
      bar: "from-violet-300/45 via-white/10 to-transparent",
      chip: "border-violet-300/20 bg-violet-400/10 text-violet-100/80",
    },
  }[tone];

  return (
    <div
      onClick={onClick}
      className={[
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur",
        "ring-1",
        toneCls.ring,
        clickable ? "cursor-pointer hover:bg-white/8" : "",
      ].join(" ")}
    >
      {/* 은은한 글로우 */}
      <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl ${toneCls.glow}`} />

      {/* 내용 */}
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-white/65">{label}</p>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>


        </div>
      </div>
    </div>
  );
}

function FilterBtn({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1",
        active
          ? "bg-white/20 text-white"
          : "bg-black/20 text-white/60 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function PlayDetailModal({ play, onClose }) {
  return (
    <Modal title="플레이 상세" onClose={onClose}>
      <DetailRow label="플레이 날짜" value={fmtDate(play.createdAt)} />
      <DetailRow label="점수" value={play.score} />
      <DetailRow label="최대 콤보" value={play.comboMax} />
    </Modal>
  );
}

function BestScoreModal({ play, onClose }) {
  return (
    <Modal title="최고 점수 상세" onClose={onClose}>
      <DetailRow label="플레이 날짜" value={fmtDate(play.createdAt)} />
      <DetailRow label="점수" value={play.score} />
      <DetailRow label="최대 콤보" value={play.comboMax} />
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-sm hover:bg-white/10"
          >
            닫기
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm">{children}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-white/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
