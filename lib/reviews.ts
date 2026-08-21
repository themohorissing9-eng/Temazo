import { db } from "./db.ts";

export interface TopTrack {
  track_id: number;
  title: string;
  group_id: number;
  group_name: string;
  author_name: string;
  avg_score: number | null;
  vote_count: number;
  play_count: number;
}

export interface Review {
  id: number;
  name: string;
  body: string;
  created_at: string;
}

/**
 * Canción destacada de toda la app: la mejor posicionada con el mismo
 * criterio que el ranking de grupo (promedio desc, votos desc, publicación
 * asc), entre grupos que no están ocultos del ranking.
 */
export function getGlobalTopTrack(): TopTrack | null {
  const row = db
    .prepare(
      `
      SELECT t.id AS track_id, t.title, t.group_id, g.name AS group_name,
             COALESCE(gm.name, u.name) AS author_name,
             (SELECT ROUND(AVG(v.score), 1) FROM votes v WHERE v.track_id = t.id) AS avg_score,
             (SELECT COUNT(*) FROM votes v WHERE v.track_id = t.id) AS vote_count,
             (SELECT COUNT(*) FROM plays p WHERE p.track_id = t.id) AS play_count
      FROM tracks t
      INNER JOIN groups g ON g.id = t.group_id
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.user_id = t.user_id
      WHERE COALESCE(g.hidden_from_ranking, 0) = 0
        AND EXISTS (SELECT 1 FROM votes v WHERE v.track_id = t.id)
      ORDER BY avg_score DESC, vote_count DESC, t.created_at ASC, t.id ASC
      LIMIT 1
      `
    )
    .get() as unknown as TopTrack | undefined;

  return row ?? null;
}

/** Reseñas de una canción, de la más reciente a la más antigua. */
export function getReviews(trackId: number): Review[] {
  return db
    .prepare(
      "SELECT id, name, body, created_at FROM reviews WHERE track_id = ? ORDER BY created_at DESC, id DESC"
    )
    .all(trackId) as unknown as Review[];
}
