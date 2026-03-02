import React, { useEffect, useMemo, useState } from "react";

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-semibold text-white/80">
      {children}
    </kbd>
  );
}

function TutorialModal({ open, onClose }) {
  const pages = useMemo(
    () => [
      {
        title: "시작 / 재시작",
        body: (
          <>
            <Kbd>SPACE</Kbd> 를 눌러 게임을 시작합니다.
          </>
        ),
      },
      {
        title: "조작",
        body: (
          <>
            <div>
              노트가 <b className="text-white">판정선</b>에 닿는 순간, 해당 레인에 맞는
              키를 누르세요.
            </div>


            {/* 레인 = 키 매칭 */}
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md border border-white/10 bg-white/5 py-2">
                <div className="text-[11px] text-white/60">LEFT</div>
                <div className="mt-1">
                  <Kbd>D</Kbd>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 py-2">
                <div className="text-[11px] text-white/60">MID-L</div>
                <div className="mt-1">
                  <Kbd>F</Kbd>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 py-2">
                <div className="text-[11px] text-white/60">MID-R</div>
                <div className="mt-1">
                  <Kbd>J</Kbd>
                </div>
              </div>

              <div className="rounded-md border border-white/10 bg-white/5 py-2">
                <div className="text-[11px] text-white/60">RIGHT</div>
                <div className="mt-1">
                  <Kbd>K</Kbd>
                </div>
              </div>
            </div>
          </>
        ),
      },
      {
        title: "결과 저장",
        body: <>
          <div>
            RESULT 화면에서 점수/콤보가 표시되고 Firestore에 저장됩니다.
          </div>
          <div className="mt-2 text-xs text-white/60">
              ※ RESULT 화면이 표시되기 전에 새로고침 하지 마세요!
          </div>
        </>,
        
      },
    ],
    []
  );

  const [step, setStep] = useState(0);

  // 열릴 때마다 1페이지부터
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // ESC / ← → / Enter
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, pages.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
      if (e.key === "Enter") {
        setStep((s) => (s >= pages.length - 1 ? (onClose(), s) : s + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pages.length]);

  if (!open) return null;

  const isFirst = step === 0;
  const isLast = step === pages.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="닫기" />

      {/* Panel */}
      <div className="relative mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">튜토리얼</div>
            <div className="mt-1 text-xs text-white/60">
              {step + 1} / {pages.length}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            닫기
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-base font-semibold text-white">{pages[step].title}</div>
          <div className="mt-2 text-sm leading-relaxed text-white/80">
            {pages[step].body}
          </div>
        </div>

        {/* Dots */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={
                "h-2 w-2 rounded-full transition " +
                (i === step ? "bg-white/70" : "bg-white/20 hover:bg-white/30")
              }
              aria-label={`${i + 1}페이지`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={isFirst}
            className={
              "rounded-xl border border-white/10 px-4 py-2 text-sm " +
              (isFirst
                ? "cursor-not-allowed bg-white/5 text-white/30"
                : "bg-white/5 text-white/80 hover:bg-white/10")
            }
          >
            이전
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(s + 1, pages.length - 1))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GamePageHeader() {
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="mt-2 text-3xl font-bold text-white">게임</h1>
        <button
          type="button"
          onClick={() => setTutorialOpen(true)}
          className="mt-3 grid h-6 w-6 place-items-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white/80
                     hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          aria-label="게임 튜토리얼 열기"
          title="튜토리얼"
        >
          ?
        </button>
      </div>

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </>
  );
}
