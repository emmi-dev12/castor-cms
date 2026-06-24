import type { PageSchema, SlotValue, DesignTokens } from '@castor/types';
import { loadTemplate } from '../ingest/template.js';

/**
 * Pure function: injects current slot values into the frozen template,
 * applies design token CSS vars, and returns a complete HTML string.
 * All slot values are HTML-escaped before injection to prevent XSS.
 */
export function renderStaticPage(
  page: PageSchema,
  designTokens: DesignTokens,
  dataRoot?: string,
): string {
  const template = loadTemplate(page.templateId, dataRoot);

  // Build token CSS
  const tokenCss = buildTokenCss(designTokens);

  let html = template;

  // Substitute each slot placeholder
  for (const [slotId, descriptor] of Object.entries(page.slots)) {
    const placeholder = `{{slot:${slotId}}}`;
    const value = descriptor.currentValue;
    const replacement = renderSlotValue(value);
    // Replace all occurrences (global)
    html = html.split(placeholder).join(replacement);
  }

  // Inject token CSS into <head>
  html = html.replace(
    '</head>',
    `<style id="cms-design-tokens">${tokenCss}</style>\n</head>`,
  );

  // Verify no unresolved placeholders remain
  const remaining = html.match(/\{\{slot:[a-f0-9]+\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved slot placeholders after render: ${remaining.join(', ')}`);
  }

  return html;
}

function renderSlotValue(value: SlotValue): string {
  if (value.type === 'text') return escHtml(value.value);
  if (value.type === 'image') return escAttr(value.src);
  if (value.type === 'link') return escAttr(value.href);
  return '';
}

function buildTokenCss(tokens: DesignTokens): string {
  const vars: string[] = [];
  tokens.colors.forEach((color, i) => vars.push(`--color-${i}:${color}`));
  tokens.fonts.forEach((font, i) => vars.push(`--font-${i}:${font}`));
  const spacingMap: Record<string, string> = {
    Compact: '0.5rem',
    Normal: '1rem',
    Airy: '1.75rem',
  };
  // Use the last preset as the active spacing
  const activeSpacing = tokens.spacingPresets[tokens.spacingPresets.length - 1];
  if (activeSpacing) vars.push(`--spacing:${spacingMap[activeSpacing] ?? '1rem'}`);
  return `:root{${vars.join(';')}}`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
