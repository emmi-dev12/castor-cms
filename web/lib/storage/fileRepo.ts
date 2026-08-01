// Filesystem-backed repository for local development.
// Stores one JSON file per site under web/.data/sites/. Not used on Vercel
// (its filesystem is ephemeral) — set MONGODB_URI there instead.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Site, Submission } from "../model/types";
import type { Repository } from "./repository";

const DATA_ROOT = path.join(process.cwd(), ".data");
const DATA_DIR = path.join(DATA_ROOT, "sites");
const SUBMISSIONS_DIR = path.join(DATA_ROOT, "submissions");
const RATES_FILE = path.join(DATA_ROOT, "rate-limits.json");
const SETTINGS_FILE = path.join(DATA_ROOT, "settings.json");

function fileFor(slug: string): string {
  // slug is validated on write; keep it filesystem-safe.
  return path.join(DATA_DIR, `${slug}.json`);
}

function submissionsFile(slug: string): string {
  return path.join(SUBMISSIONS_DIR, `${slug}.json`);
}

export class FileRepository implements Repository {
  private async ensureDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  async getSite(slug: string): Promise<Site | null> {
    try {
      const raw = await fs.readFile(fileFor(slug), "utf8");
      return JSON.parse(raw) as Site;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async updateSite(site: Site): Promise<boolean> {
    // Compare-and-swap. Note: this read-then-write is not atomic across
    // processes — it's adequate for the single local dev server, whereas the
    // Mongo implementation (used in production, where the client editor and
    // admin actually run concurrently) does a genuine conditional write.
    const current = await this.getSite(site.slug);
    const expected = site.rev ?? 0;
    if (current && (current.rev ?? 0) !== expected) return false;
    await this.putSite({ ...site, rev: expected + 1 });
    return true;
  }

  async putSite(site: Site): Promise<void> {
    await this.ensureDir();
    // Write to a temp file then rename — an atomic swap, so a concurrent reader
    // never sees a partially written file. (Note: does not prevent lost updates
    // under concurrent read-modify-write; fine for single-editor M1.)
    const target = fileFor(site.slug);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(site, null, 2), "utf8");
    await fs.rename(tmp, target);
  }

  async listSites(): Promise<Site[]> {
    await this.ensureDir();
    const names = await fs.readdir(DATA_DIR);
    const sites: Site[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await fs.readFile(path.join(DATA_DIR, name), "utf8");
      sites.push(JSON.parse(raw) as Site);
    }
    return sites;
  }

  async deleteSite(slug: string): Promise<void> {
    try {
      await fs.unlink(fileFor(slug));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  // Submissions live in one JSON array per site.
  private async readSubmissions(slug: string): Promise<Submission[]> {
    try {
      return JSON.parse(await fs.readFile(submissionsFile(slug), "utf8")) as Submission[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  async addSubmission(submission: Submission): Promise<void> {
    await fs.mkdir(SUBMISSIONS_DIR, { recursive: true });
    const all = await this.readSubmissions(submission.siteSlug);
    all.push(submission);
    await fs.writeFile(
      submissionsFile(submission.siteSlug),
      JSON.stringify(all, null, 2),
      "utf8",
    );
  }

  async listSubmissions(slug: string): Promise<Submission[]> {
    return this.readSubmissions(slug);
  }

  // Rate-limit counters, all in one small JSON map (local dev only).
  private async readRates(): Promise<Record<string, { count: number; resetAt: number }>> {
    try {
      return JSON.parse(await fs.readFile(RATES_FILE, "utf8"));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw err;
    }
  }

  private async writeRates(rates: Record<string, { count: number; resetAt: number }>) {
    await fs.mkdir(DATA_ROOT, { recursive: true });
    await fs.writeFile(RATES_FILE, JSON.stringify(rates), "utf8");
  }

  async bumpRate(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const rates = await this.readRates();
    // Drop expired counters so the file can't grow without bound (the Mongo
    // impl relies on a TTL index for the same effect).
    for (const k of Object.keys(rates)) {
      if (rates[k].resetAt <= now && k !== key) delete rates[k];
    }
    const entry = rates[key];
    const next = !entry || entry.resetAt <= now
      ? { count: 1, resetAt: now + windowMs }
      : { count: entry.count + 1, resetAt: entry.resetAt };
    rates[key] = next;
    await this.writeRates(rates);
    return next.count;
  }

  async clearRate(key: string): Promise<void> {
    const rates = await this.readRates();
    delete rates[key];
    await this.writeRates(rates);
  }

  async deleteSubmission(slug: string, id: string): Promise<void> {
    const all = await this.readSubmissions(slug);
    await fs.mkdir(SUBMISSIONS_DIR, { recursive: true });
    await fs.writeFile(
      submissionsFile(slug),
      JSON.stringify(all.filter((s) => s.id !== id), null, 2),
      "utf8",
    );
  }

  private async readSettings(): Promise<Record<string, string>> {
    try {
      return JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8")) as Record<string, string>;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw err;
    }
  }

  async getSetting(key: string): Promise<string | null> {
    return (await this.readSettings())[key] ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await fs.mkdir(DATA_ROOT, { recursive: true });
    const all = await this.readSettings();
    all[key] = value;
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(all, null, 2), "utf8");
  }
}
