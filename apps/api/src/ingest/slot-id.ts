import crypto from 'crypto';
import { load } from 'cheerio';
import type { AnyNode, Element, Text } from 'domhandler';
import type { SlotDescriptor, SlotType, SlotValue, FallbackDescriptor } from '@castor/types';
import type { BoundingBox } from './crawler.js';

// ─── XPath builder ─────────────────────────────────────────────────────────

function buildXPath($: ReturnType<typeof load>, el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node.type === 'tag') {
    const parent = node.parent as Element | null;
    if (!parent) break;

    const siblings = (parent.children ?? []).filter(
      (c: AnyNode): c is Element => c.type === 'tag' && (c as Element).name === node!.name,
    );
    const idx = siblings.indexOf(node) + 1;
    parts.unshift(siblings.length === 1 ? node.name : `${node.name}[${idx}]`);
    node = parent.type === 'tag' ? parent : null;
  }

  return '/' + parts.join('/');
}

// ─── Stable primary ID ─────────────────────────────────────────────────────

function primaryId(xpath: string, tagName: string, contentSample: string): string {
  const raw = `${xpath}::${tagName}::${contentSample.trim().slice(0, 64)}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

// ─── Fallback 1: sibling heuristic key ────────────────────────────────────

function siblingKey(el: Element): string {
  const parent = el.parent as Element | null;
  if (!parent) return `${el.name}:0`;
  const siblings = (parent.children ?? []).filter(
    (c: AnyNode): c is Element => c.type === 'tag',
  );
  const idx = siblings.indexOf(el);
  const textLen = textContent(el).length;
  const bucket = textLen < 20 ? 'xs' : textLen < 80 ? 'sm' : textLen < 300 ? 'md' : 'lg';
  return `${(parent as Element).name ?? 'root'}>${el.name}[${idx}]:${bucket}`;
}

// ─── Text content helper ───────────────────────────────────────────────────

function textContent(el: Element): string {
  const text: string[] = [];
  function walk(node: AnyNode) {
    if (node.type === 'text') text.push((node as Text).data);
    if ('children' in node) node.children?.forEach(walk);
  }
  walk(el);
  return text.join('').trim();
}

// ─── Slot type detection ───────────────────────────────────────────────────

function detectType(el: Element): SlotType | null {
  if (el.name === 'img') return 'image';
  if (el.name === 'a') return 'link';
  if (el.name === 'button') return 'text';
  const TEXT_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'li', 'td', 'th', 'label', 'strong', 'em', 'b', 'i']);
  if (TEXT_TAGS.has(el.name) && textContent(el).length > 0) return 'text';
  return null;
}

// ─── Extract slot value ────────────────────────────────────────────────────

function extractValue(el: Element, $: ReturnType<typeof load>): SlotValue | null {
  const type = detectType(el);
  if (!type) return null;

  if (type === 'image') {
    const src = el.attribs['src'] ?? '';
    const alt = el.attribs['alt'] ?? '';
    return { type: 'image', src, alt };
  }

  if (type === 'link') {
    const href = el.attribs['href'] ?? '';
    const label = textContent(el) || href;
    return { type: 'link', href, label };
  }

  const text = textContent(el);
  if (!text) return null;
  return { type: 'text', value: text };
}

// ─── Structural containers to skip ────────────────────────────────────────

const STRUCTURAL = new Set([
  'html', 'head', 'body', 'div', 'section', 'article', 'main', 'aside',
  'nav', 'header', 'footer', 'form', 'ul', 'ol', 'table', 'thead', 'tbody',
  'tfoot', 'tr', 'figure', 'figcaption', 'script', 'style', 'noscript', 'meta',
  'link', 'title', 'iframe', 'svg', 'path',
]);

// ─── Main extraction ───────────────────────────────────────────────────────

export interface ExtractedSlot {
  descriptor: SlotDescriptor;
  /** placeholder token for template substitution */
  placeholder: string;
}

export function extractSlots(
  html: string,
  boundingBoxes: Record<string, BoundingBox> = {},
): ExtractedSlot[] {
  const $ = load(html);
  const slots: ExtractedSlot[] = [];
  const seenIds = new Set<string>();

  // We walk in document order using cheerio's .find()
  $('*').each((_i, node) => {
    if (node.type !== 'tag') return;
    const el = node as Element;
    if (STRUCTURAL.has(el.name)) return;

    // Skip elements that only contain other slot-eligible children (wrappers)
    const directText = (el.children ?? [])
      .filter((c: AnyNode): c is Text => c.type === 'text')
      .map((c: Text) => c.data.trim())
      .join('');

    const type = detectType(el);
    if (!type) return;

    const value = extractValue(el, $);
    if (!value) return;

    const xpath = buildXPath($, el);
    const contentSample =
      type === 'text' ? (value as { value: string }).value :
      type === 'link' ? (value as { href: string; label: string }).label :
      (value as { src: string }).src;

    const slotId = primaryId(xpath, el.name, contentSample);
    if (seenIds.has(slotId)) return;
    seenIds.add(slotId);

    // Fallback 2: find bounding box by index (best effort)
    const bboxKey = `el-${slots.length}`;
    const bbox = boundingBoxes[bboxKey];

    const fallback: FallbackDescriptor = {
      siblingKey: siblingKey(el),
      bbox: bbox ? { cx: bbox.cx, cy: bbox.cy, w: bbox.w, h: bbox.h } : undefined,
      textSample: contentSample.slice(0, 50),
    };

    const descriptor: SlotDescriptor = {
      slotId,
      type,
      xpath,
      tagName: el.name,
      originalValue: value,
      currentValue: value,
      constraints: {
        required: type !== 'image',
        maxLength: type === 'text' ? 2000 : undefined,
      },
      fallback,
      visibility: 'client-visible',
      status: 'active',
    };

    slots.push({ descriptor, placeholder: `{{slot:${slotId}}}` });
  });

  return slots;
}

// ─── Re-identification (used by slot invariance check) ─────────────────────

export type ReidentifyResult =
  | { found: true; slotId: string; method: 'primary' | 'fallback1' | 'fallback2' }
  | { found: false };

/** Try to re-find a slot in freshly-parsed HTML using the stored descriptor. */
export function reidentifySlot(
  descriptor: SlotDescriptor,
  freshHtml: string,
  freshBboxes: Record<string, BoundingBox> = {},
): ReidentifyResult {
  const $ = load(freshHtml);

  // Primary: match by XPath → regenerate ID and compare
  const freshSlots = extractSlots(freshHtml, freshBboxes);
  const primaryMatch = freshSlots.find((s) => s.descriptor.slotId === descriptor.slotId);
  if (primaryMatch) return { found: true, slotId: descriptor.slotId, method: 'primary' };

  // Fallback 1: sibling heuristic key match
  if (descriptor.fallback.siblingKey) {
    const f1Match = freshSlots.find(
      (s) => s.descriptor.fallback.siblingKey === descriptor.fallback.siblingKey,
    );
    if (f1Match) return { found: true, slotId: f1Match.descriptor.slotId, method: 'fallback1' };
  }

  // Fallback 2: bounding-box centroid + text similarity (bbox optional)
  if (descriptor.fallback.textSample) {
    const target = descriptor.fallback.bbox;
    const textTarget = descriptor.fallback.textSample.toLowerCase();

    for (const s of freshSlots) {
      // Type must match
      if (s.descriptor.type !== descriptor.type) continue;

      // If both have bboxes, check spatial proximity first
      const bbox = s.descriptor.fallback.bbox;
      if (target && bbox) {
        const dx = Math.abs(bbox.cx - target.cx) / (target.w || 1);
        const dy = Math.abs(bbox.cy - target.cy) / (target.h || 1);
        if (dx > 0.05 || dy > 0.05) continue;
      }

      // Text similarity (works with or without bbox)
      const textFresh = (s.descriptor.fallback.textSample ?? '').toLowerCase();
      const sim = levenshteinSimilarity(textFresh, textTarget);
      if (sim >= 0.8) {
        return { found: true, slotId: s.descriptor.slotId, method: 'fallback2' };
      }
    }
  }

  return { found: false };
}

// ─── Levenshtein similarity ────────────────────────────────────────────────

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
