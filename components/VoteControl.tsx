"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setVote } from "@/actions/votes";

interface VoteControlProps {
  trackId: number;
  myScore: number | null;
}

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function VoteControl({ trackId, myScore }: VoteControlProps) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = optimistic ?? myScore;

  async function vote(score: number) {
    if (pending || score === selected) return;

    setPending(true);
    setError(null);
    setOptimistic(score);

    const result = await setVote(trackId, score);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setOptimistic(null);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <p className="mb-2 text-sm text-neutral-400">
        {selected !== null ? (
          <>
            Tu puntuación:{" "}
            <span className="font-bold text-orange-300">{selected}</span>
          </>
        ) : (
          "Votá esta canción:"
        )}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {SCORES.map((score) => {
          const active = selected === score;
          const reached = score <= (selected ?? 0);
          return (
            <button
              key={score}
              type="button"
              disabled={pending}
              onClick={() => vote(score)}
              aria-label={`Puntuar ${score} de 10`}
              className={`h-9 w-9 rounded-full text-sm font-semibold transition disabled:opacity-50 ${
                active
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                  : reached
                    ? "border border-orange-400/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
                    : "border border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10"
              }`}
            >
              {score}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </div>
  );
}
