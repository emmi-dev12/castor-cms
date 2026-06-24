import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildTemplate, storeTemplate, loadTemplate } from '../template.js';
import { extractSlots } from '../slot-id.js';

const HTML = `<html><body><h1>Hello World</h1><p>Some text here.</p></body></html>`;

describe('buildTemplate', () => {
  it('replaces slot content with placeholders', () => {
    const slots = extractSlots(HTML);
    const { templateHtml } = buildTemplate(HTML, slots);
    expect(templateHtml).not.toContain('Hello World');
    expect(templateHtml).not.toContain('Some text here.');
    for (const s of slots) {
      expect(templateHtml).toContain(s.placeholder);
    }
  });

  it('produces a stable templateId for the same input', () => {
    const slots = extractSlots(HTML);
    const { templateId: id1 } = buildTemplate(HTML, slots);
    const { templateId: id2 } = buildTemplate(HTML, slots);
    expect(id1).toBe(id2);
  });
});

describe('storeTemplate — immutability', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'castor-tmpl-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stores and retrieves a template', () => {
    const slots = extractSlots(HTML);
    const { templateId, templateHtml } = buildTemplate(HTML, slots);
    storeTemplate(templateId, templateHtml, tmpDir);
    const loaded = loadTemplate(templateId, tmpDir);
    expect(loaded).toBe(templateHtml);
  });

  it('is idempotent: storing same template twice does not throw', () => {
    const slots = extractSlots(HTML);
    const { templateId, templateHtml } = buildTemplate(HTML, slots);
    storeTemplate(templateId, templateHtml, tmpDir);
    expect(() => storeTemplate(templateId, templateHtml, tmpDir)).not.toThrow();
  });

  it('throws when different content is submitted for the same hash', () => {
    const slots = extractSlots(HTML);
    const { templateId, templateHtml } = buildTemplate(HTML, slots);
    storeTemplate(templateId, templateHtml, tmpDir);
    expect(() => storeTemplate(templateId, templateHtml + ' tampered', tmpDir)).toThrow(
      /collision/,
    );
  });

  it('throws when loading a non-existent template', () => {
    expect(() => loadTemplate('deadbeef', tmpDir)).toThrow(/not found/);
  });
});
