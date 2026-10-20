/**
 * Provisions or rotates the single administrator account.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run admin:create
 *
 * There is no default account or password. Credentials are read from the
 * environment so they never appear in shell history when supplied by the host's
 * secret manager. The password is hashed with scrypt before storage.
 */
import 'dotenv/config';
import path from 'node:path';
import { MIN_PASSWORD_LENGTH, createAdmin } from '../auth';
import { openDatabase, seedDatabase } from '../db';

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD, then run this script again.');
  console.error('  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=\'…\' npm run admin:create');
  process.exit(1);
}

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}

const dataDir = path.resolve(process.env.DATA_DIR ?? 'data');
const databaseFile = path.resolve(process.env.DATABASE_PATH ?? path.join(dataDir, 'portfolio.db'));

const db = openDatabase(databaseFile);
seedDatabase(db);

try {
  const result = createAdmin(db, email, password);
  console.log(
    result.created
      ? `[admin] created ${email}`
      : `[admin] updated the password for ${email}; existing sessions were revoked`,
  );
  console.log('[admin] provisioned in', databaseFile);
} catch (error) {
  console.error('[admin] provisioning failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
} finally {
  db.close();
}
