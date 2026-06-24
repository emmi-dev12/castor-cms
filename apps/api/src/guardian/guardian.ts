import type {
  PageSchema,
  Changeset,
  SlotValue,
  ValidationResult,
  RejectionDetail,
  DesignTokens,
  SlotDescriptor,
} from '@castor/types';
import { SlotValueSchema } from './schemas.js';

// ─── XSS patterns ─────────────────────────────────────────────────────────

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,           // onerror=, onclick=, etc.
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
];

function containsXss(value: string): boolean {
  return XSS_PATTERNS.some((re) => re.test(value));
}

function slotValueStrings(v: SlotValue): string[] {
  if (v.type === 'text') return [v.value];
  if (v.type === 'image') return [v.src, v.alt];
  if (v.type === 'link') return [v.href, v.label];
  return [];
}

// ─── Rule helpers ──────────────────────────────────────────────────────────

function reject(slotId: string, rule: string, message: string): RejectionDetail {
  return { slotId, rule, message };
}

// ─── Main validation ───────────────────────────────────────────────────────

/**
 * Deterministic, synchronous Guardian validation.
 * No AI, no side effects. Returns approved=true only if ALL rules pass.
 */
export function validate(
  page: PageSchema,
  changeset: Changeset,
  designTokens?: DesignTokens,
): ValidationResult {
  const rejections: RejectionDetail[] = [];

  for (const [slotId, newValue] of Object.entries(changeset)) {
    const descriptor: SlotDescriptor | undefined = page.slots[slotId];

    // Rule 1 — slot must exist in schema
    if (!descriptor) {
      rejections.push(reject(slotId, 'UNKNOWN_SLOT', `Slot "${slotId}" does not exist in page schema.`));
      continue;
    }

    // Rule 2 — slot must not be frozen
    if (descriptor.visibility === 'frozen') {
      rejections.push(reject(slotId, 'FROZEN_SLOT', `Slot "${slotId}" is frozen and cannot be edited.`));
      continue;
    }

    // Rule 3 — slot must be active (not undetectable)
    if (descriptor.status === 'undetectable') {
      rejections.push(reject(slotId, 'UNDETECTABLE_SLOT', `Slot "${slotId}" is undetectable; cannot safely apply changes.`));
      continue;
    }

    // Rule 4 — type must match schema
    if (newValue.type !== descriptor.type) {
      rejections.push(reject(slotId, 'TYPE_MISMATCH', `Slot "${slotId}" expects type "${descriptor.type}", got "${newValue.type}".`));
      continue;
    }

    // Rule 5 — cannot empty a previously non-empty required slot
    if (descriptor.constraints.required) {
      const isEmpty =
        (newValue.type === 'text' && !newValue.value.trim()) ||
        (newValue.type === 'image' && !newValue.src.trim()) ||
        (newValue.type === 'link' && !newValue.href.trim() && !newValue.label.trim());
      if (isEmpty) {
        rejections.push(reject(slotId, 'EMPTY_REQUIRED', `Slot "${slotId}" is required and cannot be emptied.`));
        continue;
      }
    }

    // Rule 6 — Zod schema validation (type constraints, maxLength, URL format)
    const parsed = SlotValueSchema.safeParse(newValue);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      rejections.push(reject(slotId, 'SCHEMA_VIOLATION', `Slot "${slotId}": ${msg}`));
      continue;
    }

    // Rule 7 — maxLength constraint from descriptor
    if (newValue.type === 'text' && descriptor.constraints.maxLength !== undefined) {
      if (newValue.value.length > descriptor.constraints.maxLength) {
        rejections.push(reject(slotId, 'MAX_LENGTH', `Slot "${slotId}" exceeds max length of ${descriptor.constraints.maxLength}.`));
        continue;
      }
    }

    // Rule 8 — XSS detection across all string values
    const strings = slotValueStrings(newValue);
    const xssHit = strings.find(containsXss);
    if (xssHit !== undefined) {
      rejections.push(reject(slotId, 'XSS_DETECTED', `Slot "${slotId}" contains a potentially unsafe value.`));
      continue;
    }

    // Rule 9 — Design token enforcement (text slots only: reject unapproved token refs)
    if (designTokens && newValue.type === 'text') {
      const tokenRefPattern = /--[\w-]+/g;
      const refs = newValue.value.match(tokenRefPattern) ?? [];
      const approvedVars = new Set([
        ...designTokens.colors.map((_, i) => `--color-${i}`),
        ...designTokens.fonts.map((_, i) => `--font-${i}`),
        '--spacing-compact', '--spacing-normal', '--spacing-airy',
      ]);
      for (const ref of refs) {
        if (!approvedVars.has(ref)) {
          rejections.push(reject(slotId, 'INVALID_TOKEN', `Slot "${slotId}" references unapproved design token "${ref}".`));
          break;
        }
      }
    }
  }

  return { approved: rejections.length === 0, rejections };
}
