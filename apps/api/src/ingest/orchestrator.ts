import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { crawlSite } from './crawler.js';
import { extractSlots } from './slot-id.js';
import { buildTemplate, storeTemplate } from './template.js';
import type { StorageAdapter } from '../storage/adapter.js';
import type { IngestJob, PageSchema, SiteConfig } from '@castor/types';

function dataRoot(): string {
  return path.resolve(process.env['CMS_DATA_ROOT'] ?? process.cwd(), 'data');
}

function ingestDir(siteId: string, ingestId: string): string {
  return path.join(dataRoot(), 'sites', siteId, 'ingests', ingestId);
}

/** Save raw HTML and screenshot immutably under sites/<siteId>/ingests/<ingestId>/ */
function persistRaw(siteId: string, ingestId: string, url: string, html: string, screenshot: Buffer): void {
  const dir = ingestDir(siteId, ingestId);
  fs.mkdirSync(dir, { recursive: true });
  const urlHash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(dir, `${urlHash}.html`), html, 'utf8');
  fs.writeFileSync(path.join(dir, `${urlHash}.png`), screenshot);
}

export async function runIngest(
  storage: StorageAdapter,
  site: SiteConfig,
  rootUrl: string,
  depth: number,
  preassignedId?: string,
): Promise<IngestJob> {
  const ingestId = preassignedId ?? uuid();
  const job: IngestJob = {
    ingestId,
    siteId: site.siteId,
    rootUrl,
    depth,
    status: 'running',
    pagesDiscovered: 0,
    createdAt: new Date().toISOString(),
  };
  await storage.saveIngestJob(job);

  try {
    const crawled = await crawlSite(rootUrl, depth, (url, d) => {
      console.log(`[ingest] crawling depth=${d} ${url}`);
    });

    job.pagesDiscovered = crawled.length;

    // Load existing pages once to de-duplicate by URL
    const existingPages = await storage.listPages(site.siteId);
    const pageByUrl = new Map(existingPages.map(p => [p.url, p]));

    for (const cp of crawled) {
      persistRaw(site.siteId, ingestId, cp.url, cp.html, cp.screenshot);

      const slots = extractSlots(cp.html, cp.boundingBoxes);
      const { templateId, templateHtml } = buildTemplate(cp.html, slots);
      await storeTemplate(templateId, templateHtml);

      const slotMap: PageSchema['slots'] = {};
      for (const { descriptor } of slots) {
        slotMap[descriptor.slotId] = descriptor;
      }

      const existing = pageByUrl.get(cp.url);
      const page: PageSchema = existing
        ? {
            ...existing,
            title: extractTitle(cp.html),
            templateId,
            slots: slotMap,
            updatedAt: new Date().toISOString(),
          }
        : {
            pageId: uuid(),
            siteId: site.siteId,
            url: cp.url,
            title: extractTitle(cp.html),
            templateId,
            slots: slotMap,
            status: 'active',
            currentVersion: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      await storage.savePage(page);
    }

    job.status = 'complete';
    job.completedAt = new Date().toISOString();
  } catch (err) {
    job.status = 'failed';
    job.error = String(err);
    job.completedAt = new Date().toISOString();
  }

  await storage.saveIngestJob(job);
  return job;
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : 'Untitled';
}
