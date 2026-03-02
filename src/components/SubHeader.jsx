import React from "react";
import { NavLink } from "react-router-dom";

function Item({ to, label }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        [
          "group relative px-1 py-1 text-sm font-medium",
          "text-white/50 hover:text-white/90 transition",
          isActive ? "active text-white/100 font-semibold" : "",
        ].join(" ")
      }
    >
      <span className="relative z-10">{label}</span>

      {/* active */}
      <span
        className={[
          "pointer-events-none absolute left-1/2 -bottom-[5px]",
          "-translate-x-1/2",
          "h-[4px] w-[4px] rounded-full",
          "bg-yellow-200/90",
          "opacity-0 scale-50",
          "blur-[1px]",
          "transition-[opacity,transform] duration-300 ease-out",
          "group-[.active]:opacity-90 group-[.active]:scale-100",
        ].join(" ")}
      />
    </NavLink>
  );
}

// ✅ props에 isAdmin 추가 + role 기반 판단 제거
export default function SubHeader({ isAuthed, isAdmin }) {
  const items = !isAuthed
    ? []
    : isAdmin
    ? [
        { to: "/game", label: "Game" },
        { to: "/ranking", label: "Ranking" },
        { to: "/admin", label: "Admin" },
      ]
    : [
        { to: "/game", label: "Game" },
        { to: "/ranking", label: "Ranking" },
        { to: "/mypage", label: "My Page" },
      ];

  return (
    <div className="relative bg-black/15 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-start gap-4 sm:gap-6 px-6 py-2 min-h-[40px]">
        {items.map((it) => (
          <Item key={it.to} to={it.to} label={it.label} />
        ))}
      </div>
    </div>
  );
}