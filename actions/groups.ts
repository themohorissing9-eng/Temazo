"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  generateInviteCode,
  getGroupById,
  getGroupByInviteCode,
  isAdminOfGroup,
  isMemberOfGroup,
  normalizeInviteCode,
} from "@/lib/groups";
import { deleteTrackFile } from "@/lib/tracks";
import type { FormState } from "@/lib/result";

function cleanName(value: FormDataEntryValue | null): string | null {
  const name = String(value ?? "").trim();
  if (!name) return null;
  if (name.length > 80) return null;
  return name;
}

export async function createGroup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const name = cleanName(formData.get("name"));
  if (!name) return { error: "Escribí el nombre del grupo." };

  let groupId: number;

  try {
    let code = generateInviteCode();
    let insertedId: number | null = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const result = db
          .prepare(
            "INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?)"
          )
          .run(name, code, user.id);
        insertedId = Number(result.lastInsertRowid);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("UNIQUE")) {
          code = generateInviteCode();
          continue;
        }
        throw err;
      }
    }

    if (insertedId === null) {
      return { error: "No pudimos generar un código único. Probá de nuevo." };
    }

    groupId = insertedId;
    db.prepare(
      "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)"
    ).run(groupId, user.id);
  } catch (err) {
    console.error("[createGroup]", err);
    return { error: "No pudimos crear el grupo. Probá de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function joinGroup(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const rawCode = String(formData.get("code") ?? "").trim();
  if (!rawCode) return { error: "Ingresá el código de invitación." };

  const code = normalizeInviteCode(rawCode);
  let groupId: number;

  try {
    const group = getGroupByInviteCode(code);
    if (!group) return { error: "El código de grupo no es válido." };

    groupId = group.id;
    if (!isMemberOfGroup(user.id, group.id)) {
      db.prepare(
        "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)"
      ).run(group.id, user.id);
    }
  } catch (err) {
    console.error("[joinGroup]", err);
    return { error: "No pudimos unirte al grupo. Probá de nuevo." };
  }

  revalidatePath("/");
  revalidatePath("/groups");
  redirect(`/groups/${groupId}`);
}

export async function regenerateInviteCode(
  groupId: number
): Promise<FormState> {
  const user = await requireUser();
  if (!isAdminOfGroup(user.id, groupId)) {
    return { error: "No tenés permiso para hacer esto." };
  }

  try {
    let code = generateInviteCode();
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        db.prepare("UPDATE groups SET invite_code = ? WHERE id = ?").run(
          code,
          groupId
        );
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("UNIQUE")) {
          code = generateInviteCode();
          continue;
        }
        throw err;
      }
    }

    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  } catch (err) {
    console.error("[regenerateInviteCode]", err);
    return { error: "No pudimos regenerar el código." };
  }
}

export async function deleteGroup(groupId: number): Promise<FormState> {
  const user = await requireUser();
  if (!isAdminOfGroup(user.id, groupId)) {
    return { error: "No tenés permiso para eliminar este grupo." };
  }

  try {
    const tracks = db
      .prepare("SELECT id, group_id, stored_filename FROM tracks WHERE group_id = ?")
      .all(groupId) as Array<{ id: number; group_id: number; stored_filename: string }>;

    db.prepare("DELETE FROM groups WHERE id = ?").run(groupId);

    for (const track of tracks) {
      deleteTrackFile(track.group_id, track.stored_filename);
    }

    revalidatePath("/");
    revalidatePath("/groups");
  } catch (err) {
    console.error("[deleteGroup]", err);
    return { error: "No pudimos eliminar el grupo." };
  }

  redirect("/groups");
}

export async function leaveGroup(groupId: number): Promise<FormState> {
  const user = await requireUser();
  const group = getGroupById(groupId);
  if (!group) return { error: "El grupo no existe." };
  if (group.created_by === user.id) {
    return { error: "El administrador no puede abandonar el grupo. Podés eliminarlo." };
  }
  if (!isMemberOfGroup(user.id, groupId)) {
    return { error: "No pertenecés a este grupo." };
  }

  try {
    db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(
      groupId,
      user.id
    );
    revalidatePath("/");
    revalidatePath("/groups");
  } catch (err) {
    console.error("[leaveGroup]", err);
    return { error: "No pudimos sacarte del grupo." };
  }

  redirect("/groups");
}

export async function addMember(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const groupId = Number(formData.get("groupId"));
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return { error: "Grupo inválido." };
  }
  if (!isAdminOfGroup(user.id, groupId)) {
    return { error: "No tenés permiso para hacer esto." };
  }

  const name = cleanName(formData.get("name"));
  if (!name) {
    return { error: "Escribí el nombre del integrante." };
  }

  try {
    const existing = db
      .prepare("SELECT id FROM users WHERE lower(name) = lower(?)")
      .get(name) as { id: number } | undefined;

    let memberId: number;
    if (existing) {
      memberId = existing.id;
    } else {
      const result = db
        .prepare("INSERT INTO users (name) VALUES (?)")
        .run(name);
      memberId = Number(result.lastInsertRowid);
    }

    if (isMemberOfGroup(memberId, groupId)) {
      return { error: "Esa persona ya es integrante de este grupo." };
    }

    db.prepare(
      "INSERT INTO group_members (group_id, user_id, name) VALUES (?, ?, ?)"
    ).run(groupId, memberId, name);

    revalidatePath(`/groups/${groupId}/members`);
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  } catch (err) {
    console.error("[addMember]", err);
    return { error: "No pudimos agregar al integrante. Probá de nuevo." };
  }
}

export async function renameMember(
  groupId: number,
  memberId: number,
  newName: string
): Promise<FormState> {
  const user = await requireUser();
  if (!isMemberOfGroup(user.id, groupId)) {
    return { error: "No pertenecés a este grupo." };
  }

  const isAdmin = isAdminOfGroup(user.id, groupId);
  if (!isAdmin && memberId !== user.id) {
    return { error: "No tenés permiso para renombrar a otros integrantes." };
  }

  const name = cleanName(newName);
  if (!name) {
    return { error: "Escribí un nombre válido (máximo 80 caracteres)." };
  }

  const target = db
    .prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?")
    .get(groupId, memberId);
  if (!target) {
    return { error: "Ese integrante no está en el grupo." };
  }

  try {
    // Nombre de pantalla por grupo: no afecta la cuenta de login del usuario.
    db.prepare(
      "UPDATE group_members SET name = ? WHERE group_id = ? AND user_id = ?"
    ).run(name, groupId, memberId);
    revalidatePath(`/groups/${groupId}/members`);
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return { ok: true };
  } catch (err) {
    console.error("[renameMember]", err);
    return { error: "No pudimos guardar el nombre. Probá de nuevo." };
  }
}

export async function removeMember(
  groupId: number,
  memberId: number
): Promise<FormState> {
  const user = await requireUser();
  if (!isAdminOfGroup(user.id, groupId)) {
    return { error: "No tenés permiso para hacer esto." };
  }
  if (memberId === user.id) {
    return { error: "No podés eliminarte a vos mismo del grupo." };
  }

  try {
    const member = db
      .prepare(
        "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?"
      )
      .get(groupId, memberId);
    if (!member) return { error: "Ese integrante no está en el grupo." };

    db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(
      groupId,
      memberId
    );
    db.prepare("DELETE FROM votes WHERE user_id = ? AND track_id IN (SELECT id FROM tracks WHERE group_id = ?)").run(
      memberId,
      groupId
    );

    revalidatePath(`/groups/${groupId}/members`);
    return { ok: true };
  } catch (err) {
    console.error("[removeMember]", err);
    return { error: "No pudimos eliminar al integrante." };
  }
}
