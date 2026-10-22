import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { seedContent } from '../src/content/defaults';

export type Db = Database.Database;

interface Migration {
  version: number;
  name: string;
  up: string;
}

/**
 * Forward-only migrations. Each entry runs once inside a transaction and is
 * recorded in schema_migrations. Never edit a shipped migration; add a new one.
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial content schema',
    up: `
      CREATE TABLE admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX sessions_expires_at ON sessions(expires_at);

      CREATE TABLE documents (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
        featured INTEGER NOT NULL DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        published_at TEXT
      );
      CREATE INDEX projects_status_position ON projects(status, position);

      CREATE TABLE project_redirects (
        from_slug TEXT PRIMARY KEY,
        to_slug TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX project_redirects_target ON project_redirects(to_slug);

      CREATE TABLE audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_email TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX audit_log_created_at ON audit_log(created_at DESC);
    `,
  },
  {
    version: 2,
    name: 'administrator-managed contact links',
    // Profiles seeded before the extra-links feature have no `links.more` key.
    up: `
      UPDATE documents
      SET value = json_set(value, '$.links.more', json('[]'))
      WHERE key = 'profile'
        AND json_type(value, '$.links.more') IS NULL;
    `,
  },
];

export function openDatabase(file: string): Db {
  if (file !== ':memory:') {
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare<[], { version: number }>('SELECT version FROM schema_migrations').all().map((row) => row.version),
  );

  const insertMigration = db.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    const run = db.transaction(() => {
      db.exec(migration.up);
      insertMigration.run(migration.version, migration.name, new Date().toISOString());
    });
    run();
  }

  return db;
}

/** Inserts the original portfolio content into a database that has no documents yet. */
export function seedDatabase(db: Db, now = new Date()): boolean {
  const existing = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM documents').get();
  if (existing && existing.count > 0) return false;

  const content = seedContent(now.toISOString());
  const insertDocument = db.prepare(
    'INSERT INTO documents (key, value, updated_at) VALUES (?, ?, ?)',
  );
  const insertProject = db.prepare(
    `INSERT INTO projects (id, slug, status, featured, position, data, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const seed = db.transaction(() => {
    insertDocument.run('profile', JSON.stringify(content.profile), content.generatedAt);
    insertDocument.run('skills', JSON.stringify(content.skills), content.generatedAt);
    insertDocument.run('settings', JSON.stringify(content.settings), content.generatedAt);
    content.projects.forEach((project, index) => {
      insertProject.run(
        project.id,
        project.slug,
        project.status,
        project.featured ? 1 : 0,
        index,
        JSON.stringify(project),
        content.generatedAt,
        content.generatedAt,
        project.publishedAt ?? content.generatedAt,
      );
    });
  });
  seed();

  return true;
}

export function closeDatabase(db: Db) {
  db.close();
}
