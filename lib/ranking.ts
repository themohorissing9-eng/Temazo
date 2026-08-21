import { db } from "./db.ts";

export interface GroupRankingEntry {
  position: number;
  group_id: number;
  name: string;
  invite_code: string;
  created_at: string;
  member_count: number;
  track_count: number;
  vote_count: number;
  avg_score: number | null;
  play_count: number;
  votes_score: number;
  plays_score: number;
  score: number;
  track_titles: string[];
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Ranking global de grupos.
 *
 * Fórmula: cada grupo recibe dos componentes en escala 0–10 relativos al
 * mejor grupo (10 = máximo entre todos):
 *   - votos: cantidad de votos recibidos entre todas sus canciones
 *   - escuchas: cantidad de reproducciones (plays) entre todas sus canciones
 * El puntaje final es el promedio de ambos componentes.
 */
export function getGroupRanking(): GroupRankingEntry[] {
  const rows = db
    .prepare(
      `
      SELECT g.id AS group_id, g.name, g.invite_code, g.created_at,
             (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id != g.created_by) AS member_count,
             (SELECT COUNT(*) FROM tracks t WHERE t.group_id = g.id) AS track_count,
             (SELECT COUNT(*) FROM votes v INNER JOIN tracks t ON t.id = v.track_id
                WHERE t.group_id = g.id) AS vote_count,
             (SELECT ROUND(AVG(v.score), 1) FROM votes v INNER JOIN tracks t ON t.id = v.track_id
                WHERE t.group_id = g.id) AS avg_score,
             (SELECT COUNT(*) FROM plays p INNER JOIN tracks t ON t.id = p.track_id
                WHERE t.group_id = g.id) AS play_count,
             (SELECT GROUP_CONCAT(title, '|') FROM (
                SELECT title FROM tracks t2 WHERE t2.group_id = g.id
                ORDER BY t2.created_at ASC, t2.id ASC
              )) AS track_titles
      FROM groups g
      WHERE COALESCE(g.hidden_from_ranking, 0) = 0
      `
    )
    .all() as unknown as Array<{
    group_id: number;
    name: string;
    invite_code: string;
    created_at: string;
    member_count: number;
    track_count: number;
    vote_count: number;
    avg_score: number | null;
    play_count: number;
    track_titles: string | null;
  }>;

  const maxVotes = Math.max(1, ...rows.map((r) => r.vote_count));
  const maxPlays = Math.max(1, ...rows.map((r) => r.play_count));

  const entries = rows.map((row) => {
    const votes_score = round2((row.vote_count / maxVotes) * 10);
    const plays_score = round2((row.play_count / maxPlays) * 10);
    return {
      ...row,
      track_titles: (row.track_titles ?? "").split("|").filter(Boolean),
      votes_score,
      plays_score,
      score: round2((votes_score + plays_score) / 2),
    };
  });

  entries.sort(
    (a, b) =>
      b.score - a.score ||
      b.vote_count - a.vote_count ||
      b.play_count - a.play_count ||
      a.group_id - b.group_id
  );

  return entries.map((entry, index) => ({ position: index + 1, ...entry }));
}

export interface GroupDetailTrack {
  track_id: number;
  title: string;
  author_name: string;
  avg_score: number | null;
  vote_count: number;
  play_count: number;
}

export interface GroupDetail {
  group_id: number;
  name: string;
  created_at: string;
  member_count: number;
  track_count: number;
  vote_count: number;
  play_count: number;
  tracks: GroupDetailTrack[];
}

/** Información pública de un grupo para la página /ranking/[groupId]. */
export function getGroupRankingDetail(groupId: number): GroupDetail | null {
  const group = db
    .prepare(
      `
      SELECT g.id AS group_id, g.name, g.created_at,
             (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id != g.created_by) AS member_count,
             (SELECT COUNT(*) FROM tracks t WHERE t.group_id = g.id) AS track_count,
             (SELECT COUNT(*) FROM votes v INNER JOIN tracks t ON t.id = v.track_id
                WHERE t.group_id = g.id) AS vote_count,
             (SELECT COUNT(*) FROM plays p INNER JOIN tracks t ON t.id = p.track_id
                WHERE t.group_id = g.id) AS play_count
      FROM groups g
      WHERE g.id = ?
      `
    )
    .get(groupId) as
    | Omit<GroupDetail, "tracks">
    | undefined;

  if (!group) return null;

  const tracks = db
    .prepare(
      `
      SELECT t.id AS track_id, t.title, COALESCE(gm.name, u.name) AS author_name,
             (SELECT ROUND(AVG(v.score), 1) FROM votes v WHERE v.track_id = t.id) AS avg_score,
             (SELECT COUNT(*) FROM votes v WHERE v.track_id = t.id) AS vote_count,
             (SELECT COUNT(*) FROM plays p WHERE p.track_id = t.id) AS play_count
      FROM tracks t
      INNER JOIN users u ON u.id = t.user_id
      LEFT JOIN group_members gm ON gm.group_id = t.group_id AND gm.user_id = t.user_id
      WHERE t.group_id = ?
      ORDER BY avg_score DESC, vote_count DESC, t.id ASC
      `
    )
    .all(groupId) as unknown as GroupDetailTrack[];

  return { ...group, tracks };
}
