import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupRankingDetail } from "@/lib/ranking";
import { formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export default async function GroupInfoPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const gid = Number(groupId);

  if (!Number.isInteger(gid) || gid <= 0) notFound();

  const detail = getGroupRankingDetail(gid);
  if (!detail) notFound();

  return (
    <section>
      <Link
        href="/ranking"
        className="text-sm font-medium text-neutral-400 transition hover:text-orange-300"
      >
        ← Volver al ranking
      </Link>

      <h2 className="mt-3 text-3xl font-black text-neutral-100">
        {detail.name}
      </h2>
      <p className="mt-1 text-sm text-neutral-400">
        {detail.member_count}{" "}
        {detail.member_count === 1 ? "integrante" : "integrantes"} ·{" "}
        {detail.track_count}{" "}
        {detail.track_count === 1 ? "canción" : "canciones"} ·{" "}
        {detail.vote_count} {detail.vote_count === 1 ? "voto" : "votos"} ·{" "}
        {detail.play_count} {detail.play_count === 1 ? "escucha" : "escuchas"}
      </p>

      {detail.tracks.length === 0 ? (
        <p className="card mt-6 text-center text-neutral-400">
          Este grupo todavía no tiene canciones.
        </p>
      ) : (
        <ol className="mt-6 space-y-3">
          {detail.tracks.map((track, index) => (
            <li
              key={track.track_id}
              className="card flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="w-8 shrink-0 text-center text-lg font-black text-neutral-400">
                  {index <= 2 && (
                    <span>{MEDALS[index]}</span>
                  )}
                  {index > 2 && <span className="text-sm">#{index + 1}</span>}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-neutral-100">
                    {track.title}
                  </p>
                  <p className="truncate text-sm text-neutral-400">
                    Por {track.author_name}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right text-sm">
                <p className="font-black text-amber-300">
                  ★ {formatScore(track.avg_score)}
                  <span className="text-sm font-medium text-amber-200/60">
                    {" "}
                    / 10
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  {track.vote_count}{" "}
                  {track.vote_count === 1 ? "voto" : "votos"} ·{" "}
                  {track.play_count}{" "}
                  {track.play_count === 1 ? "escucha" : "escuchas"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
