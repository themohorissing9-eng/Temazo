import { db } from "./db.ts";
import type { TrackRow } from "./tracks.ts";

export interface TrackWithStats extends TrackRow {
  author_name: string;
  avg_score: number | null;
  vote_count: number;
  my_score: number | null;
  is_own: boolean;
  can_delete: boolean;
}

export interface RankingEntry {
  position: number;
  track_id: number;
  title: string;
  author_name: string;
  avg_score: number | null;
  vote_count: number;
  created_at: string;
}

export function getMyScore(trackId: number, userId: number): number | null {
  const row = db
    .prepare("SELECT score FROM votes WHERE track_id = ? AND user_id = ?")
    .get(trackId, userId) as { score: number } | undefined;
  return row?.score ?? null;
}

export function getTrackStats(trackId: number): {
  avg_score: number | null;
  vote_count: number;
} {
  const row = db
    .prepare(
      "SELECT ROUND(AVG(score), 1) AS avg_score, COUNT(*) AS vote_count FROM votes WHERE track_id = ?"
    )
    .get(trackId) as { avg_score: number | null; vote_count: number };
  return { avg_score: row.avg_score, vote_count: row.vote_count };
}

/** Canciones de un grupo con datos de votación para el usuario actual. */
export function getTracksForGroup(
  groupId: number,
  currentUserId: number,
  isAdmin: boolean
): TrackWithStats[] {
  const rows = db
    .prepare(
      `
      SELECT t.*, COALESCE(gm.name, u.name) AS author_name,
             (SELECT ROUND(AVG(v.score), 1) FROM votes v WHERE v.track_id = t.id) AS avg_score,
             (SELECT COUNT(*) FROM votes v WHERE v.track_id = t.id) AS vote_count
      FROM tracks t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.user_id = t.user_id
      WHERE t.group_id = ?
      ORDER BY t.created_at ASC, t.id ASC
      `
    )
    .all(groupId) as unknown as Omit<TrackWithStats, "my_score" | "is_own">[];

  const trackIds = rows.map((r) => r.id);
  const myScores = new Map<number, number>();
  if (trackIds.length > 0) {
    const placeholders = trackIds.map(() => "?").join(",");
    const voteRows = db
      .prepare(
        `SELECT track_id, score FROM votes WHERE user_id = ? AND track_id IN (${placeholders})`
      )
      .all(currentUserId, ...trackIds) as Array<{ track_id: number; score: number }>;
    for (const v of voteRows) myScores.set(v.track_id, v.score);
  }

  return rows.map((row) => ({
    ...row,
    my_score: myScores.get(row.id) ?? null,
    is_own: row.user_id === currentUserId,
    can_delete: row.user_id === currentUserId || isAdmin,
  }));
}

/** Ranking del grupo: promedio desc, votos desc, publicación asc. */
export function getRanking(groupId: number): RankingEntry[] {
  const rows = db
    .prepare(
      `
      SELECT t.id AS track_id, t.title, t.created_at, COALESCE(gm.name, u.name) AS author_name,
             (SELECT ROUND(AVG(v.score), 1) FROM votes v WHERE v.track_id = t.id) AS avg_score,
             (SELECT COUNT(*) FROM votes v WHERE v.track_id = t.id) AS vote_count
      FROM tracks t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.user_id = t.user_id
      WHERE t.group_id = ?
      ORDER BY avg_score DESC, vote_count DESC, t.created_at ASC, t.id ASC
      `
    )
    .all(groupId) as unknown as Array<{
    track_id: number;
    title: string;
    created_at: string;
    author_name: string;
    avg_score: number | null;
    vote_count: number;
  }>;

  return rows.map((row, index) => ({ position: index + 1, ...row }));
}
