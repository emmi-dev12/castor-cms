import fs from 'fs';
import path from 'path';
import type {
  SiteConfig,
  PageSchema,
  PageVersion,
  PublishSnapshot,
  IngestJob,
  AuditEntry,
} from '@castor/types';
import type { StorageAdapter } from './adapter.js';

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export class FilesystemAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(dataRoot?: string) {
    this.root = dataRoot ?? path.resolve(process.env['CMS_DATA_ROOT'] ?? process.cwd(), 'data');
  }

  private sitePath(siteId: string): string {
    return path.join(this.root, 'sites', siteId);
  }

  // ── Sites ─────────────────────────────────────────────────────────────────

  async getSite(siteId: string): Promise<SiteConfig | null> {
    return readJson<SiteConfig>(path.join(this.sitePath(siteId), 'site.json'));
  }

  async saveSite(site: SiteConfig): Promise<void> {
    writeJson(path.join(this.sitePath(site.siteId), 'site.json'), site);
  }

  async listSites(): Promise<SiteConfig[]> {
    const sitesDir = path.join(this.root, 'sites');
    if (!fs.existsSync(sitesDir)) return [];
    const entries = fs.readdirSync(sitesDir, { withFileTypes: true });
    const sites: SiteConfig[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const site = await this.getSite(entry.name);
      if (site) sites.push(site);
    }
    return sites;
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  async getPage(siteId: string, pageId: string): Promise<PageSchema | null> {
    return readJson<PageSchema>(
      path.join(this.sitePath(siteId), 'pages', pageId, 'page.json'),
    );
  }

  async savePage(page: PageSchema): Promise<void> {
    writeJson(
      path.join(this.sitePath(page.siteId), 'pages', page.pageId, 'page.json'),
      page,
    );
  }

  async listPages(siteId: string): Promise<PageSchema[]> {
    const pagesDir = path.join(this.sitePath(siteId), 'pages');
    if (!fs.existsSync(pagesDir)) return [];
    const entries = fs.readdirSync(pagesDir, { withFileTypes: true });
    const pages: PageSchema[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const page = await this.getPage(siteId, entry.name);
      if (page) pages.push(page);
    }
    return pages;
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  async saveVersion(siteId: string, pageId: string, version: PageVersion): Promise<void> {
    writeJson(
      path.join(this.sitePath(siteId), 'pages', pageId, 'versions', `v${version.version}.json`),
      version,
    );
  }

  async getVersion(siteId: string, pageId: string, version: number): Promise<PageVersion | null> {
    return readJson<PageVersion>(
      path.join(this.sitePath(siteId), 'pages', pageId, 'versions', `v${version}.json`),
    );
  }

  async listVersions(siteId: string, pageId: string): Promise<PageVersion[]> {
    const dir = path.join(this.sitePath(siteId), 'pages', pageId, 'versions');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson<PageVersion>(path.join(dir, f)))
      .filter((v): v is PageVersion => v !== null)
      .sort((a, b) => a.version - b.version);
  }

  // ── Publishes ─────────────────────────────────────────────────────────────

  async savePublish(snapshot: PublishSnapshot): Promise<void> {
    writeJson(
      path.join(this.sitePath(snapshot.siteId), 'publishes', `${snapshot.publishId}.json`),
      snapshot,
    );
  }

  async getPublish(siteId: string, publishId: string): Promise<PublishSnapshot | null> {
    return readJson<PublishSnapshot>(
      path.join(this.sitePath(siteId), 'publishes', `${publishId}.json`),
    );
  }

  async listPublishes(siteId: string, pageId: string): Promise<PublishSnapshot[]> {
    const dir = path.join(this.sitePath(siteId), 'publishes');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson<PublishSnapshot>(path.join(dir, f)))
      .filter((s): s is PublishSnapshot => s !== null && s.pageId === pageId)
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }

  // ── Ingest jobs ───────────────────────────────────────────────────────────

  async saveIngestJob(job: IngestJob): Promise<void> {
    writeJson(path.join(this.root, 'ingests', `${job.ingestId}.json`), job);
  }

  async getIngestJob(ingestId: string): Promise<IngestJob | null> {
    return readJson<IngestJob>(path.join(this.root, 'ingests', `${ingestId}.json`));
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  async appendAudit(entry: AuditEntry): Promise<void> {
    const filePath = path.join(this.sitePath(entry.siteId), 'audit.log');
    ensureDir(path.dirname(filePath));
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
  }

  async listAudit(siteId: string, limit: number, offset: number): Promise<AuditEntry[]> {
    const filePath = path.join(this.sitePath(siteId), 'audit.log');
    if (!fs.existsSync(filePath)) return [];
    const lines = fs
      .readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as AuditEntry);
    return lines.slice(offset, offset + limit);
  }
}
