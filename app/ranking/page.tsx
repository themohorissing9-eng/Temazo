import Link from "next/link";
import { getGroupRanking } from "@/lib/ranking";
import { formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function medalStyle(position: number): string {
  if (position === 1) return "border-amber-400/40 bg-amber-400/10";
  if (position === 2) return "border-slate-300/30 bg-slate-300/10";
  if (position === 3) return "border-orange-600/40 bg-orange-600/10";
  return "border-white/10 bg-white/5";
}

export default function RankingPage() {
  const ranking = getGroupRanking();

  return (
    <section>
      <h2 className="text-2xl font-black text-neutral-100">
        RANKING DE GRUPOS
      </h2>
      <p className="mt-2 text-sm text-neutral-400">
        Puntaje = promedio entre dos componentes (0–10): votos del público y
        escuchas, cada uno relativo al mejor grupo.
      </p>

      {ranking.length === 0 ? (
        <p className="card mt-6 text-center text-neutral-400">
          Todavía no hay grupos registrados.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {ranking.map((entry) => (
            <li key={entry.group_id}>
              <Link
                href={`/ranking/${entry.group_id}`}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 transition hover:border-orange-400/40 hover:bg-white/10 ${medalStyle(entry.position)}`}
              >
              <div className="w-10 shrink-0 text-center">
                <p className="text-lg font-black text-neutral-200">
                  #{entry.position}
                </p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-100">
                  {entry.position <= 3 && (
                    <span className="mr-2">{MEDALS[entry.position - 1]}</span>
                  )}
                  {entry.name}
                </p>
                <p className="truncate text-sm text-neutral-400">
                  {entry.member_count}{" "}
                  {entry.member_count === 1 ? "integrante" : "integrantes"} ·{" "}
                  {entry.track_count}{" "}
                  {entry.track_count === 1 ? "canción" : "canciones"}
                </p>
                {entry.track_titles.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {entry.track_titles.map((title) => (
                      <li
                        key={title}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        🎵 {title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="shrink-0 text-right text-sm">
                <p className="text-neutral-300">
                  🗳️ {entry.vote_count}{" "}
                  {entry.vote_count === 1 ? "voto" : "votos"}
                  {entry.avg_score !== null && (
                    <span className="text-neutral-500">
                      {" "}
                      (★ {formatScore(entry.avg_score)})
                    </span>
                  )}
                </p>
                <p className="text-neutral-300">
                  🎧 {entry.play_count}{" "}
                  {entry.play_count === 1 ? "escucha" : "escuchas"}
                </p>
              </div>

              <div className="shrink-0 rounded-xl bg-orange-500/10 px-3 py-2 text-center">
                <p className="text-xl font-black text-orange-300">
                  {formatScore(entry.score)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-orange-200/60">
                  puntaje
                </p>
              </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
