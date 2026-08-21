import Link from "next/link";
import { getGlobalTopTrack, getReviews } from "@/lib/reviews";
import { formatScore } from "@/lib/format";
import { AddReviewForm } from "@/components/AddReviewForm";

export const dynamic = "force-dynamic";

export default function ResenasPage() {
  const top = getGlobalTopTrack();

  if (!top) {
    return (
      <section>
        <h2 className="text-2xl font-black text-neutral-100">RESEÑAS</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Acá se comenta la canción más votada de todo TEMAZO. Todavía no hay
          canciones con votos.
        </p>
        <p className="card mt-6 text-center text-neutral-400">
          ¡Volvé cuando haya música en el ranking!
        </p>
      </section>
    );
  }

  const reviews = getReviews(top.track_id);

  return (
    <section>
      <h2 className="text-2xl font-black text-neutral-100">RESEÑAS</h2>
      <p className="mt-2 text-sm text-neutral-400">
        La canción más votada del momento. Comentala con tu nombre: el público
        que la escucha la está reseñando.
      </p>

      <div className="card mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-200/60">
          Canción destacada
        </p>
        <h3 className="mt-1 text-2xl font-black text-neutral-100">
          {top.title}
        </h3>
        <p className="mt-1 text-sm text-neutral-400">
          Por {top.author_name}
        </p>
        <p className="text-sm text-neutral-500">
          <Link
            href={`/ranking/${top.group_id}`}
            className="font-semibold text-orange-300 transition hover:text-orange-200"
          >
            {top.group_name}
          </Link>{" "}
          en el ranking de grupos
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <p className="font-black text-amber-300">
            ★ {formatScore(top.avg_score)}
            <span className="text-sm font-medium text-amber-200/60"> / 10</span>
          </p>
          <p className="text-neutral-300">
            🗳️ {top.vote_count} {top.vote_count === 1 ? "voto" : "votos"}
          </p>
          <p className="text-neutral-300">
            🎧 {top.play_count} {top.play_count === 1 ? "escucha" : "escuchas"}
          </p>
        </div>
      </div>

      <h3 className="mt-8 text-lg font-bold text-neutral-100">
        Reseñas del público
      </h3>

      {reviews.length === 0 ? (
        <p className="card mt-3 text-center text-neutral-400">
          Todavía no hay reseñas. ¡Sé el primero en comentar!
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="card">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-orange-200">{review.name}</p>
                <p className="text-xs text-neutral-500">{review.created_at}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <AddReviewForm trackId={top.track_id} />
      </div>
    </section>
  );
}
