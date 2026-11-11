import type { AppSession } from '../auth/auth-store';

/** The shared, read-only sample workspace behind "Demo hesabıyla devam et". */
export const SAMPLE_WORKSPACE = 'sample';

const PREFIX = 'odivon:ws:';

/** True for the sample (demo) account, including sessions saved before `sample` existed. */
export function isSampleSession(session: AppSession | null): boolean {
  if (!session) return false;
  if (session.sample !== undefined) return session.sample;
  return session.demo && (session.email === 'demo@odivon.com' || session.role === 'member');
}

/**
 * Which workspace a session works in. A dietitian owns the workspace named after their
 * e-mail; a member works in their dietitian's workspace. With no session (login page,
 * tests) the sample workspace is used.
 */
export function workspaceKeyFor(session: AppSession | null): string {
  if (!session || isSampleSession(session)) return SAMPLE_WORKSPACE;
  if (session.role === 'member') return session.workspace ?? SAMPLE_WORKSPACE;
  return session.email.trim().toLocaleLowerCase('tr');
}

/**
 * Local persistence for a workspace until MainAPI (`/api/v1/diet`) is wired in. The sample
 * workspace is never written: it is rebuilt from the seed on every load.
 */
export function loadWorkspacePart<T>(key: string, part: string): T | null {
  if (key === SAMPLE_WORKSPACE) return null;
  try {
    return JSON.parse(localStorage.getItem(`${PREFIX}${key}:${part}`) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

export function saveWorkspacePart(key: string, part: string, data: unknown): void {
  if (key === SAMPLE_WORKSPACE) return;
  try {
    localStorage.setItem(`${PREFIX}${key}:${part}`, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the data stays in memory for this visit.
  }
}

/** Every locally saved workspace (used for member login without Firebase). */
export function savedWorkspaces(): string[] {
  const keys = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      const match = name?.startsWith(PREFIX) ? name.slice(PREFIX.length).split(':')[0] : null;
      if (match) keys.add(match);
    }
  } catch {
    // ignore
  }
  return [...keys];
}
