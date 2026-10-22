import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ContentStore } from './content-store';
import { closeDatabase, openDatabase, seedDatabase } from './db';
import type { Profile } from '../src/content/types';

function openSeededDatabase() {
  const db = openDatabase(':memory:');
  seedDatabase(db);
  return db;
}

describe('ContentStore.profile', () => {
  it('backfills an empty extra-links list for profiles saved before the feature', () => {
    const db = openSeededDatabase();
    const row = db
      .prepare<[string], { value: string }>('SELECT value FROM documents WHERE key = ?')
      .get('profile');
    const stored = JSON.parse(row!.value) as Profile;
    const { more: _removed, ...legacyLinks } = stored.links;
    db.prepare('UPDATE documents SET value = ? WHERE key = ?').run(
      JSON.stringify({ ...stored, links: legacyLinks }),
      'profile',
    );

    const profile = new ContentStore(db, null).profile();

    expect(profile.links).toEqual({ github: null, linkedin: null, upwork: null, more: [] });
  });

  it('migration 2 backfills an existing profile document without the extra list', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'portfolio-migration-'));
    const file = path.join(dir, 'portfolio.db');
    try {
      const db = openDatabase(file);
      seedDatabase(db);
      const row = db
        .prepare<[string], { value: string }>('SELECT value FROM documents WHERE key = ?')
        .get('profile');
      const stored = JSON.parse(row!.value) as Profile;
      const { more: _removed, ...legacyLinks } = stored.links;
      db.prepare('UPDATE documents SET value = ? WHERE key = ?').run(
        JSON.stringify({ ...stored, links: legacyLinks }),
        'profile',
      );
      // Simulate a database that was migrated before this feature shipped.
      db.prepare('DELETE FROM schema_migrations WHERE version = 2').run();
      closeDatabase(db);

      const reopened = openDatabase(file);
      const migrated = JSON.parse(
        reopened.prepare<[string], { value: string }>('SELECT value FROM documents WHERE key = ?').get('profile')!
          .value,
      ) as Profile;
      closeDatabase(reopened);

      expect(migrated.links.more).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns administrator-defined extra links unchanged', () => {
    const db = openSeededDatabase();
    const store = new ContentStore(db, null);
    const profile = store.profile();
    const saved = store.updateProfile(
      {
        ...profile,
        links: {
          ...profile.links,
          more: [{ id: 'x', label: 'X', href: 'https://x.com/akib' }],
        },
      },
      'admin@example.com',
    );

    expect(new ContentStore(db, null).profile().links.more).toEqual(saved.links.more);
  });
});
