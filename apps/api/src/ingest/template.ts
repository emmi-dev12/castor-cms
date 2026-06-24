import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import type { Element } from 'domhandler';
import type { ExtractedSlot } from './slot-id.js';

function templatesRoot(): string {
  return path.resolve(process.env['CMS_DATA_ROOT'] ?? process.cwd(), 'data', 'templates');
}

/**
 * Given raw HTML and extracted slots, replaces every slot's DOM node inner
 * content with a {{slot:ID}} placeholder and returns a frozen template string.
 * The template is stored immutably (addressed by its SHA-256 hash).
 * Returns the templateId (hash).
 */
export function buildTemplate(html: string, slots: ExtractedSlot[]): {
  templateId: string;
  templateHtml: string;
} {
  const $ = load(html);

  // Build a lookup: xpath → placeholder
  const xpathToPlaceholder = new Map<string, string>(
    slots.map((s) => [s.descriptor.xpath, s.placeholder]),
  );

  $('*').each((_i, node) => {
    if (node.type !== 'tag') return;
    const xpath = buildXPathForTemplate($, node as Element);
    const placeholder = xpathToPlaceholder.get(xpath);
    if (!placeholder) return;

    const el = node as Element;
    if (el.name === 'img') {
      el.attribs['src'] = placeholder;
      el.attribs['alt'] = `{{slot-alt:${el.attribs['src']?.replace('{{slot:', '').replace('}}', '')}}}`;
    } else if (el.name === 'a') {
      el.attribs['href'] = `${placeholder}-href`;
      $(el).text(placeholder);
    } else {
      $(el).text(placeholder);
    }
  });

  const templateHtml = $.html();
  const templateId = crypto.createHash('sha256').update(templateHtml).digest('hex');

  return { templateId, templateHtml };
}

function buildXPathForTemplate(
  $: ReturnType<typeof load>,
  el: Element,
): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node.type === 'tag') {
    const parent = node.parent as Element | null;
    if (!parent) break;
    const siblings = (parent.children ?? []).filter(
      (c: import('domhandler').AnyNode): c is Element =>
        c.type === 'tag' && (c as Element).name === node!.name,
    );
    const idx = siblings.indexOf(node) + 1;
    parts.unshift(siblings.length === 1 ? node.name : `${node.name}[${idx}]`);
    node = parent.type === 'tag' ? parent : null;
  }

  return '/' + parts.join('/');
}

/** Store a template immutably. Throws if a different template is submitted with the same hash. */
export function storeTemplate(
  templateId: string,
  templateHtml: string,
  dataRoot?: string,
): void {
  const root = dataRoot ?? templatesRoot();
  fs.mkdirSync(root, { recursive: true });
  const filePath = path.join(root, `${templateId}.html`);

  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing !== templateHtml) {
      throw new Error(
        `Template hash collision: ${templateId} already exists with different content.`,
      );
    }
    return; // idempotent
  }

  fs.writeFileSync(filePath, templateHtml, { encoding: 'utf8', flag: 'wx' });
}

/** Load a stored template by ID. */
export function loadTemplate(templateId: string, dataRoot?: string): string {
  const root = dataRoot ?? templatesRoot();
  const filePath = path.join(root, `${templateId}.html`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${templateId}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
