import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { FilesystemAdapter } from '../filesystem.adapter.js';
import type { StorageAdapter } from '../adapter.js';
import type { SiteConfig, PageSchema, PageVersion, AuditEntry } from '@castor/types';

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeSite(overrides: Partial<SiteConfig> = {}): SiteConfig {
  return {
    siteId: 'site-1',
    name: 'Test Site',
    rootUrl: 'https://example.com',
    clientPasswordHash: '$2b$10$hash',
    designTokens: { colors: ['#000'], spacingPresets: ['Normal'], fonts: ['sans-serif'] },
    deployAdapter: 'vercel',
    deployConfig: {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePage(overrides: Partial<PageSchema> = {}): PageSchema {
  return {
    pageId: 'page-1',
    siteId: 'site-1',
    url: 'https://example.com',
    title: 'Home',
    templateId: 'tmpl-abc',
    slots: {},
    status: 'active',
    currentVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeVersion(v = 1): PageVersion {
  return {
    version: v,
    ts: new Date().toISOString(),
    authorId: 'owner',
    slotValues: {},
  };
}

function makeAudit(): AuditEntry {
  return {
    ts: new Date().toISOString(),
    userId: 'owner',
    role: 'owner',
    siteId: 'site-1',
    pageId: 'page-1',
    action: 'save',
    result: 'approved',
  };
}

// ── Shared suite ───────────────────────────────────────────────────────────

function runSuite(label: string, factory: () => StorageAdapter) {
  describe(label, () => {
    let adapter: StorageAdapter;

    beforeEach(() => {
      adapter = factory();
    });

    it('site: save and retrieve', async () => {
      const site = makeSite();
      await adapter.saveSite(site);
      const got = await adapter.getSite('site-1');
      expect(got?.siteId).toBe('site-1');
      expect(got?.name).toBe('Test Site');
    });

    it('site: list', async () => {
      await adapter.saveSite(makeSite({ siteId: 'site-1' }));
      await adapter.saveSite(makeSite({ siteId: 'site-2', name: 'Site 2' }));
      const list = await adapter.listSites();
      expect(list.length).toBe(2);
    });

    it('site: missing returns null', async () => {
      expect(await adapter.getSite('nope')).toBeNull();
    });

    it('page: save and retrieve', async () => {
      await adapter.saveSite(makeSite());
      const page = makePage();
      await adapter.savePage(page);
      const got = await adapter.getPage('site-1', 'page-1');
      expect(got?.pageId).toBe('page-1');
    });

    it('page: list', async () => {
      await adapter.saveSite(makeSite());
      await adapter.savePage(makePage({ pageId: 'p1' }));
      await adapter.savePage(makePage({ pageId: 'p2' }));
      const list = await adapter.listPages('site-1');
      expect(list.length).toBe(2);
    });

    it('version: save, retrieve, list ordered', async () => {
      await adapter.saveSite(makeSite());
      await adapter.savePage(makePage());
      await adapter.saveVersion('site-1', 'page-1', makeVersion(1));
      await adapter.saveVersion('site-1', 'page-1', makeVersion(2));
      await adapter.saveVersion('site-1', 'page-1', makeVersion(3));
      const list = await adapter.listVersions('site-1', 'page-1');
      expect(list.map((v) => v.version)).toEqual([1, 2, 3]);
      const v2 = await adapter.getVersion('site-1', 'page-1', 2);
      expect(v2?.version).toBe(2);
    });

    it('audit: append and list', async () => {
      await adapter.saveSite(makeSite());
      await adapter.appendAudit(makeAudit());
      await adapter.appendAudit({ ...makeAudit(), action: 'publish' });
      const entries = await adapter.listAudit('site-1', 10, 0);
      expect(entries.length).toBe(2);
      expect(entries[0].action).toBe('save');
      expect(entries[1].action).toBe('publish');
    });

    it('audit: pagination', async () => {
      await adapter.saveSite(makeSite());
      for (let i = 0; i < 5; i++) {
        await adapter.appendAudit({ ...makeAudit(), action: `action-${i}` });
      }
      const page1 = await adapter.listAudit('site-1', 2, 0);
      const page2 = await adapter.listAudit('site-1', 2, 2);
      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].action).toBe('action-0');
      expect(page2[0].action).toBe('action-2');
    });
  });
}

// ── Filesystem adapter tests ───────────────────────────────────────────────

describe('FilesystemAdapter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'castor-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  runSuite('FilesystemAdapter', () => new FilesystemAdapter(tmpDir));
});
