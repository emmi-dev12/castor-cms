import type {
  SiteConfig,
  PageSchema,
  PageVersion,
  PublishSnapshot,
  IngestJob,
  AuditEntry,
} from '@castor/types';
import type { StorageAdapter } from '../adapter.js';
import {
  SiteModel,
  PageModel,
  VersionModel,
  PublishModel,
  IngestJobModel,
  AuditModel,
} from './models.js';

function strip<T>(doc: T | null): T | null {
  if (!doc) return null;
  // Convert Mongoose document to plain object
  return JSON.parse(JSON.stringify(doc)) as T;
}

export class MongoAdapter implements StorageAdapter {
  // ── Sites ─────────────────────────────────────────────────────────────────

  async getSite(siteId: string): Promise<SiteConfig | null> {
    return strip(await SiteModel.findOne({ siteId }).lean());
  }

  async saveSite(site: SiteConfig): Promise<void> {
    await SiteModel.findOneAndUpdate({ siteId: site.siteId }, site, {
      upsert: true,
      new: true,
    });
  }

  async listSites(): Promise<SiteConfig[]> {
    const docs = await SiteModel.find().lean();
    return docs.map((d) => JSON.parse(JSON.stringify(d)) as SiteConfig);
  }

  // ── Pages ─────────────────────────────────────────────────────────────────

  async getPage(siteId: string, pageId: string): Promise<PageSchema | null> {
    return strip(await PageModel.findOne({ siteId, pageId }).lean());
  }

  async savePage(page: PageSchema): Promise<void> {
    await PageModel.findOneAndUpdate({ siteId: page.siteId, pageId: page.pageId }, page, {
      upsert: true,
      new: true,
    });
  }

  async listPages(siteId: string): Promise<PageSchema[]> {
    const docs = await PageModel.find({ siteId }).lean();
    return docs.map((d) => JSON.parse(JSON.stringify(d)) as PageSchema);
  }

  // ── Versions ──────────────────────────────────────────────────────────────

  async saveVersion(siteId: string, pageId: string, version: PageVersion): Promise<void> {
    await VersionModel.findOneAndUpdate(
      { siteId, pageId, version: version.version },
      { ...version, siteId, pageId },
      { upsert: true, new: true },
    );
  }

  async getVersion(
    siteId: string,
    pageId: string,
    version: number,
  ): Promise<PageVersion | null> {
    return strip(await VersionModel.findOne({ siteId, pageId, version }).lean());
  }

  async listVersions(siteId: string, pageId: string): Promise<PageVersion[]> {
    const docs = await VersionModel.find({ siteId, pageId }).sort({ version: 1 }).lean();
    return docs.map((d) => JSON.parse(JSON.stringify(d)) as PageVersion);
  }

  // ── Publishes ─────────────────────────────────────────────────────────────

  async savePublish(snapshot: PublishSnapshot): Promise<void> {
    await PublishModel.findOneAndUpdate({ publishId: snapshot.publishId }, snapshot, {
      upsert: true,
      new: true,
    });
  }

  async getPublish(siteId: string, publishId: string): Promise<PublishSnapshot | null> {
    return strip(await PublishModel.findOne({ siteId, publishId }).lean());
  }

  async listPublishes(siteId: string, pageId: string): Promise<PublishSnapshot[]> {
    const docs = await PublishModel.find({ siteId, pageId }).sort({ ts: -1 }).lean();
    return docs.map((d) => JSON.parse(JSON.stringify(d)) as PublishSnapshot);
  }

  // ── Ingest jobs ───────────────────────────────────────────────────────────

  async saveIngestJob(job: IngestJob): Promise<void> {
    await IngestJobModel.findOneAndUpdate({ ingestId: job.ingestId }, job, {
      upsert: true,
      new: true,
    });
  }

  async getIngestJob(ingestId: string): Promise<IngestJob | null> {
    return strip(await IngestJobModel.findOne({ ingestId }).lean());
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  async appendAudit(entry: AuditEntry): Promise<void> {
    await AuditModel.create({ ...entry });
  }

  async listAudit(siteId: string, limit: number, offset: number): Promise<AuditEntry[]> {
    const docs = await AuditModel.find({ siteId })
      .sort({ ts: 1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return docs.map((d) => JSON.parse(JSON.stringify(d)) as AuditEntry);
  }
}
