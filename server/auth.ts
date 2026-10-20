import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Db } from './db';

const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export const SESSION_COOKIE = 'portfolio_admin_session';
export const MIN_PASSWORD_LENGTH = 12;
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** scrypt with a per-password salt, stored as a self-describing string. */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('base64url');
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELISM,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELISM,
    salt,
    derived.toString('base64url'),
  ].join('$');
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, cost, blockSize, parallelism, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64url');
  if (expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = scryptSync(password, salt, expected.length, {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelism),
      maxmem: 64 * 1024 * 1024,
    });
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sessionId(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface AdminSession {
  adminId: number;
  email: string;
  csrfToken: string;
  expiresAt: number;
}

export interface CreatedSession {
  token: string;
  csrfToken: string;
  expiresAt: number;
}

export function createSession(
  db: Db,
  adminId: number,
  ttlMs = SESSION_TTL_MS,
  now = Date.now(),
): CreatedSession {
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(24).toString('base64url');
  const expiresAt = now + ttlMs;

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  db.prepare(
    'INSERT INTO sessions (id, admin_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  ).run(sessionId(token), adminId, csrfToken, now, expiresAt);

  return { token, csrfToken, expiresAt };
}

export function readSession(db: Db, token: string | null, now = Date.now()): AdminSession | null {
  if (!token) return null;
  const row = db
    .prepare<[string], { admin_id: number; email: string; csrf_token: string; expires_at: number }>(
      `SELECT sessions.admin_id, admin_users.email AS email, sessions.csrf_token, sessions.expires_at
       FROM sessions JOIN admin_users ON admin_users.id = sessions.admin_id
       WHERE sessions.id = ?`,
    )
    .get(sessionId(token));

  if (!row) return null;
  if (row.expires_at <= now) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId(token));
    return null;
  }

  return {
    adminId: row.admin_id,
    email: row.email,
    csrfToken: row.csrf_token,
    expiresAt: row.expires_at,
  };
}

export function destroySession(db: Db, token: string | null): void {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId(token));
}

export function clearAllSessionsForAdmin(db: Db, adminId: number): void {
  db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(adminId);
}

export function findAdminByEmail(
  db: Db,
  email: string,
): { id: number; email: string; password_hash: string } | undefined {
  return db
    .prepare<[string], { id: number; email: string; password_hash: string }>(
      'SELECT id, email, password_hash FROM admin_users WHERE email = ? COLLATE NOCASE',
    )
    .get(email);
}

export function countAdmins(db: Db): number {
  const row = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM admin_users').get();
  return row?.count ?? 0;
}

export function createAdmin(
  db: Db,
  email: string,
  password: string,
  now = new Date(),
): { id: number; created: boolean } {
  const normalisedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
    throw new Error('A valid administrator email is required.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const existing = findAdminByEmail(db, normalisedEmail);
  const timestamp = now.toISOString();
  if (existing) {
    db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      hashPassword(password),
      timestamp,
      existing.id,
    );
    clearAllSessionsForAdmin(db, existing.id);
    return { id: existing.id, created: false };
  }

  const result = db
    .prepare(
      'INSERT INTO admin_users (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)',
    )
    .run(normalisedEmail, hashPassword(password), timestamp, timestamp);
  return { id: Number(result.lastInsertRowid), created: true };
}

export function serializeSessionCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(maxAgeSeconds)}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearSessionCookie(secure: boolean): string {
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}
