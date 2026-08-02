// MongoDB Atlas-backed repository. Used when MONGODB_URI is set (e.g. on Vercel).
// Caches the client on globalThis so serverless invocations reuse the connection.

import { Binary, MongoClient, type Collection, type Db } from "mongodb";
import type { Asset, Site, Submission } from "../model/types";
import type { Repository } from "./repository";

const DB_NAME = process.env.MONGODB_DB || "ai_native_cms";

interface CachedMongo {
  client: MongoClient;
  promise: Promise<MongoClient> | null;
}

const globalForMongo = globalThis as unknown as { _mongo?: CachedMongo };

export class MongoRepository implements Repository {
  private uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }

  private async db(): Promise<Db> {
    if (!globalForMongo._mongo) {
      const client = new MongoClient(this.uri);
      globalForMongo._mongo = { client, promise: client.connect() };
    }
    const cache = globalForMongo._mongo;
    if (cache.promise) {
      await cache.promise;
      cache.promise = null;
    }
    return cache.client.db(DB_NAME);
  }

  private async collection(): Promise<Collection<Site>> {
    return (await this.db()).collection<Site>("sites");
  }

  async getSite(slug: string): Promise<Site | null> {
    const col = await this.collection();
    return col.findOne({ slug }, { projection: { _id: 0 } });
  }

  async putSite(site: Site): Promise<void> {
    const col = await this.collection();
    await col.replaceOne({ slug: site.slug }, { ...site, rev: site.rev ?? 0 }, { upsert: true });
  }

  async updateSite(site: Site): Promise<boolean> {
    const col = await this.collection();
    const expected = site.rev ?? 0;
    // Sites written before `rev` existed have no such field, so treat a missing
    // rev as 0 — otherwise the very first concurrent-safe write would always
    // "conflict" against legacy data.
    const revFilter =
      expected === 0
        ? { $or: [{ rev: 0 }, { rev: { $exists: false } }] }
        : { rev: expected };
    const res = await col.replaceOne(
      { slug: site.slug, ...revFilter },
      { ...site, rev: expected + 1 },
    );
    return res.matchedCount === 1;
  }

  async listSites(): Promise<Site[]> {
    const col = await this.collection();
    return col.find({}, { projection: { _id: 0 } }).toArray();
  }

  async deleteSite(slug: string): Promise<void> {
    const col = await this.collection();
    await col.deleteOne({ slug });
  }

  private async submissions(): Promise<Collection<Submission>> {
    return (await this.db()).collection<Submission>("submissions");
  }

  async addSubmission(submission: Submission): Promise<void> {
    await (await this.submissions()).insertOne({ ...submission });
  }

  async listSubmissions(slug: string): Promise<Submission[]> {
    const col = await this.submissions();
    return col.find({ siteSlug: slug }, { projection: { _id: 0 } }).toArray();
  }

  async deleteSubmission(slug: string, id: string): Promise<void> {
    await (await this.submissions()).deleteOne({ siteSlug: slug, id });
  }

  private rateTtlEnsured = false;

  private async rates(): Promise<Collection<RateDoc>> {
    const col = (await this.db()).collection<RateDoc>("rateLimits");
    // A TTL index on `expireAt` lets MongoDB purge stale counters itself, so the
    // collection can't grow without bound. Ensured once per process; harmless
    // to call repeatedly if it races.
    if (!this.rateTtlEnsured) {
      this.rateTtlEnsured = true;
      await col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
    }
    return col;
  }

  async bumpRate(key: string, windowMs: number): Promise<number> {
    const col = await this.rates();
    const now = Date.now();
    // Read-then-write is slightly racy under heavy concurrency, which is fine:
    // an approximate count is enough to stop brute force, and erring low by one
    // or two attempts doesn't meaningfully weaken the lockout.
    const doc = await col.findOne({ key });
    if (!doc || doc.resetAt <= now) {
      await col.replaceOne(
        { key },
        { key, count: 1, resetAt: now + windowMs, expireAt: new Date(now + windowMs) },
        { upsert: true },
      );
      return 1;
    }
    await col.updateOne({ key }, { $inc: { count: 1 } });
    return doc.count + 1;
  }

  async clearRate(key: string): Promise<void> {
    await (await this.rates()).deleteOne({ key });
  }

  async getSetting(key: string): Promise<string | null> {
    const col = (await this.db()).collection<{ key: string; value: string }>("settings");
    const doc = await col.findOne({ key }, { projection: { _id: 0 } });
    return doc?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const col = (await this.db()).collection<{ key: string; value: string }>("settings");
    await col.replaceOne({ key }, { key, value }, { upsert: true });
  }

  private async assets(): Promise<Collection<AssetDoc>> {
    const col = (await this.db()).collection<AssetDoc>("assets");
    await col.createIndex({ siteSlug: 1 }).catch(() => {});
    return col;
  }

  async putAsset(asset: Asset): Promise<void> {
    const col = await this.assets();
    // Content-addressed: the same bytes uploaded twice are one document.
    await col.updateOne(
      { _id: asset.sha },
      {
        $set: {
          contentType: asset.contentType,
          size: asset.size,
          data: new Binary(asset.bytes),
        },
        // Keep the first owner: assets are shared by hash, and reassigning
        // ownership on re-upload would let one site's delete orphan another's.
        $setOnInsert: { siteSlug: asset.siteSlug },
      },
      { upsert: true },
    );
  }

  async getAsset(sha: string): Promise<Asset | null> {
    const doc = await (await this.assets()).findOne({ _id: sha });
    if (!doc) return null;
    return {
      sha,
      siteSlug: doc.siteSlug,
      contentType: doc.contentType,
      size: doc.size,
      bytes: new Uint8Array(doc.data.buffer),
    };
  }

  async listAssetShas(siteSlug: string): Promise<string[]> {
    const docs = await (await this.assets())
      .find({ siteSlug }, { projection: { _id: 1 } })
      .toArray();
    return docs.map((d) => d._id);
  }

  async deleteAssets(siteSlug: string): Promise<void> {
    await (await this.assets()).deleteMany({ siteSlug });
  }
}

interface AssetDoc {
  _id: string;
  siteSlug: string;
  contentType: string;
  size: number;
  data: Binary;
}

interface RateDoc {
  key: string;
  count: number;
  resetAt: number;
  /** Date form of resetAt, purely for the TTL index to purge stale counters. */
  expireAt?: Date;
}
