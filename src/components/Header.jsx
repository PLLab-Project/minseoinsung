import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { headerBarClass, header, navItemClass } from "../styles/ui";
import { useAdmin } from "../hooks/useAdmin"; // 추가

export default function Header({ isAuthed, displayName, onLogout }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // 관리자 상태
  const { loading, isAdmin } = useAdmin();

  useEffect(() => {
    const onScroll = () => setScrolled((window.scrollY || 0) > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NavItem = ({ to, children }) => {
    const active = pathname === to;

    return (
      <Link to={to} className={navItemClass(active)}>
        <span className="relative">
          {children}

          {/* 활성 메뉴: 골드 underline */}
          <span
            aria-hidden="true"
            className={[
              "pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-1",
              "h-[2px] rounded-full transition-all duration-300",
              active ? "w-[70%] opacity-90" : "w-0 opacity-0",
              "pl-nav-underline",
            ].join(" ")}
          />
        </span>
      </Link>
    );
  };

  return (
    <header className={header.root}>
      <div className={headerBarClass(scrolled)}>
        <div className={header.inner}>
          <Link to="/" className={header.brand}>
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full pl-dot"
            />
            <span className="group-hover:text-white/95">PL lab</span>
          </Link>

          <nav className={header.nav}>
            {isAuthed ? (
              <>
                <div className={header.welcome}>
                  <span className="text-white/90 font-medium">
                    {displayName || "사용자"}
                  </span>
                  님, 환영합니다!
                </div>

                <NavItem to="/">Home</NavItem>

                <button
                  type="button"
                  onClick={onLogout}
                  className={header.button}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavItem to="/">Home</NavItem>
                <NavItem to="/login">로그인</NavItem>
                <NavItem to="/signup">회원가입</NavItem>
              </>
            )}
          </nav>
        </div>

        <div className="h-px w-full opacity-70 pl-header-line" />
      </div>
    </header>
  );
}
