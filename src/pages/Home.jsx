import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { home } from "../styles/ui";

export default function Home({ isAuthed, role, meLoading }) {
  const reduce = useReducedMotion();

  const heroContainer = reduce
    ? {}
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.18, delayChildren: 0.15 } },
      };

  const heroItem = reduce
    ? {}
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
      };

  const Section = reduce ? "section" : motion.section;
  const MDiv = reduce ? "div" : motion.div;
  const MH1 = reduce ? "h1" : motion.h1;
  const MP = reduce ? "p" : motion.p;

  return (
    <div className={home.wrap}>
      <Section
        className="text-center"
        variants={heroContainer}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
      >
        <MDiv variants={heroItem} className={home.badge}>PL lab</MDiv>

        <MH1 variants={heroItem} className={home.title}>Rhythm</MH1>

        <MP variants={heroItem} className={home.desc}>
          게임을 플레이하고 저장한 결과를 바탕으로 매크로를 탐지하는 프로그램.
          <br />
          {isAuthed ? "메뉴에서 기능을 선택해 주세요." : "이용하려면 먼저 로그인해 주세요."}
        </MP>

        <MDiv variants={heroItem} className={home.ctas}>
          {!isAuthed ? (
            <>
              <Link to="/game" className={home.ctaBtn}>게임</Link>
              <Link to="/login" className={home.ctaBtn}>로그인</Link>
              <Link to="/signup" className={home.ctaBtn}>회원가입</Link>
            </>
          ) : meLoading ? (
            <>
              <Link to="/game" className={home.ctaBtn}>게임</Link>
              <Link to="/ranking" className={home.ctaBtn}>랭킹</Link>
            </>
          ) : role === "admin" ? (
            <>
              <Link to="/game" className={home.ctaBtn}>게임</Link>
              <Link to="/ranking" className={home.ctaBtn}>랭킹</Link>
              <Link to="/admin" className={home.ctaBtn}>Admin</Link>
            </>
          ) : (
            <>
              <Link to="/game" className={home.ctaBtn}>게임</Link>
              <Link to="/ranking" className={home.ctaBtn}>랭킹</Link>
              <Link to="/mypage" className={home.ctaBtn}>My Page</Link>
            </>
          )}
        </MDiv>
      </Section>

      <div className={home.divider} />
    </div>
  );
}
