import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { getRanking } from "@/lib/votes";
import { formatScore } from "@/lib/format";
import type { RankingEntry } from "@/lib/votes";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

function medalStyle(position: number): string {
  if (position === 1) return "border-amber-400/40 bg-amber-400/10";
  if (position === 2) return "border-slate-300/30 bg-slate-300/10";
  if (position === 3) return "border-orange-600/40 bg-orange-600/10";
  return "border-white/10 bg-white/5";
}

export default async function GroupRankingPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const gid = Number(groupId);

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const group = getGroupForUser(gid, user.id);
  if (!group) return null;

  const ranking = getRanking(gid);

  return (
    <section>
      <h2 className="mb-4 text-2xl font-black text-neutral-100">RANKING</h2>

      {ranking.length === 0 ? (
        <p className="card text-center text-neutral-400">
          Todavía no hay canciones para rankear. Subí música para empezar.
        </p>
      ) : (
        <ol className="space-y-3">
          {ranking.map((entry) => (
            <RankingRow key={entry.track_id} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  const medal = entry.position <= 3 ? MEDALS[entry.position - 1] : null;

  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${medalStyle(entry.position)}`}
    >
      <div className="w-10 shrink-0 text-center">
        <p className="text-lg font-black text-neutral-200">#{entry.position}</p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-neutral-100">
          {medal && <span className="mr-2">{medal}</span>}
          {entry.title}
        </p>
        <p className="truncate text-sm text-neutral-400">
          Por {entry.author_name}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-black text-amber-300">
          {formatScore(entry.avg_score)}
          <span className="text-sm font-medium text-amber-200/60"> / 10</span>
        </p>
        <p className="text-xs text-neutral-500">
          {entry.vote_count} {entry.vote_count === 1 ? "voto" : "votos"}
        </p>
      </div>
    </li>
  );
}
