// src/components/LaneKeyOverlay.jsx
import React, { useMemo } from "react";

function KeyPill({ children }) {
  return (
    <div className="rounded-md border border-white/15 bg-black/45 px-2 py-0.5 text-xs font-semibold text-white/85 backdrop-blur">
      {children}
    </div>
  );
}

export function LaneKeyOverlay({
  visible,
  labels = ["D", "F", "J", "K"],
  positions,
  zIndex = 9999,
  opacity = 1,
}) {
  const defaultPositions = useMemo(
    () => ({
      D: { left: "18%", top: "72%" },
      F: { left: "40%", top: "72%" },
      J: { left: "60%", top: "72%" },
      K: { left: "82%", top: "72%" },
    }),
    []
  );

  const pos = positions ?? defaultPositions;

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex, opacity }}
    >
      {labels.map((k) => {
        const p = pos?.[k] || {};
        return (
          <div
            key={k}
            className="absolute"
            style={{
              left: p.left ?? "50%",
              top: p.top ?? "50%",
              transform: p.transform ?? "translate(-50%, -50%)",
            }}
          >
            <KeyPill>{k}</KeyPill>
          </div>
        );
      })}
    </div>
  );
}
