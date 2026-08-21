"use client";

import { useEffect, useRef } from "react";

const PLAY_DEBOUNCE_MS = 60_000;

export function TrackPlayer({
  trackId,
  isVideo,
}: {
  trackId: number;
  isVideo: boolean;
}) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const lastPlayedAtRef = useRef(0);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;

    const onPlay = () => {
      const now = Date.now();
      if (now - lastPlayedAtRef.current < PLAY_DEBOUNCE_MS) return;
      lastPlayedAtRef.current = now;
      fetch(`/api/tracks/${trackId}/play`, {
        method: "POST",
        keepalive: true,
      }).catch(() => {
        // si falla el registro, no interrumpir la reproducción
      });
    };

    el.addEventListener("play", onPlay);
    return () => el.removeEventListener("play", onPlay);
  }, [trackId]);

  const attachRef = (el: HTMLMediaElement | null) => {
    mediaRef.current = el;
  };

  const common = {
    controls: true,
    preload: "metadata" as const,
    controlsList: "nodownload",
    className: "w-full",
    src: `/api/tracks/${trackId}`,
  };

  if (isVideo) {
    return <video ref={attachRef} {...common} />;
  }
  return <audio ref={attachRef} {...common} />;
}
