import fs from 'fs';
import path from 'path';

function bundlesDir(): string {
  return path.resolve(process.env['CMS_DATA_ROOT'] ?? process.cwd(), 'data', 'bundles');
}

/** Persist rendered HTML keyed by publishId. */
export function storeBundle(publishId: string, html: string): void {
  const dir = bundlesDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${publishId}.html`), html, 'utf8');
}

/** Retrieve a previously stored bundle. Returns null if not found. */
export function loadBundle(publishId: string): string | null {
  const filePath = path.join(bundlesDir(), `${publishId}.html`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}
