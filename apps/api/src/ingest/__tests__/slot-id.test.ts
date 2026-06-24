import { describe, it, expect } from 'vitest';
import { extractSlots, reidentifySlot } from '../slot-id.js';

const BASE_HTML = `
<html><body>
  <header><h1>Welcome to Acme</h1></header>
  <main>
    <p>We build great products.</p>
    <a href="https://example.com/about">About us</a>
    <img src="https://example.com/hero.jpg" alt="Hero image" />
    <button>Get started</button>
  </main>
</body></html>
`;

// Wrap h1 in an extra div — simulates a minor DOM drift
const DRIFTED_HTML = `
<html><body>
  <header><div><h1>Welcome to Acme</h1></div></header>
  <main>
    <p>We build great products.</p>
    <a href="https://example.com/about">About us</a>
    <img src="https://example.com/hero.jpg" alt="Hero image" />
    <button>Get started</button>
  </main>
</body></html>
`;

// Remove the h1 slot entirely
const REMOVED_HTML = `
<html><body>
  <main>
    <p>We build great products.</p>
    <a href="https://example.com/about">About us</a>
    <img src="https://example.com/hero.jpg" alt="Hero image" />
    <button>Get started</button>
  </main>
</body></html>
`;

describe('extractSlots — primary ID stability', () => {
  it('produces identical slot IDs for two parses of the same HTML', () => {
    const first = extractSlots(BASE_HTML);
    const second = extractSlots(BASE_HTML);

    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBe(second.length);

    const firstIds = first.map((s) => s.descriptor.slotId).sort();
    const secondIds = second.map((s) => s.descriptor.slotId).sort();
    expect(firstIds).toEqual(secondIds);
  });

  it('classifies element types correctly', () => {
    const slots = extractSlots(BASE_HTML);
    const byTag: Record<string, string> = {};
    for (const s of slots) {
      byTag[s.descriptor.tagName] = s.descriptor.type;
    }
    expect(byTag['h1']).toBe('text');
    expect(byTag['p']).toBe('text');
    expect(byTag['a']).toBe('link');
    expect(byTag['img']).toBe('image');
    expect(byTag['button']).toBe('text');
  });

  it('does not emit slot IDs for structural containers', () => {
    const slots = extractSlots(BASE_HTML);
    const tags = slots.map((s) => s.descriptor.tagName);
    expect(tags).not.toContain('div');
    expect(tags).not.toContain('section');
    expect(tags).not.toContain('body');
    expect(tags).not.toContain('html');
    expect(tags).not.toContain('header');
    expect(tags).not.toContain('main');
  });

  it('generates unique IDs for each slot', () => {
    const slots = extractSlots(BASE_HTML);
    const ids = slots.map((s) => s.descriptor.slotId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stores fallback descriptors on every slot', () => {
    const slots = extractSlots(BASE_HTML);
    for (const s of slots) {
      expect(s.descriptor.fallback.siblingKey).toBeDefined();
      expect(s.descriptor.fallback.textSample).toBeDefined();
    }
  });
});

describe('reidentifySlot — fallback re-identification under DOM drift', () => {
  it('primary: finds slot in unchanged HTML', () => {
    const slots = extractSlots(BASE_HTML);
    const h1 = slots.find((s) => s.descriptor.tagName === 'h1')!;
    expect(h1).toBeDefined();

    const result = reidentifySlot(h1.descriptor, BASE_HTML);
    expect(result.found).toBe(true);
    if (result.found) expect(result.method).toBe('primary');
  });

  it('fallback1 or fallback2: re-identifies h1 after wrapper div inserted', () => {
    const slots = extractSlots(BASE_HTML);
    const h1 = slots.find((s) => s.descriptor.tagName === 'h1')!;
    expect(h1).toBeDefined();

    const result = reidentifySlot(h1.descriptor, DRIFTED_HTML);
    // Should find via sibling key or text/bbox similarity
    expect(result.found).toBe(true);
    if (result.found) {
      expect(['fallback1', 'fallback2']).toContain(result.method);
    }
  });

  it('reports NOT FOUND when slot is genuinely removed', () => {
    const slots = extractSlots(BASE_HTML);
    const h1 = slots.find((s) => s.descriptor.tagName === 'h1')!;

    const result = reidentifySlot(h1.descriptor, REMOVED_HTML);
    expect(result.found).toBe(false);
  });

  it('stable slots (p, a, img, button) survive drift', () => {
    const slots = extractSlots(BASE_HTML);
    const stable = slots.filter((s) => s.descriptor.tagName !== 'h1');

    for (const s of stable) {
      const result = reidentifySlot(s.descriptor, DRIFTED_HTML);
      expect(result.found).toBe(true);
    }
  });
});

describe('template placeholder emission', () => {
  it('placeholder contains slot ID', () => {
    const slots = extractSlots(BASE_HTML);
    for (const s of slots) {
      expect(s.placeholder).toBe(`{{slot:${s.descriptor.slotId}}}`);
    }
  });
});
