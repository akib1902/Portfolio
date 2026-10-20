import { randomUUID } from 'node:crypto';
import type { PublicContent, Project, ProjectStatus, Profile, SiteSettings, SkillsDocument } from '../src/content/types';
import type { Db } from './db';

export interface ProjectInput {
  slug: string;
  title: string;
  shortTitle: string;
  category: Project['category'];
  categories: Project['categories'];
  status: ProjectStatus;
  statusLabel: string;
  summary: string;
  value: string;
  stack: string[];
  diagram: Project['diagram'];
  diagramCaption: string;
  focus: string;
  featured: boolean;
  position: number;
  image: string | null;
  sections: Project['sections'];
  links: Project['links'];
  evidenceNote: string;
}

export interface AuditEntry {
  id: number;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
}

interface ProjectRow {
  id: string;
  slug: string;
  status: ProjectStatus;
  featured: number;
  position: number;
  data: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface DocumentRow {
  key: string;
  value: string;
  updated_at: string;
}

const documentKeys = ['profile', 'skills', 'settings'] as const;

function rowToProject(row: ProjectRow): Project {
  const data = JSON.parse(row.data) as Project;
  return {
    ...data,
    id: row.id,
    slug: row.slug,
    status: row.status,
    featured: row.featured === 1,
    position: row.position,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

/**
 * Reads and writes the public content document.
 *
 * Public reads return published projects only. Draft rows never leave this
 * layer unless the caller explicitly asks for them from an authenticated
 * admin route.
 */
export class ContentStore {
  constructor(
    private readonly db: Db,
    private readonly siteUrl: string | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private document<T>(key: (typeof documentKeys)[number]): { value: T; updatedAt: string } {
    const row = this.db
      .prepare<[string], DocumentRow>('SELECT * FROM documents WHERE key = ?')
      .get(key);
    if (!row) throw new Error(`Missing content document: ${key}`);
    return { value: JSON.parse(row.value) as T, updatedAt: row.updated_at };
  }

  private writeDocument(key: (typeof documentKeys)[number], value: unknown): string {
    const timestamp = this.now().toISOString();
    this.db
      .prepare(
        'INSERT INTO documents (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      )
      .run(key, JSON.stringify(value), timestamp);
    return timestamp;
  }

  profile(): Profile {
    return this.document<Profile>('profile').value;
  }

  skills(): SkillsDocument {
    return this.document<SkillsDocument>('skills').value;
  }

  settings(): SiteSettings {
    return this.document<SiteSettings>('settings').value;
  }

  projects(includeDrafts = false): Project[] {
    const rows = includeDrafts
      ? this.db
          .prepare<[], ProjectRow>('SELECT * FROM projects ORDER BY position ASC, created_at ASC')
          .all()
      : this.db
          .prepare<[string], ProjectRow>(
            'SELECT * FROM projects WHERE status = ? ORDER BY position ASC, created_at ASC',
          )
          .all('published');
    return rows.map(rowToProject);
  }

  projectBySlug(slug: string): Project | undefined {
    const row = this.db
      .prepare<[string], ProjectRow>('SELECT * FROM projects WHERE slug = ?')
      .get(slug);
    return row ? rowToProject(row) : undefined;
  }

  projectById(id: string): Project | undefined {
    const row = this.db.prepare<[string], ProjectRow>('SELECT * FROM projects WHERE id = ?').get(id);
    return row ? rowToProject(row) : undefined;
  }

  publicContent(): PublicContent {
    return {
      profile: this.profile(),
      skills: this.skills(),
      projects: this.projects(false),
      settings: this.settings(),
      site: { url: this.siteUrl },
      generatedAt: this.now().toISOString(),
    };
  }

  adminContent(): PublicContent {
    return {
      ...this.publicContent(),
      projects: this.projects(true),
    };
  }

  updateProfile(profile: Profile, adminEmail: string): Profile {
    this.writeDocument('profile', profile);
    this.audit(adminEmail, 'update', 'profile', 'profile', describeProfileChange(profile));
    return profile;
  }

  updateSkills(skills: SkillsDocument, adminEmail: string): SkillsDocument {
    this.writeDocument('skills', skills);
    this.audit(
      adminEmail,
      'update',
      'skills',
      'skills',
      `${skills.groups.length} skill groups, ${skills.groups.reduce((total, group) => total + group.items.length, 0)} skills`,
    );
    return skills;
  }

  updateSettings(settings: SiteSettings, adminEmail: string): SiteSettings {
    this.writeDocument('settings', settings);
    this.audit(adminEmail, 'update', 'settings', 'settings', `Default theme set to ${settings.defaultTheme}`);
    return settings;
  }

  createProject(input: ProjectInput, adminEmail: string): Project {
    const id = `project-${randomUUID()}`;
    const timestamp = this.now().toISOString();
    const position =
      input.position >= 0
        ? input.position
        : (
            this.db.prepare<[], { next: number }>(
              'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM projects',
            ).get() ?? { next: 0 }
          ).next;
    const project: Project = {
      ...input,
      id,
      position,
      updatedAt: timestamp,
      publishedAt: input.status === 'published' ? timestamp : null,
    };

    this.db
      .prepare(
        `INSERT INTO projects (id, slug, status, featured, position, data, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        project.slug,
        project.status,
        project.featured ? 1 : 0,
        project.position,
        JSON.stringify(project),
        timestamp,
        timestamp,
        project.publishedAt,
      );

    this.audit(
      adminEmail,
      'create',
      'project',
      id,
      `${project.title} (${project.slug}) created as ${project.status}`,
    );
    return project;
  }

  updateProject(id: string, input: ProjectInput, adminEmail: string): Project {
    const existing = this.projectById(id);
    if (!existing) throw new Error('Project not found');

    const timestamp = this.now().toISOString();
    const project: Project = {
      ...existing,
      ...input,
      id,
      updatedAt: timestamp,
      publishedAt:
        input.status === 'published'
          ? (existing.publishedAt ?? timestamp)
          : existing.publishedAt,
    };

    const apply = this.db.transaction(() => {
      this.db
        .prepare(
          'UPDATE projects SET slug = ?, status = ?, featured = ?, position = ?, data = ?, updated_at = ?, published_at = ? WHERE id = ?',
        )
        .run(
          project.slug,
          project.status,
          project.featured ? 1 : 0,
          project.position,
          JSON.stringify(project),
          timestamp,
          project.publishedAt,
          id,
        );

      if (existing.slug !== project.slug) {
        // Keep old published URLs working with a permanent redirect.
        this.db
          .prepare(
            'INSERT INTO project_redirects (from_slug, to_slug, created_at) VALUES (?, ?, ?) ON CONFLICT(from_slug) DO UPDATE SET to_slug = excluded.to_slug',
          )
          .run(existing.slug, project.slug, timestamp);
        this.db
          .prepare('DELETE FROM project_redirects WHERE to_slug = ? AND from_slug <> ?')
          .run(existing.slug, project.slug);
      }
    });
    apply();

    this.audit(
      adminEmail,
      'update',
      'project',
      id,
      `${project.title} (${project.slug}) updated${existing.slug !== project.slug ? `; slug changed from ${existing.slug}` : ''}`,
    );
    return project;
  }

  setProjectStatus(id: string, status: ProjectStatus, adminEmail: string): Project {
    const existing = this.projectById(id);
    if (!existing) throw new Error('Project not found');
    const timestamp = this.now().toISOString();
    const project: Project = {
      ...existing,
      status,
      updatedAt: timestamp,
      publishedAt: status === 'published' ? (existing.publishedAt ?? timestamp) : existing.publishedAt,
    };
    this.db
      .prepare('UPDATE projects SET status = ?, data = ?, updated_at = ?, published_at = ? WHERE id = ?')
      .run(status, JSON.stringify(project), timestamp, project.publishedAt, id);
    this.audit(
      adminEmail,
      status === 'published' ? 'publish' : 'unpublish',
      'project',
      id,
      `${project.title} (${project.slug}) ${status === 'published' ? 'published' : 'moved to draft'}`,
    );
    return project;
  }

  deleteProject(id: string, adminEmail: string): void {
    const existing = this.projectById(id);
    if (!existing) throw new Error('Project not found');
    const remove = this.db.transaction(() => {
      this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM project_redirects WHERE to_slug = ?').run(existing.slug);
    });
    remove();
    this.audit(adminEmail, 'delete', 'project', id, `${existing.title} (${existing.slug}) deleted`);
  }

  redirectForSlug(slug: string): string | undefined {
    const row = this.db
      .prepare<[string], { to_slug: string }>('SELECT to_slug FROM project_redirects WHERE from_slug = ?')
      .get(slug);
    return row?.to_slug;
  }

  audit(
    adminEmail: string,
    action: string,
    entityType: string,
    entityId: string | null,
    summary: string,
  ): void {
    this.db
      .prepare(
        'INSERT INTO audit_log (admin_email, action, entity_type, entity_id, summary, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(adminEmail, action, entityType, entityId, summary, this.now().toISOString());
  }

  auditEntries(limit = 50): AuditEntry[] {
    const rows = this.db
      .prepare<[number], { id: number; admin_email: string; action: string; entity_type: string; entity_id: string | null; summary: string; created_at: string }>(
        'SELECT * FROM audit_log ORDER BY id DESC LIMIT ?',
      )
      .all(Math.min(Math.max(limit, 1), 200));
    return rows.map((row) => ({
      id: row.id,
      adminEmail: row.admin_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      createdAt: row.created_at,
    }));
  }
}

function describeProfileChange(profile: Profile): string {
  const fields: string[] = [];
  if (profile.name) fields.push(`name: ${profile.name}`);
  if (profile.portrait) fields.push('portrait set');
  fields.push(`${profile.principles.length} principles`);
  return `Profile updated (${fields.join(', ')})`;
}
