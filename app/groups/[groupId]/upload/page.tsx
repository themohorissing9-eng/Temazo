import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroupForUser } from "@/lib/groups";
import { getMaxUploadMb, getMaxVideoMb } from "@/lib/tracks";
import { ffmpegAvailable } from "@/lib/ffmpeg";
import { UploadTrackForm } from "@/components/UploadTrackForm";

export default async function GroupUploadPage({
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

  return (
    <section className="card">
      <h2 className="mb-1 text-2xl font-black text-neutral-100">
        Subir mi música
      </h2>
      <p className="mb-6 text-sm text-neutral-400">
        Compartí tu tema (audio o video) con el grupo. Después podés volver a
        la lista de canciones para escuchar, ver y votar.
      </p>

      <UploadTrackForm
        groupId={gid}
        maxUploadMb={getMaxUploadMb()}
        maxVideoMb={getMaxVideoMb()}
        allowedExts={["mp3", "wav", "ogg", "m4a"]}
        videoExts={["mp4", "webm", "mov"]}
        ffmpegOk={ffmpegAvailable()}
      />

      <div className="mt-6 border-t border-white/10 pt-4 text-center">
        <Link
          href={`/groups/${gid}`}
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Volver a las canciones
        </Link>
      </div>
    </section>
  );
}
