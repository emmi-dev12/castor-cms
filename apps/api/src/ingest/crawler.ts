import puppeteer, { type Browser, type Page } from 'puppeteer';
import { URL } from 'url';

export interface CrawledPage {
  url: string;
  html: string;
  screenshot: Buffer;
  /** Bounding boxes for visible elements: { selector → { x, y, w, h } } */
  boundingBoxes: Record<string, BoundingBox>;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Centroid */
  cx: number;
  cy: number;
}

const CRAWLABLE_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'li', 'td', 'th', 'a', 'button', 'img', 'label'];

/** Returns all internal URLs linked from the page, normalised and deduplicated. */
async function extractInternalLinks(page: Page, rootOrigin: string): Promise<string[]> {
  const hrefs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]')).map(
      (a) => (a as HTMLAnchorElement).href,
    ),
  );
  const seen = new Set<string>();
  const links: string[] = [];
  for (const href of hrefs) {
    try {
      const u = new URL(href);
      if (u.origin !== rootOrigin) continue;
      u.hash = '';
      const clean = u.toString();
      if (!seen.has(clean)) {
        seen.add(clean);
        links.push(clean);
      }
    } catch {
      // malformed href — skip
    }
  }
  return links;
}

async function captureBoundingBoxes(page: Page): Promise<Record<string, BoundingBox>> {
  const boxes: Record<string, BoundingBox> = {};
  const elements = await page.$$(CRAWLABLE_TAGS.join(', '));
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const rect = await el.boundingBox();
    if (!rect || rect.width === 0 || rect.height === 0) continue;
    // Use a positional key; slot-ID generation uses this data separately
    const key = `el-${i}`;
    boxes[key] = {
      x: rect.x,
      y: rect.y,
      w: rect.width,
      h: rect.height,
      cx: rect.x + rect.width / 2,
      cy: rect.y + rect.height / 2,
    };
  }
  return boxes;
}

export async function crawlSite(
  rootUrl: string,
  maxDepth: number,
  onProgress?: (url: string, depth: number) => void,
): Promise<CrawledPage[]> {
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const rootOrigin = new URL(rootUrl).origin;
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];
  const results: CrawledPage[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);

      onProgress?.(item.url, item.depth);

      try {
        await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        const html = await page.content();
        const screenshot = await page.screenshot({ type: 'png', fullPage: true }) as Buffer;
        const boundingBoxes = await captureBoundingBoxes(page);

        results.push({ url: item.url, html, screenshot, boundingBoxes });

        if (item.depth < maxDepth) {
          const links = await extractInternalLinks(page, rootOrigin);
          for (const link of links) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: item.depth + 1 });
            }
          }
        }
      } catch (err) {
        console.error(`[crawler] Failed to fetch ${item.url}:`, err);
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
