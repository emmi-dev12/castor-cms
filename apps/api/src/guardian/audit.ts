import type { AuditEntry, Changeset, ValidationResult } from '@castor/types';
import type { StorageAdapter } from '../storage/adapter.js';

const REDACTED_KEYS = new Set(['password', 'masterKey', 'token', 'secret']);

function redactChangeset(changeset: Changeset): Changeset {
  const out: Changeset = {};
  for (const [k, v] of Object.entries(changeset)) {
    if (REDACTED_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export async function logValidation(
  storage: StorageAdapter,
  opts: {
    userId: string;
    role: AuditEntry['role'];
    siteId: string;
    pageId: string;
    action: string;
    changeset: Changeset;
    result: ValidationResult;
  },
): Promise<void> {
  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    userId: opts.userId,
    role: opts.role,
    siteId: opts.siteId,
    pageId: opts.pageId,
    action: opts.action,
    result: opts.result.approved ? 'approved' : 'rejected',
    rejections: opts.result.approved ? undefined : opts.result.rejections,
  };
  await storage.appendAudit(entry);
}

export async function logPublish(
  storage: StorageAdapter,
  opts: {
    userId: string;
    role: AuditEntry['role'];
    siteId: string;
    pageId: string;
    publishId: string;
    deployUrl: string;
  },
): Promise<void> {
  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    userId: opts.userId,
    role: opts.role,
    siteId: opts.siteId,
    pageId: opts.pageId,
    action: `publish:${opts.publishId} → ${opts.deployUrl}`,
    result: 'published',
  };
  await storage.appendAudit(entry);
}
