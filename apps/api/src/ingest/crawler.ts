import { URL } from 'url';

export interface CrawledPage {
  url: string;
  html: string;
  screenshot: Buffer;
  boundingBoxes: Record<string, BoundingBox>;
}

export interface BoundingBox {
  x: number; y: number; w: number; h: number; cx: number; cy: number;
}

const CRAWLABLE_TAGS = ['p','h1','h2','h3','h4','h5','h6','span','li','td','th','a','button','img','label'];

async function launchBrowser() {
  const isLinux = process.platform === 'linux';
  if (isLinux) {
    // Use sparticuz/chromium on Linux servers (Render, Railway, etc.)
    const chromium = await import('@sparticuz/chromium');
    const puppeteer = await import('puppeteer-core');
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }
  // Local Mac/Windows — use bundled puppeteer
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function fetchFallback(url: string): Promise<CrawledPage> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CastorBot/1.0)' } });
  const html = await res.text();
  return { url, html, screenshot: Buffer.alloc(0), boundingBoxes: {} };
}

export async function crawlSite(
  rootUrl: string,
  maxDepth: number,
  onProgress?: (url: string, depth: number) => void,
): Promise<CrawledPage[]> {
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;

  try {
    browser = await launchBrowser();
  } catch (err) {
    console.warn('[crawler] Puppeteer launch failed, falling back to fetch:', err);
  }

  if (!browser) {
    // Pure fetch fallback — no screenshots or bounding boxes
    const result = await fetchFallback(rootUrl);
    return [result];
  }

  const rootOrigin = new URL(rootUrl).origin;
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl, depth: 0 }];
  const results: CrawledPage[] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = await browser.newPage() as any;
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

        // Capture bounding boxes
        const boxes: Record<string, BoundingBox> = {};
        const elements = await page.$$(CRAWLABLE_TAGS.join(', '));
        for (let i = 0; i < elements.length; i++) {
          const rect = await elements[i]!.boundingBox();
          if (!rect || rect.width === 0) continue;
          boxes[`el-${i}`] = { x: rect.x, y: rect.y, w: rect.width, h: rect.height, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 };
        }

        results.push({ url: item.url, html, screenshot, boundingBoxes: boxes });

        if (item.depth < maxDepth) {
          const hrefs: string[] = await page.$$eval('a[href]', (els: HTMLAnchorElement[]) => els.map((a: HTMLAnchorElement) => a.href));
          for (const href of hrefs) {
            try {
              const u = new URL(href);
              if (u.origin !== rootOrigin) continue;
              u.hash = '';
              const clean = u.toString();
              if (!visited.has(clean)) queue.push({ url: clean, depth: item.depth + 1 });
            } catch { /* skip malformed */ }
          }
        }
      } catch (err) {
        console.error(`[crawler] Failed ${item.url}:`, err);
        // Fallback to fetch for this URL
        try {
          results.push(await fetchFallback(item.url));
        } catch { /* skip */ }
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
