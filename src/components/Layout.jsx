import React from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import SubHeader from "./SubHeader";
import GoldMusicBg from "./GoldMusicBg";
import AnimatedOutlet from "./AnimatedOutlet";
import { layout } from "../styles/ui";

export default function Layout({ isAuthed, displayName, isAdmin, onLogout, role }) {
  const { pathname } = useLocation();
  const isGame = pathname.startsWith("/game");

  return (
    <div className={layout.shell}>
      <GoldMusicBg variant={isGame ? "game" : "default"} />
      <div className={layout.mainWrap}>
        <Header
          isAuthed={isAuthed}
          displayName={displayName}
          onLogout={onLogout}
        />
        <SubHeader
          isAuthed={isAuthed}
          role={role}
          isAdmin={isAdmin} 
        />

        <main className={layout.main}>
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}
