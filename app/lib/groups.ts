import { randomInt } from "node:crypto";
import { db } from "./db.ts";

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Código de invitación tipo TEMAZO-7K4P2, sin caracteres ambiguos. */
export function generateInviteCode(): string {
  const chars = Array.from(
    { length: 5 },
    () => INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]
  );
  return `TEMAZO-${chars.join("")}`;
}

/** Normaliza lo que escribe el usuario: "7k4p2" -> "TEMAZO-7K4P2". */
export function normalizeInviteCode(input: string): string {
  let code = input.trim().toUpperCase();
  if (!code.startsWith("TEMAZO-")) code = `TEMAZO-${code}`;
  return code;
}

export interface GroupRow {
  id: number;
  name: string;
  invite_code: string;
  created_by: number;
  created_at: string;
}

export interface GroupWithStats extends GroupRow {
  member_count: number;
  track_count: number;
}

export interface GroupMember {
  user_id: number;
  name: string;
  joined_at: string;
}

export function isMemberOfGroup(userId: number, groupId: number): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?"
    )
    .get(groupId, userId);
  return row !== undefined;
}

export function isAdminOfGroup(userId: number, groupId: number): boolean {
  const row = db
    .prepare("SELECT 1 FROM groups WHERE id = ? AND created_by = ?")
    .get(groupId, userId);
  return row !== undefined;
}

/** Grupos a los que pertenece el usuario, con contadores. */
export function getUserGroups(userId: number): GroupWithStats[] {
  return db
    .prepare(
      `
      SELECT g.id, g.name, g.invite_code, g.created_by, g.created_at,
             (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id != g.created_by) AS member_count,
             (SELECT COUNT(*) FROM tracks t WHERE t.group_id = g.id) AS track_count
      FROM groups g
      INNER JOIN group_members gm ON gm.group_id = g.id
      WHERE gm.user_id = ?
      ORDER BY g.created_at DESC, g.id DESC
      `
    )
    .all(userId) as unknown as GroupWithStats[];
}

export function getGroupById(groupId: number): GroupRow | null {
  const row = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
  return (row as GroupRow | undefined) ?? null;
}

export function getGroupByInviteCode(code: string): GroupRow | null {
  const row = db
    .prepare("SELECT * FROM groups WHERE UPPER(invite_code) = ?")
    .get(code);
  return (row as GroupRow | undefined) ?? null;
}

/**
 * Grupo + estado de membresía del usuario. Devuelve null si el grupo
 * no existe o el usuario no pertenece.
 */
export function getGroupForUser(
  groupId: number,
  userId: number
): (GroupWithStats & { is_admin: boolean }) | null {
  const group = getGroupById(groupId);
  if (!group) return null;
  if (!isMemberOfGroup(userId, groupId)) return null;

  const stats = db
    .prepare(
      `
      SELECT
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = ? AND gm.user_id != ?) AS member_count,
        (SELECT COUNT(*) FROM tracks t WHERE t.group_id = ?) AS track_count
      `
    )
    .get(groupId, group.created_by, groupId) as {
    member_count: number;
    track_count: number;
  };

  return {
    ...group,
    member_count: stats.member_count,
    track_count: stats.track_count,
    is_admin: group.created_by === userId,
  };
}

/** Integrantes del grupo, sin contar al administrador (creador). */
export function getGroupMembers(groupId: number): GroupMember[] {
  return db
    .prepare(
      `
      SELECT u.id AS user_id, COALESCE(gm.name, u.name) AS name, gm.joined_at
      FROM group_members gm
      INNER JOIN users u ON u.id = gm.user_id
      INNER JOIN groups g ON g.id = gm.group_id
      WHERE gm.group_id = ? AND gm.user_id != g.created_by
      ORDER BY name COLLATE NOCASE ASC
      `
    )
    .all(groupId) as unknown as GroupMember[];
}
