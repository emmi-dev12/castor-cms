import mongoose, { Schema } from 'mongoose';
import type {
  SiteConfig,
  PageSchema,
  PageVersion,
  PublishSnapshot,
  IngestJob,
  AuditEntry,
} from '@castor/types';

const loose = Schema.Types.Mixed;
const opts = { strict: false } as const;

export const SiteModel = mongoose.model<SiteConfig>(
  'Site',
  new Schema({
    siteId: { type: String, required: true, unique: true },
  }, opts),
);

export const PageModel = mongoose.model<PageSchema>(
  'Page',
  new Schema({
    pageId: { type: String, required: true },
    siteId: { type: String, required: true, index: true },
    slots: { type: loose },
  }, opts),
);
PageModel.schema.index({ siteId: 1, pageId: 1 }, { unique: true });

export const VersionModel = mongoose.model<PageVersion & { siteId: string; pageId: string }>(
  'Version',
  new Schema({
    siteId: { type: String, required: true, index: true },
    pageId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    slotValues: { type: loose },
  }, opts),
);
VersionModel.schema.index({ siteId: 1, pageId: 1, version: 1 }, { unique: true });

export const PublishModel = mongoose.model<PublishSnapshot>(
  'Publish',
  new Schema({
    publishId: { type: String, required: true, unique: true },
    siteId: { type: String, required: true, index: true },
    pageId: { type: String, required: true, index: true },
  }, opts),
);

export const IngestJobModel = mongoose.model<IngestJob>(
  'IngestJob',
  new Schema({
    ingestId: { type: String, required: true, unique: true },
  }, opts),
);

export const AuditModel = mongoose.model<AuditEntry & { siteId: string }>(
  'Audit',
  new Schema({
    siteId: { type: String, required: true, index: true },
    ts: { type: String, required: true },
  }, opts),
);
