import type { PageSchema, Changeset, SlotDescriptor } from '@castor/types';
import { callLLM } from './provider.js';

function buildSystemPrompt(page: PageSchema): string {
  const visibleSlots = Object.values(page.slots).filter(
    (s) => s.visibility !== 'frozen' && s.status === 'active',
  );

  const slotDescriptions = visibleSlots
    .map((s) => {
      const val = s.currentValue;
      const current =
        val.type === 'text' ? val.value :
        val.type === 'link' ? `${val.label} (${val.href})` :
        val.src;
      const constraint = s.constraints.maxLength ? ` [max ${s.constraints.maxLength} chars]` : '';
      return `  - slotId: "${s.slotId}", type: "${s.type}", current: ${JSON.stringify(current)}${constraint}`;
    })
    .join('\n');

  return `You are a content editor assistant for a website CMS. The user will ask you to update website content.

You MUST respond with ONLY a valid JSON object in this exact format — no prose, no markdown, no explanation:
{"changes": {"<slotId>": <newValue>, ...}}

Where each <newValue> matches the slot's type:
- text slot: a string value
- link slot: {"href": "...", "label": "..."}
- image slot: {"src": "...", "alt": "..."}

Only include slots you are changing. Do not change slots the user did not ask about.
Do not invent new slot IDs. Only use IDs from the list below.

Available slots for page "${page.title}" (${page.url}):
${slotDescriptions}

Rules:
- Never return empty string for required slots
- Keep URLs valid and absolute
- Stay within character limits
- Do not add HTML tags or script content`;
}

export interface AISuggestion {
  changes: Changeset;
  provider: string;
  rawResponse: string;
}

export async function generateSuggestion(
  page: PageSchema,
  userPrompt: string,
): Promise<AISuggestion> {
  const systemPrompt = buildSystemPrompt(page);

  const { text, provider } = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // Parse the JSON response — strict: no fallback, no retry
  let parsed: { changes: Record<string, unknown> };
  try {
    // Strip any accidental markdown code fences
    const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    parsed = JSON.parse(clean) as { changes: Record<string, unknown> };
  } catch {
    throw new Error(`LLM returned malformed JSON: ${text.slice(0, 200)}`);
  }

  if (!parsed.changes || typeof parsed.changes !== 'object') {
    throw new Error('LLM response missing "changes" key');
  }

  // Normalise text slots: LLM may return bare string, wrap it
  const changes: Changeset = {};
  for (const [slotId, value] of Object.entries(parsed.changes)) {
    const descriptor: SlotDescriptor | undefined = page.slots[slotId];
    if (!descriptor) continue; // silently drop hallucinated slot IDs

    if (descriptor.type === 'text' && typeof value === 'string') {
      changes[slotId] = { type: 'text', value };
    } else if (
      descriptor.type === 'link' &&
      typeof value === 'object' &&
      value !== null &&
      'href' in value
    ) {
      changes[slotId] = {
        type: 'link',
        href: String((value as Record<string,unknown>)['href'] ?? ''),
        label: String((value as Record<string,unknown>)['label'] ?? ''),
      };
    } else if (
      descriptor.type === 'image' &&
      typeof value === 'object' &&
      value !== null &&
      'src' in value
    ) {
      changes[slotId] = {
        type: 'image',
        src: String((value as Record<string,unknown>)['src'] ?? ''),
        alt: String((value as Record<string,unknown>)['alt'] ?? ''),
      };
    }
  }

  return { changes, provider, rawResponse: text };
}
