import type { DatabaseSync } from "node:sqlite";

interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseSync) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          invite_code TEXT NOT NULL UNIQUE,
          created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS group_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          joined_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (group_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS tracks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          stored_filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          duration_seconds REAL,
          status TEXT NOT NULL DEFAULT 'processing',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (track_id, user_id)
        );
      `);
    },
  },
  {
    version: 2,
    name: "plays",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS plays (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          played_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
  {
    version: 3,
    name: "group_member_display_name",
    up: (db) => {
      // Nombre de pantalla por grupo, independiente de la cuenta de login.
      // NULL = usar el nombre de la cuenta (users.name).
      db.exec(`
        ALTER TABLE group_members ADD COLUMN name TEXT;
      `);
    },
  },
  {
    version: 4,
    name: "hidden_from_ranking",
    up: (db) => {
      // Permite ocultar un grupo del ranking global (1 = oculto).
      db.exec(`
        ALTER TABLE groups ADD COLUMN hidden_from_ranking INTEGER NOT NULL DEFAULT 0;
      `);
      // El grupo de datos de prueba no compite en el ranking real.
      db.exec(`
        UPDATE groups SET hidden_from_ranking = 1 WHERE name = 'Los del viernes';
      `);
    },
  },
  {
    version: 5,
    name: "reviews",
    up: (db) => {
      // Reseñas públicas de la canción destacada. Sin login: se guarda el
      // nombre que escribe la persona, no una referencia a la cuenta.
      db.exec(`
        CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
    },
  },
];

/**
 * Aplica las migraciones pendientes en orden, dentro de una transacción.
 * Nunca borra datos existentes: solamente agrega el esquema faltante.
 */
export function runMigrations(db: DatabaseSync): void {
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set<number>();
  const rows = db
    .prepare("SELECT version FROM schema_migrations")
    .all() as Array<{ version: number }>;
  for (const row of rows) applied.add(row.version);

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    db.exec("BEGIN");
    try {
      migration.up(db);
      db.prepare(
        "INSERT INTO schema_migrations (version, name) VALUES (?, ?)"
      ).run(migration.version, migration.name);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);
    CREATE INDEX IF NOT EXISTS idx_tracks_group ON tracks (group_id);
    CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks (user_id);
    CREATE INDEX IF NOT EXISTS idx_votes_track ON votes (track_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user ON votes (user_id);
    CREATE INDEX IF NOT EXISTS idx_plays_track ON plays (track_id);
    CREATE INDEX IF NOT EXISTS idx_plays_user ON plays (user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_track ON reviews (track_id);
  `);
}
