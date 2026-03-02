// src/pages/UnityGamePage.jsx
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { savePlayResult } from "../api/scoreApi";
import { getMyUser } from "../api/userApi";
import { LaneKeyOverlay } from "../components/LaneKeyOverlay";

export default function UnityGamePage({ hint = false }) {
  const canvasRef = useRef(null);
  const unityRef = useRef(null);

  const [userId, setUserId] = useState("guest");
  const userIdRef = useRef("guest");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId("guest");
        userIdRef.current = "guest";

        const inst = unityRef.current;
        if (inst) {
          try {
            inst.SendMessage("GameManager", "SetUserId", "guest");
          } catch {}
        }
        return;
      }

      const me = await getMyUser();
      const id = me?.userId ?? "guest";
      setUserId(id);
      userIdRef.current = id;

      const inst = unityRef.current;
      if (inst) {
        try {
          inst.SendMessage("GameManager", "SetUserId", id);
        } catch (e) {
          console.error("SendMessage(auth-change) failed:", e);
        }
      }
    });
  }, []);

  useEffect(() => {
    const handler = async (e) => {
      try {
        const raw = e?.detail;
        const payload = typeof raw === "string" ? JSON.parse(raw) : raw;

        if (userIdRef.current === "guest") return;

        await savePlayResult(payload);
        console.log("[Firestore] saved play result");
      } catch (err) {
        console.error("[Firestore] save failed:", err);
      }
    };

    window.addEventListener("UNITY_GAME_RESULT", handler);
    return () => window.removeEventListener("UNITY_GAME_RESULT", handler);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLoaderOnce() {
      if (window.createUnityInstance) return;

      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "/unity/Build/WebGL.loader.js";
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }

    async function boot() {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas not mounted yet");

      canvas.style.background = "transparent";
      canvas.style.display = "block";
      if (!canvas.id) canvas.id = "unity-canvas";

      await loadLoaderOnce();
      if (cancelled) return;

      const config = {
        dataUrl: "/unity/Build/WebGL.data",
        frameworkUrl: "/unity/Build/WebGL.framework.js",
        codeUrl: "/unity/Build/WebGL.wasm",
        streamingAssetsUrl: "/unity/StreamingAssets",
        companyName: "PLlab",
        productName: "Rhythm",
        productVersion: "1.0",
        webglContextAttributes: { alpha: true, premultipliedAlpha: false },
      };

      const instance = await window.createUnityInstance(canvas, config, () => {});
      if (cancelled) {
        try {
          await instance.Quit();
        } catch {}
        return;
      }

      unityRef.current = instance;
      window.__unityInstance = instance;

      try {
        instance.SendMessage("GameManager", "SetUserId", userIdRef.current);
      } catch (e) {
        console.error("SendMessage(boot) failed:", e);
      }
    }

    boot().catch(console.error);

    return () => {
      cancelled = true;
      if (unityRef.current) {
        try {
          unityRef.current.Quit();
        } catch {}
        unityRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <canvas
          id="unity-canvas"
          ref={canvasRef}
          className="relative z-0 block w-full"
          style={{
            aspectRatio: "960 / 600",
            background: "transparent",
          }}
        />

        <LaneKeyOverlay
          visible={hint}
          positions={{
            D: { left: "36.4%", top: "72%" },
            F: { left: "43.3%", top: "72%" },
            J: { left: "56.8%", top: "72%" },
            K: { left: "63.7%", top: "72%" },
          }}
          zIndex={9999}
        />
      </div>
    </div>
  );
}
