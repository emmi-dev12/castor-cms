import { describe, it, expect } from 'vitest';
import { validate } from '../guardian.js';
import type { PageSchema, SlotDescriptor, DesignTokens } from '@castor/types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeTextSlot(overrides: Partial<SlotDescriptor> = {}): SlotDescriptor {
  return {
    slotId: 'slot-text',
    type: 'text',
    xpath: '/body/main/p',
    tagName: 'p',
    originalValue: { type: 'text', value: 'Hello world' },
    currentValue: { type: 'text', value: 'Hello world' },
    constraints: { required: true, maxLength: 100 },
    fallback: { siblingKey: 'main>p[0]:sm', textSample: 'Hello world' },
    visibility: 'client-visible',
    status: 'active',
    ...overrides,
  };
}

function makeImageSlot(overrides: Partial<SlotDescriptor> = {}): SlotDescriptor {
  return {
    slotId: 'slot-img',
    type: 'image',
    xpath: '/body/main/img',
    tagName: 'img',
    originalValue: { type: 'image', src: 'https://example.com/img.jpg', alt: 'Hero' },
    currentValue: { type: 'image', src: 'https://example.com/img.jpg', alt: 'Hero' },
    constraints: { required: false },
    fallback: {},
    visibility: 'client-visible',
    status: 'active',
    ...overrides,
  };
}

function makeLinkSlot(overrides: Partial<SlotDescriptor> = {}): SlotDescriptor {
  return {
    slotId: 'slot-link',
    type: 'link',
    xpath: '/body/main/a',
    tagName: 'a',
    originalValue: { type: 'link', href: 'https://example.com', label: 'Learn more' },
    currentValue: { type: 'link', href: 'https://example.com', label: 'Learn more' },
    constraints: { required: true },
    fallback: {},
    visibility: 'client-visible',
    status: 'active',
    ...overrides,
  };
}

function makePage(slots: Record<string, SlotDescriptor> = {}): PageSchema {
  return {
    pageId: 'page-1',
    siteId: 'site-1',
    url: 'https://example.com',
    title: 'Home',
    templateId: 'tmpl-abc',
    slots: slots,
    status: 'active',
    currentVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const tokens: DesignTokens = {
  colors: ['#000', '#fff'],
  spacingPresets: ['Normal'],
  fonts: ['sans-serif'],
};

// ─── Rule 1: Unknown slot ──────────────────────────────────────────────────

describe('Rule 1 — unknown slot', () => {
  it('rejects a slot ID not in schema', () => {
    const page = makePage({ 'slot-text': makeTextSlot() });
    const result = validate(page, { 'nonexistent-slot': { type: 'text', value: 'hi' } });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('UNKNOWN_SLOT');
  });

  it('approves a slot ID that exists', () => {
    const page = makePage({ 'slot-text': makeTextSlot() });
    const result = validate(page, { 'slot-text': { type: 'text', value: 'Updated text' } });
    expect(result.approved).toBe(true);
  });
});

// ─── Rule 2: Frozen slot ───────────────────────────────────────────────────

describe('Rule 2 — frozen slot', () => {
  it('rejects changes to frozen slots', () => {
    const page = makePage({ 'slot-text': makeTextSlot({ visibility: 'frozen' }) });
    const result = validate(page, { 'slot-text': { type: 'text', value: 'Changed' } });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('FROZEN_SLOT');
  });

  it('allows changes to owner-only slots (not frozen)', () => {
    const page = makePage({ 'slot-text': makeTextSlot({ visibility: 'owner-only' }) });
    const result = validate(page, { 'slot-text': { type: 'text', value: 'Owner edit' } });
    expect(result.approved).toBe(true);
  });
});

// ─── Rule 3: Undetectable slot ─────────────────────────────────────────────

describe('Rule 3 — undetectable slot', () => {
  it('rejects changes to undetectable slots', () => {
    const page = makePage({ 'slot-text': makeTextSlot({ status: 'undetectable' }) });
    const result = validate(page, { 'slot-text': { type: 'text', value: 'Changed' } });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('UNDETECTABLE_SLOT');
  });
});

// ─── Rule 4: Type mismatch ─────────────────────────────────────────────────

describe('Rule 4 — type mismatch', () => {
  it('rejects when submitting image value for a text slot', () => {
    const page = makePage({ 'slot-text': makeTextSlot() });
    const result = validate(page, {
      'slot-text': { type: 'image', src: 'https://example.com/img.jpg', alt: 'Alt' },
    });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('TYPE_MISMATCH');
  });

  it('rejects when submitting link value for an image slot', () => {
    const page = makePage({ 'slot-img': makeImageSlot() });
    const result = validate(page, {
      'slot-img': { type: 'link', href: 'https://example.com', label: 'Link' },
    });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('TYPE_MISMATCH');
  });
});

// ─── Rule 5: Empty required slot ──────────────────────────────────────────

describe('Rule 5 — empty required slot', () => {
  it('rejects empty text for required text slot', () => {
    const page = makePage({ 'slot-text': makeTextSlot() });
    const result = validate(page, { 'slot-text': { type: 'text', value: '   ' } });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('EMPTY_REQUIRED');
  });

  it('rejects empty href for required link slot', () => {
    const page = makePage({ 'slot-link': makeLinkSlot() });
    const result = validate(page, { 'slot-link': { type: 'link', href: '', label: '' } });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('EMPTY_REQUIRED');
  });

  it('allows empty alt text on non-required image slot', () => {
    const page = makePage({ 'slot-img': makeImageSlot({ constraints: { required: false } }) });
    const result = validate(page, {
      'slot-img': { type: 'image', src: 'https://example.com/img.jpg', alt: '' },
    });
    expect(result.approved).toBe(true);
  });
});

// ─── Rule 6: Zod schema violation ─────────────────────────────────────────

describe('Rule 6 — Zod schema violation', () => {
  it('rejects malformed image URL', () => {
    const page = makePage({ 'slot-img': makeImageSlot() });
    const result = validate(page, {
      'slot-img': { type: 'image', src: 'not-a-url', alt: 'Alt' },
    });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('SCHEMA_VIOLATION');
  });

  it('rejects malformed link href', () => {
    const page = makePage({ 'slot-link': makeLinkSlot() });
    const result = validate(page, {
      'slot-link': { type: 'link', href: 'not-a-url', label: 'Click' },
    });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('SCHEMA_VIOLATION');
  });

  it('accepts valid https URLs', () => {
    const page = makePage({ 'slot-img': makeImageSlot() });
    const result = validate(page, {
      'slot-img': { type: 'image', src: 'https://cdn.example.com/img.webp', alt: 'Alt' },
    });
    expect(result.approved).toBe(true);
  });
});

// ─── Rule 7: maxLength ─────────────────────────────────────────────────────

describe('Rule 7 — maxLength', () => {
  it('rejects text exceeding maxLength', () => {
    const page = makePage({ 'slot-text': makeTextSlot({ constraints: { maxLength: 10, required: true } }) });
    const result = validate(page, { 'slot-text': { type: 'text', value: 'This is way too long for maxLength 10' } });
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('MAX_LENGTH');
  });

  it('accepts text within maxLength', () => {
    const page = makePage({ 'slot-text': makeTextSlot({ constraints: { maxLength: 100, required: true } }) });
    const result = validate(page, { 'slot-text': { type: 'text', value: 'Short text' } });
    expect(result.approved).toBe(true);
  });
});

// ─── Rule 8: XSS detection ────────────────────────────────────────────────

describe('Rule 8 — XSS detection', () => {
  const page = makePage({ 'slot-text': makeTextSlot() });

  const xssVectors = [
    '<script>alert(1)</script>',
    'javascript:void(0)',
    '<img onerror="alert(1)" src="x">',
    '<iframe src="evil.com">',
    '<object data="x">',
    'data:text/html,<script>',
    'vbscript:msgbox(1)',
  ];

  for (const vector of xssVectors) {
    it(`rejects XSS vector: ${vector.slice(0, 30)}`, () => {
      const result = validate(page, { 'slot-text': { type: 'text', value: vector } });
      expect(result.approved).toBe(false);
      expect(result.rejections[0].rule).toBe('XSS_DETECTED');
    });
  }

  it('approves clean text', () => {
    const result = validate(page, { 'slot-text': { type: 'text', value: 'Safe & clean text!' } });
    expect(result.approved).toBe(true);
  });
});

// ─── Rule 9: Design token enforcement ─────────────────────────────────────

describe('Rule 9 — design token enforcement', () => {
  const page = makePage({ 'slot-text': makeTextSlot() });

  it('rejects unapproved CSS token reference', () => {
    const result = validate(
      page,
      { 'slot-text': { type: 'text', value: 'Color is --color-danger' } },
      tokens,
    );
    expect(result.approved).toBe(false);
    expect(result.rejections[0].rule).toBe('INVALID_TOKEN');
  });

  it('approves approved token reference', () => {
    const result = validate(
      page,
      { 'slot-text': { type: 'text', value: 'Theme uses --color-0' } },
      tokens,
    );
    expect(result.approved).toBe(true);
  });

  it('approves text with no token references', () => {
    const result = validate(
      page,
      { 'slot-text': { type: 'text', value: 'No tokens here at all.' } },
      tokens,
    );
    expect(result.approved).toBe(true);
  });
});

// ─── Multiple slot changeset ───────────────────────────────────────────────

describe('multi-slot changeset', () => {
  it('accumulates rejections across multiple slots', () => {
    const page = makePage({
      'slot-text': makeTextSlot(),
      'slot-img': makeImageSlot(),
    });
    const result = validate(page, {
      'slot-text': { type: 'text', value: '<script>xss</script>' },
      'slot-img': { type: 'image', src: 'bad-url', alt: 'Alt' },
    });
    expect(result.approved).toBe(false);
    expect(result.rejections.length).toBe(2);
  });

  it('approves a valid multi-slot changeset', () => {
    const page = makePage({
      'slot-text': makeTextSlot(),
      'slot-link': makeLinkSlot(),
    });
    const result = validate(page, {
      'slot-text': { type: 'text', value: 'New headline text' },
      'slot-link': { type: 'link', href: 'https://example.com/new', label: 'New label' },
    });
    expect(result.approved).toBe(true);
  });
});
