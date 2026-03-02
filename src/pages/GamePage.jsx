// src/pages/GamePage.jsx
import React, { useEffect, useState } from "react";
import UnityGamePage from "./UnityGamePage";
import { game } from "../styles/ui";
import GamePageHeader from "../components/GamePageHeader";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getMyUser } from "../api/userApi";

export default function GamePage() {
  const [hintOn, setHintOn] = useState(false);

  // 상단 바에 표시할 userId (UnityGamePage에서 빼고 여기서 표시)
  const [userId, setUserId] = useState("guest");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { 
        setUserId("guest");
        return;
      }
      try {
        const me = await getMyUser();
        setUserId(me?.userId ?? "guest");
      } catch {
        setUserId("guest");
      }
    });
  }, []);

  return (
    <div className={game.wrap}>
      <div className="mb-8">
        <div className={game.label}>PL lab</div>
        <GamePageHeader />
        <div className={game.line} />
        <p className={game.desc}>플레이 후 점수를 저장합니다.</p>
      </div>

      <div className={game.panel}>
        {/* userId(왼쪽) / 키 힌트 토글(오른쪽) */}
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-white/60">userId : {userId}</div>

          <button
            type="button"
            onClick={() => setHintOn((v) => !v)}
            onKeyDown={(e) => {
              // SPACE로 버튼 눌림 방지
              if (e.code === "Space" || e.key === " ") e.preventDefault();
            }}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            {hintOn ? "키 힌트 끄기" : "키 힌트 보기"}
          </button>
        </div>

        {/* 토글 상태 그대로 전달 */}
        <UnityGamePage hint={hintOn} />
      </div>
    </div>
  );
}
