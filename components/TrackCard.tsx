import type { TrackWithStats } from "@/lib/votes";
import { formatDuration, formatScore } from "@/lib/format";
import { TrackPlayer } from "./TrackPlayer";
import { VoteControl } from "./VoteControl";
import { DeleteTrackButton } from "./DeleteTrackButton";

export function TrackCard({ track }: { track: TrackWithStats }) {
  const duration = formatDuration(track.duration_seconds);
  const isOwn = track.is_own;
  const isVideo = track.mime_type.startsWith("video/");

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-neutral-100">
            {track.title}
            {isVideo && (
              <span className="ml-2 rounded-full bg-orange-500/15 px-2 py-0.5 align-middle text-xs font-medium text-orange-300">
                🎬 Video
              </span>
            )}
          </h3>
          <p className="text-sm text-neutral-400">
            {isOwn ? (
              <>
                Por vos{" "}
                <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  Tu canción
                </span>
              </>
            ) : (
              <>Por {track.author_name}</>
            )}
          </p>
        </div>
        {(isOwn || track.can_delete) && <DeleteTrackButton trackId={track.id} />}
      </div>

      <div className="mt-4 space-y-1">
        <TrackPlayer trackId={track.id} isVideo={isVideo} />
        {duration && (
          <p className="text-right text-xs text-neutral-500">
            Duración: {duration}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="rounded-xl bg-amber-400/10 px-3 py-2">
          <p className="text-lg font-black text-amber-300">
            ★ {formatScore(track.avg_score)}
            <span className="text-sm font-medium text-amber-200/60"> / 10</span>
          </p>
        </div>
        <p className="text-sm text-neutral-400">
          {track.vote_count} {track.vote_count === 1 ? "voto" : "votos"}
        </p>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <VoteControl trackId={track.id} myScore={track.my_score} />
      </div>
    </article>
  );
}
