"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "temazo-bg-playing";

export function BackgroundMusic({ trackId }: { trackId: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const startedRef = useRef(false);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, []);

  // Configurar volumen al montar
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.3;

    // Si la sesión anterior estaba reproduciendo, reanudar
    const wasPlaying = localStorage.getItem(STORAGE_KEY) === "1";
    if (wasPlaying) {
      el.play().catch(() => {});
    }
  }, []);

  // Escuchar play/pause para sincronizar estado + persistir
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => {
      setIsPlaying(true);
      localStorage.setItem(STORAGE_KEY, "1");
    };
    const onPause = () => {
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY, "0");
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  // Reproducir en la primera interacción del usuario
  useEffect(() => {
    if (startedRef.current) return;

    const handleInteraction = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      audioRef.current?.play().catch(() => {});
    };

    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, []);

  return (
    <>
      <audio ref={audioRef} loop preload="auto" className="hidden">
        <source src={`/api/background/${trackId}`} />
      </audio>

      {/* Botón flotante */}
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "Pausar música de fondo" : "Reproducir música de fondo"}
        className={`fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 shadow-lg backdrop-blur-md transition
          ${
            isPlaying
              ? "border-orange-400/40 bg-orange-500/20 text-orange-300 shadow-orange-500/10 hover:bg-orange-500/30"
              : "bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-200"
          }`}
      >
        {isPlaying ? (
          /* Icono de ondas sonoras */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          /* Icono mute */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-5 w-5"
          >
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        )}
      </button>
    </>
  );
}
