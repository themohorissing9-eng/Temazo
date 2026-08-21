/**
 * Datos de prueba para desarrollo.
 *
 * Crea usuarios, un grupo, canciones ficticias (WAV generados, sin
 * copyright) y votos. Se puede ejecutar varias veces: reutiliza los
 * usuarios y renueva el grupo de ejemplo.
 *
 * Uso:
 *   npm run seed
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { db, dataDir } from "../lib/db.ts";
import { generateInviteCode } from "../lib/groups.ts";
import { getUploadDir } from "../lib/tracks.ts";

/** Genera un WAV PCM mono de 8 bits en silencio (sin copyright). */
function makeSilentWav(seconds: number): Buffer {
  const sampleRate = 8000;
  const dataSize = sampleRate * seconds;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  buf.fill(128, 44);
  return buf;
}

function ensureUser(name: string): number {
  const existing = db
    .prepare("SELECT id FROM users WHERE lower(name) = lower(?)")
    .get(name) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db.prepare("INSERT INTO users (name) VALUES (?)").run(name);
  return Number(result.lastInsertRowid);
}

function main() {
  console.log("Creando datos de prueba en", dataDir);

  db.exec("BEGIN");

  const nic = ensureUser("Nicolás");
  const pedro = ensureUser("Pedro");
  const juan = ensureUser("Juan");
  const maria = ensureUser("María");

  const existing = db
    .prepare("SELECT id FROM groups WHERE name = ?")
    .get("Los del viernes") as { id: number } | undefined;

  let groupId: number;
  if (existing) {
    groupId = existing.id;
    const tracks = db
      .prepare("SELECT id, group_id, stored_filename FROM tracks WHERE group_id = ?")
      .all(groupId) as Array<{ id: number; group_id: number; stored_filename: string }>;
    db.prepare("DELETE FROM tracks WHERE group_id = ?").run(groupId);
    for (const t of tracks) {
      try {
        rmSync(path.join(getUploadDir(), String(t.group_id), t.stored_filename));
      } catch {
        // ignorar archivos inexistentes
      }
    }
  } else {
    const result = db
      .prepare(
        "INSERT INTO groups (name, invite_code, created_by, hidden_from_ranking) VALUES (?, ?, ?, 1)"
      )
      .run("Los del viernes", generateInviteCode(), nic);
    groupId = Number(result.lastInsertRowid);
    db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(
      groupId,
      nic
    );
  }

  for (const uid of [pedro, juan, maria]) {
    db.prepare(
      "INSERT INTO group_members (group_id, user_id) VALUES (?, ?) ON CONFLICT(group_id, user_id) DO NOTHING"
    ).run(groupId, uid);
  }

  const seedTracks: Array<{ title: string; author: number; seconds: number }> = [
    { title: "La tormenta", author: nic, seconds: 4 },
    { title: "Bajo el sol", author: pedro, seconds: 5 },
    { title: "Medianoche", author: juan, seconds: 3 },
    { title: "A toda velocidad", author: maria, seconds: 6 },
  ];

  const uploadsDir = path.join(getUploadDir(), String(groupId));
  mkdirSync(uploadsDir, { recursive: true });

  const trackIds: Array<{ id: number; author: number }> = [];

  for (const track of seedTracks) {
    const result = db
      .prepare(
        `INSERT INTO tracks
           (group_id, user_id, title, original_filename, stored_filename, mime_type, file_size, duration_seconds, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready')`
      )
      .run(
        groupId,
        track.author,
        track.title,
        `${track.title.toLowerCase().replaceAll(" ", "-")}.wav`,
        "",
        "audio/wav",
        0,
        track.seconds
      );
    const trackId = Number(result.lastInsertRowid);
    const buf = makeSilentWav(track.seconds);
    const stored = `${trackId}.wav`;
    writeFileSync(path.join(uploadsDir, stored), buf);
    db.prepare(
      "UPDATE tracks SET stored_filename = ?, file_size = ? WHERE id = ?"
    ).run(stored, buf.length, trackId);
    trackIds.push({ id: trackId, author: track.author });
  }

  const votes: Record<string, Record<string, number>> = {
    "La tormenta": { Pedro: 8, Juan: 9, María: 10 },
    "Bajo el sol": { Nicolás: 7, Juan: 8, María: 9 },
    Medianoche: { Nicolás: 5, Pedro: 6, María: 7 },
    "A toda velocidad": { Nicolás: 9, Pedro: 8, Juan: 9 },
  };

  for (const track of trackIds) {
    const trackRow = db
      .prepare("SELECT title FROM tracks WHERE id = ?")
      .get(track.id) as { title: string };
    const authorName = (db
      .prepare("SELECT name FROM users WHERE id = ?")
      .get(track.author) as { name: string }).name;

    for (const [voterName, score] of Object.entries(votes[trackRow.title] ?? {})) {
      if (voterName === authorName) continue;
      const voter = ensureUser(voterName);
      db.prepare(
        `INSERT INTO votes (track_id, user_id, score)
         VALUES (?, ?, ?)
         ON CONFLICT(track_id, user_id) DO UPDATE SET
           score = excluded.score, updated_at = datetime('now')`
      ).run(track.id, voter, score);
    }
  }

  db.exec("COMMIT");

  const group = db
    .prepare("SELECT name, invite_code FROM groups WHERE id = ?")
    .get(groupId) as { name: string; invite_code: string };

  console.log("Grupo de prueba:", group.name, "—", group.invite_code);
  console.log("Integrantes: Nicolás, Pedro, Juan, María");
  console.log("Canciones: La tormenta, Bajo el sol, Medianoche, A toda velocidad");
  console.log("Listo. Iniciá la app con: npm run dev");
}

try {
  main();
} catch (err) {
  console.error("El seed falló:", err);
  process.exit(1);
}
