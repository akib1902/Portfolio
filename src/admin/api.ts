import type { Project, Profile, PublicContent, SiteSettings, SkillsDocument } from '@/content/types';

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }
  headers.set('accept', 'application/json');
  if (csrfToken && init.method && init.method !== 'GET') {
    headers.set('x-csrf-token', csrfToken);
  }

  const response = await fetch(`/api/admin${path}`, {
    credentials: 'same-origin',
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    details?: string[];
  };

  if (!response.ok) {
    if (response.status === 401) csrfToken = null;
    throw new ApiError(payload.error ?? 'The request failed.', response.status, payload.details ?? []);
  }

  return payload as T;
}

export interface SessionInfo {
  authenticated: boolean;
  user?: { email: string };
  csrfToken?: string;
  expiresAt?: number;
}

export async function getSession(): Promise<SessionInfo> {
  const session = await request<SessionInfo>('/session');
  if (session.authenticated && session.csrfToken) csrfToken = session.csrfToken;
  return session;
}

export async function login(email: string, password: string) {
  const result = await request<{ user: { email: string }; csrfToken: string; expiresAt: number }>(
    '/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  csrfToken = result.csrfToken;
  return result;
}

export async function logout() {
  await request<{ ok: true }>('/logout', { method: 'POST' });
  csrfToken = null;
}

export async function fetchAdminContent(): Promise<PublicContent> {
  const result = await request<{ content: PublicContent }>('/content');
  return result.content;
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const result = await request<{ profile: Profile }>('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return result.profile;
}

export async function saveSkills(skills: SkillsDocument): Promise<SkillsDocument> {
  const result = await request<{ skills: SkillsDocument }>('/skills', {
    method: 'PUT',
    body: JSON.stringify(skills),
  });
  return result.skills;
}

export async function saveSettings(settings: SiteSettings): Promise<SiteSettings> {
  const result = await request<{ settings: SiteSettings }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return result.settings;
}

export async function createProject(project: Project): Promise<Project> {
  const result = await request<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(projectInput(project)),
  });
  return result.project;
}

export async function updateProject(id: string, project: Project): Promise<Project> {
  const result = await request<{ project: Project }>(`/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(projectInput(project)),
  });
  return result.project;
}

export async function setProjectStatus(id: string, status: 'draft' | 'published'): Promise<Project> {
  const result = await request<{ project: Project }>(
    `/projects/${encodeURIComponent(id)}/status`,
    { method: 'POST', body: JSON.stringify({ status }) },
  );
  return result.project;
}

export async function deleteProject(id: string): Promise<void> {
  await request<{ ok: true }>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface MediaResult {
  url: string;
  filename: string;
  bytes: number;
}

export async function uploadImage(kind: 'portrait' | 'share' | 'project', file: File): Promise<MediaResult> {
  const body = new FormData();
  body.append('kind', kind);
  body.append('file', file);
  const result = await request<{ media: MediaResult }>('/media', { method: 'POST', body });
  return result.media;
}

export async function deleteMedia(filename: string): Promise<void> {
  await request<{ ok: true }>(`/media/${encodeURIComponent(filename)}`, { method: 'DELETE' });
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

export async function fetchAudit(): Promise<AuditEntry[]> {
  const result = await request<{ entries: AuditEntry[] }>('/audit?limit=50');
  return result.entries;
}

/** Strips server-managed fields before sending a project write payload. */
function projectInput(project: Project) {
  return {
    slug: project.slug,
    title: project.title,
    shortTitle: project.shortTitle,
    category: project.category,
    categories: project.categories,
    status: project.status,
    statusLabel: project.statusLabel,
    summary: project.summary,
    value: project.value,
    stack: project.stack,
    diagram: project.diagram,
    diagramCaption: project.diagramCaption,
    focus: project.focus,
    featured: project.featured,
    position: project.position,
    image: project.image,
    sections: project.sections,
    links: project.links,
    evidenceNote: project.evidenceNote,
  };
}
