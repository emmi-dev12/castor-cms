// Tests for password generation/strength. These guard the defence that
// actually stops a distributed brute force: rate limits slow an attacker down,
// but entropy is what makes guessing hopeless.
//
// Run: npm test

import assert from "node:assert/strict";
import { test } from "node:test";
import { assessPassword, generateSitePassword } from "./passwords";

const MIN = 8;

test("generated passwords are long, grouped and unambiguous", () => {
  const pw = generateSitePassword();
  assert.match(pw, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  // Ambiguous glyphs would cause transcription errors over the phone.
  assert.equal(/[il1o0]/.test(pw), false, `contains ambiguous chars: ${pw}`);
});

test("generated passwords are not repeated across calls", () => {
  const seen = new Set(Array.from({ length: 50 }, () => generateSitePassword()));
  assert.equal(seen.size, 50, "generator produced a collision in 50 draws");
});

test("generated passwords always satisfy the strength check", () => {
  for (let i = 0; i < 50; i++) {
    const pw = generateSitePassword();
    assert.equal(assessPassword(pw, MIN).ok, true, `generator produced a rejected password: ${pw}`);
  }
});

test("rejects passwords shorter than the minimum", () => {
  assert.equal(assessPassword("short", MIN).ok, false);
});

test("rejects common dictionary passwords even when long enough", () => {
  for (const pw of ["password123", "12345678", "letmein123", "qwerty123", "passw0rd"]) {
    const r = assessPassword(pw, MIN);
    assert.equal(r.ok, false, `should have rejected ${pw}`);
  }
});

test("common-password check is case-insensitive", () => {
  assert.equal(assessPassword("PassWord123", MIN).ok, false);
});

test("rejects long but near-zero-entropy passwords", () => {
  assert.equal(assessPassword("aaaaaaaaaa", MIN).ok, false);
  assert.equal(assessPassword("abababababab", MIN).ok, false);
});

test("accepts a reasonable human-chosen password", () => {
  assert.equal(assessPassword("zofingen-camp-77", MIN).ok, true);
});

test("gives a usable reason when it rejects", () => {
  const r = assessPassword("aaaaaaaaaa", MIN);
  assert.equal(r.ok, false);
  assert.ok(r.reason && r.reason.length > 10, "rejection should explain itself");
});
