import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { getTracksForGroup } from "@/lib/votes";
import { TrackCard } from "@/components/TrackCard";

export default async function GroupTracksPage({
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

  const tracks = getTracksForGroup(gid, user.id, group.is_admin);

  if (tracks.length === 0) {
    return (
      <section className="card text-center">
        <p className="text-4xl">🎵</p>
        <h2 className="mt-3 text-xl font-bold text-neutral-100">
          Todavía no hay canciones
        </h2>
        <p className="mt-2 text-neutral-400">
          Subí la primera para empezar a armar el TEMAZO del grupo.
        </p>
        <Link href={`/groups/${gid}/upload`} className="btn-primary mt-5 inline-flex">
          + Subir mi música
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
    </section>
  );
}
