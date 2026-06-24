// API_URL is for server-side (Server Actions, RSC). NEXT_PUBLIC_API_URL is baked in at build for client.
const API_BASE = process.env['API_URL'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    ownerLogin: (masterKey: string) =>
      request<{ token: string }>('/api/auth/owner', {
        method: 'POST',
        body: JSON.stringify({ masterKey }),
      }),
    clientLogin: (siteId: string, password: string) =>
      request<{ token: string }>('/api/auth/client', {
        method: 'POST',
        body: JSON.stringify({ siteId, password }),
      }),
    generateEditorLink: (siteId: string, token: string) =>
      request<{ token: string; editorUrl: string }>('/api/auth/editor-link', {
        method: 'POST',
        body: JSON.stringify({ siteId }),
      }, token),
  },

  sites: {
    list: (token: string) =>
      request<import('@castor/types').SiteConfig[]>('/api/sites', {}, token),
    get: (siteId: string, token: string) =>
      request<import('@castor/types').SiteConfig>(`/api/sites/${siteId}`, {}, token),
    create: (data: { name: string; rootUrl: string; clientPassword: string }, token: string) =>
      request<import('@castor/types').SiteConfig>('/api/sites', {
        method: 'POST',
        body: JSON.stringify(data),
      }, token),
  },

  pages: {
    list: (siteId: string, token: string) =>
      request<import('@castor/types').PageSchema[]>(`/api/sites/${siteId}/pages`, {}, token),
    get: (siteId: string, pageId: string, token: string) =>
      request<import('@castor/types').PageSchema>(`/api/sites/${siteId}/pages/${pageId}`, {}, token),
    updateContent: (siteId: string, pageId: string, changeset: import('@castor/types').Changeset, token: string) =>
      request<{ approved: boolean; version: number; rejections?: import('@castor/types').RejectionDetail[] }>(
        `/api/sites/${siteId}/pages/${pageId}/content`,
        { method: 'PATCH', body: JSON.stringify(changeset) },
        token,
      ),
    listVersions: (siteId: string, pageId: string, token: string) =>
      request<import('@castor/types').PageVersion[]>(`/api/sites/${siteId}/pages/${pageId}/versions`, {}, token),
    rollback: (siteId: string, pageId: string, version: number, token: string) =>
      request<{ ok: boolean; newVersion: number }>(
        `/api/sites/${siteId}/pages/${pageId}/versions/${version}/rollback`,
        { method: 'POST' },
        token,
      ),
    setSlotVisibility: (siteId: string, pageId: string, slotId: string, visibility: string, token: string) =>
      request<{ ok: boolean }>(
        `/api/sites/${siteId}/pages/${pageId}/slots/${slotId}/visibility`,
        { method: 'PATCH', body: JSON.stringify({ visibility }) },
        token,
      ),
    confirmCuration: (siteId: string, pageId: string, token: string) =>
      request<{ ok: boolean; status: string }>(
        `/api/sites/${siteId}/pages/${pageId}/curate`,
        { method: 'POST' },
        token,
      ),
  },

  ai: {
    suggest: (siteId: string, pageId: string, prompt: string, token: string) =>
      request<{
        suggestion: import('@castor/types').Changeset;
        provider: string;
        validation: import('@castor/types').ValidationResult;
      }>(`/api/sites/${siteId}/pages/${pageId}/ai-suggest`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }, token),
  },

  publish: {
    publish: (siteId: string, pageId: string, token: string) =>
      request<import('@castor/types').PublishSnapshot>(
        `/api/sites/${siteId}/pages/${pageId}/publish`,
        { method: 'POST' },
        token,
      ),
  },
};
