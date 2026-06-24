import type {
  SiteConfig,
  PageSchema,
  PageVersion,
  PublishSnapshot,
  IngestJob,
  AuditEntry,
} from '@castor/types';

export interface StorageAdapter {
  // Sites
  getSite(siteId: string): Promise<SiteConfig | null>;
  saveSite(site: SiteConfig): Promise<void>;
  listSites(): Promise<SiteConfig[]>;

  // Pages
  getPage(siteId: string, pageId: string): Promise<PageSchema | null>;
  savePage(page: PageSchema): Promise<void>;
  listPages(siteId: string): Promise<PageSchema[]>;

  // Versions
  saveVersion(siteId: string, pageId: string, version: PageVersion): Promise<void>;
  getVersion(siteId: string, pageId: string, version: number): Promise<PageVersion | null>;
  listVersions(siteId: string, pageId: string): Promise<PageVersion[]>;

  // Publishes
  savePublish(snapshot: PublishSnapshot): Promise<void>;
  getPublish(siteId: string, publishId: string): Promise<PublishSnapshot | null>;
  listPublishes(siteId: string, pageId: string): Promise<PublishSnapshot[]>;

  // Ingest jobs
  saveIngestJob(job: IngestJob): Promise<void>;
  getIngestJob(ingestId: string): Promise<IngestJob | null>;

  // Audit
  appendAudit(entry: AuditEntry): Promise<void>;
  listAudit(siteId: string, limit: number, offset: number): Promise<AuditEntry[]>;
}
