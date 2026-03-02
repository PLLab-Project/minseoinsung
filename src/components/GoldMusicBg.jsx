// src/components/GoldMusicBg.jsx
import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function GoldMusicBg({ variant = "default" }) {
  const reduce = useReducedMotion();

  const tone = useMemo(() => {
    if (variant === "game") {
      return {
        baseFrom: "from-slate-950",
        baseVia: "via-slate-950",
        baseTo: "to-slate-900",
        vignette:
          "bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.26)_62%,rgba(0,0,0,0.62)_100%)]",
      };
    }
    return {
      baseFrom: "from-slate-950",
      baseVia: "via-slate-950",
      baseTo: "to-slate-900",
      vignette:
        "bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.22)_65%,rgba(0,0,0,0.55)_100%)]",
    };
  }, [variant]);

  const mainD0 = `
    M -120 560
    C 120 420, 240 680, 420 520
    C 560 400, 640 300, 740 360
    C 850 430, 840 560, 700 580
    C 560 600, 520 520, 600 470
    C 700 410, 820 470, 940 510
    C 1100 565, 1220 460, 1540 360
  `;
  const mainD1 = `
    M -120 552
    C 120 404, 240 688, 420 508
    C 560 388, 640 288, 740 352
    C 850 420, 840 568, 700 592
    C 560 612, 520 528, 600 480
    C 700 424, 820 456, 940 500
    C 1100 552, 1220 472, 1540 348
  `;
  const mainD2 = `
    M -120 568
    C 120 436, 240 672, 420 532
    C 560 412, 640 312, 740 370
    C 850 440, 840 548, 700 572
    C 560 588, 520 512, 600 462
    C 700 400, 820 484, 940 520
    C 1100 578, 1220 448, 1540 372
  `;

  const backWave = (y, a) =>
    `M 240 ${y} C 520 ${y - 30 - a}, 880 ${y + 30 + a}, 1160 ${y}`;

  const backWaves = Array.from({ length: 5 }, (_, i) => {
    const y = 390 + i * 16;
    const a = 12;
    const d0 = backWave(y, 0);
    const d1 = backWave(y, a);
    const d2 = backWave(y, -a);
    return { y, d0, d1, d2 };
  });

  const waveMain = reduce
    ? {}
    : {
        animate: { d: [mainD0, mainD1, mainD2, mainD0] },
        transition: { duration: 7.2, ease: "easeInOut", repeat: Infinity },
      };

  const flowMain = reduce
    ? {}
    : {
        animate: { strokeDashoffset: [-2000, 0] },
        transition: { duration: 18, ease: "linear", repeat: Infinity },
      };

  const flowSub = reduce
    ? {}
    : {
        animate: { strokeDashoffset: [-2200, 0] },
        transition: { duration: 24, ease: "linear", repeat: Infinity },
      };

  const mainDash = "820 1600";
  const subDash = "640 1900";

  const hi = useMemo(() => {
    const isGame = variant === "game";
    return {
      mainOuter: isGame ? 0.13 : 0.11,
      mainMid: isGame ? 0.22 : 0.19,
      mainCore: isGame ? 0.3 : 0.26,
      subOuter: isGame ? 0.08 : 0.07,
      subCore: isGame ? 0.13 : 0.11,
    };
  }, [variant]);

  const subD0 = `
    M -120 610
    C 160 520, 260 720, 460 590
    C 640 470, 760 420, 860 470
    C 980 530, 1100 520, 1540 430
  `;
  const subD1 = `
    M -120 600
    C 160 508, 260 732, 460 578
    C 640 458, 760 408, 860 462
    C 980 520, 1100 534, 1540 418
  `;
  const subD2 = `
    M -120 620
    C 160 532, 260 708, 460 602
    C 640 482, 760 432, 860 478
    C 980 542, 1100 508, 1540 442
  `;

  const waveSub = reduce
    ? {}
    : {
        animate: { d: [subD0, subD1, subD2, subD0] },
        transition: { duration: 6.2, ease: "easeInOut", repeat: Infinity },
      };

  const baseSubOpacity = variant === "game" ? 0.68 : 0.52;
  const subBreath = reduce
    ? { style: { opacity: baseSubOpacity } }
    : {
        animate: {
          opacity: [baseSubOpacity, baseSubOpacity - 0.1, baseSubOpacity],
        },
        transition: { duration: 7.5, ease: "easeInOut", repeat: Infinity },
      };

  const nodeAnim = (idx) =>
    reduce
      ? {}
      : {
          animate: {
            scale: [0.55, 0.8, 0.55],
            y: [0, idx % 2 === 0 ? -8 : 8, 0],
            x: [0, idx % 2 === 0 ? 5 : -5, 0],
            opacity: [0.08, 0.42, 0.02],
          },
          transition: {
            duration: 5.2 + idx * 0.7,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          },
        };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div
        className={`absolute inset-0 bg-gradient-to-b ${tone.baseFrom} ${tone.baseVia} ${tone.baseTo}`}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1400 800"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,215,128,0.05)" />
            <stop offset="25%" stopColor="rgba(255,210,120,0.55)" />
            <stop offset="55%" stopColor="rgba(255,232,175,0.75)" />
            <stop offset="75%" stopColor="rgba(255,210,120,0.55)" />
            <stop offset="100%" stopColor="rgba(255,215,128,0.05)" />
          </linearGradient>

          <linearGradient id="bloomHighlight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,245,210,0.00)" />
            <stop offset="18%" stopColor="rgba(255,245,210,0.06)" />
            <stop offset="35%" stopColor="rgba(255,245,210,0.18)" />
            <stop offset="50%" stopColor="rgba(255,255,235,0.62)" />
            <stop offset="65%" stopColor="rgba(255,245,210,0.18)" />
            <stop offset="82%" stopColor="rgba(255,245,210,0.06)" />
            <stop offset="100%" stopColor="rgba(255,245,210,0.00)" />
          </linearGradient>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0
                0 0.85 0 0 0
                0 0 0.3 0 0
                0 0 0 0.9 0
              "
              result="tint"
            />
            <feMerge>
              <feMergeNode in="tint" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bloomOuter" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="11" result="b1" />
            <feColorMatrix
              in="b1"
              type="matrix"
              values="
                1 0 0 0 0
                0 0.98 0 0 0
                0 0 0.68 0 0
                0 0 0 0.20 0
              "
              result="b2"
            />
            <feMerge>
              <feMergeNode in="b2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="bloomMid" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="m1" />
            <feColorMatrix
              in="m1"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 0.75 0 0
                0 0 0 0.30 0
              "
              result="m2"
            />
            <feMerge>
              <feMergeNode in="m2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.08 0
              "
            />
          </filter>
        </defs>

        <rect
          x="0"
          y="0"
          width="1400"
          height="800"
          filter="url(#noise)"
          opacity="0.25"
        />

        {backWaves.map((w, i) => (
          <motion.path
            key={i}
            d={w.d0}
            fill="none"
            stroke="rgba(255,230,170,0.10)"
            strokeWidth="1.6"
            animate={reduce ? undefined : { d: [w.d0, w.d1, w.d2, w.d0] }}
            transition={
              reduce
                ? undefined
                : { duration: 10.5, ease: "easeInOut", repeat: Infinity }
            }
          />
        ))}

        <motion.path
          d={mainD0}
          fill="none"
          stroke="url(#goldStroke)"
          strokeWidth={variant === "game" ? "3.6" : "3.2"}
          filter="url(#glow)"
          opacity={variant === "game" ? "0.95" : "0.9"}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...waveMain}
        />

        <motion.path
          d={mainD0}
          fill="none"
          stroke="url(#bloomHighlight)"
          strokeWidth={variant === "game" ? "10.5" : "9.8"}
          filter="url(#bloomOuter)"
          opacity={hi.mainOuter}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={mainDash}
          {...waveMain}
          {...flowMain}
        />
        <motion.path
          d={mainD0}
          fill="none"
          stroke="url(#bloomHighlight)"
          strokeWidth={variant === "game" ? "7.0" : "6.4"}
          filter="url(#bloomMid)"
          opacity={hi.mainMid}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={mainDash}
          {...waveMain}
          {...flowMain}
        />
        <motion.path
          d={mainD0}
          fill="none"
          stroke="url(#bloomHighlight)"
          strokeWidth={variant === "game" ? "4.6" : "4.2"}
          filter="url(#bloomMid)"
          opacity={hi.mainCore}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={mainDash}
          {...waveMain}
          {...flowMain}
        />

        <motion.path
          d={subD0}
          fill="none"
          stroke="rgba(255,220,150,0.32)"
          strokeWidth="2"
          filter="url(#glow)"
          strokeLinecap="round"
          {...waveSub}
          {...subBreath}
        />

        <motion.path
          d={subD0}
          fill="none"
          stroke="url(#bloomHighlight)"
          strokeWidth="7.2"
          filter="url(#bloomOuter)"
          opacity={hi.subOuter}
          strokeLinecap="round"
          strokeDasharray={subDash}
          {...waveSub}
          {...flowSub}
        />
        <motion.path
          d={subD0}
          fill="none"
          stroke="url(#bloomHighlight)"
          strokeWidth="3.4"
          filter="url(#bloomMid)"
          opacity={hi.subCore}
          strokeLinecap="round"
          strokeDasharray={subDash}
          {...waveSub}
          {...flowSub}
        />

        {[
          { x: 500, y: 432, r: 5.8 },
          { x: 760, y: 405, r: 7.2 },
          { x: 980, y: 470, r: 6.2 },
        ].map((n, idx) => (
          <motion.g
            key={idx}
            filter="url(#glow)"
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            {...nodeAnim(idx)}
          >
            <circle cx={n.x} cy={n.y} r={n.r} fill="rgba(255,225,160,0.55)" />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r + 5}
              fill="rgba(255,225,160,0.10)"
            />
          </motion.g>
        ))}
      </svg>

      <div className={`absolute inset-0 ${tone.vignette}`} />
    </div>
  );
}
