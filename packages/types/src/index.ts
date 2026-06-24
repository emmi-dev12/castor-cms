// ─── Slot Types ────────────────────────────────────────────────────────────

export type SlotType = 'text' | 'image' | 'link';

export type SlotVisibility = 'client-visible' | 'owner-only' | 'frozen';

export type SlotStatus = 'active' | 'undetectable';

export interface TextSlotValue {
  type: 'text';
  value: string;
}

export interface ImageSlotValue {
  type: 'image';
  src: string;
  alt: string;
}

export interface LinkSlotValue {
  type: 'link';
  href: string;
  label: string;
}

export type SlotValue = TextSlotValue | ImageSlotValue | LinkSlotValue;

export interface SlotConstraints {
  maxLength?: number;
  required?: boolean;
}

export interface FallbackDescriptor {
  /** Fallback 1: sibling heuristic */
  siblingKey?: string;
  /** Fallback 2: visual+semantic */
  bbox?: { cx: number; cy: number; w: number; h: number };
  textSample?: string;
}

export interface SlotDescriptor {
  slotId: string;
  type: SlotType;
  xpath: string;
  tagName: string;
  originalValue: SlotValue;
  currentValue: SlotValue;
  constraints: SlotConstraints;
  fallback: FallbackDescriptor;
  visibility: SlotVisibility;
  status: SlotStatus;
}

// ─── Page ──────────────────────────────────────────────────────────────────

export type PageStatus = 'draft_curation' | 'active' | 'archived' | 'deleted';

export interface PageSchema {
  pageId: string;
  siteId: string;
  url: string;
  title: string;
  templateId: string;
  slots: Record<string, SlotDescriptor>;
  status: PageStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Versioning ────────────────────────────────────────────────────────────

export interface PageVersion {
  version: number;
  ts: string;
  authorId: string;
  slotValues: Record<string, SlotValue>;
}

// ─── Publish ───────────────────────────────────────────────────────────────

export interface PublishSnapshot {
  publishId: string;
  pageId: string;
  siteId: string;
  ts: string;
  htmlHash: string;
  deployUrl: string;
  adapterType: 'vercel' | 'render';
}

// ─── Design Tokens ─────────────────────────────────────────────────────────

export type SpacingPreset = 'Compact' | 'Normal' | 'Airy';

export interface DesignTokens {
  colors: string[];
  spacingPresets: SpacingPreset[];
  fonts: string[];
}

// ─── Site ──────────────────────────────────────────────────────────────────

export type SiteStatus = 'active' | 'deleted';

export interface SiteConfig {
  siteId: string;
  name: string;
  rootUrl: string;
  clientPasswordHash: string;
  designTokens: DesignTokens;
  deployAdapter: 'vercel' | 'render';
  deployConfig: Record<string, string>;
  status: SiteStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  siteId?: string;
  iat: number;
  exp: number;
}

// ─── Guardian ──────────────────────────────────────────────────────────────

export interface RejectionDetail {
  slotId: string;
  rule: string;
  message: string;
}

export interface ValidationResult {
  approved: boolean;
  rejections: RejectionDetail[];
}

// ─── Ingest ────────────────────────────────────────────────────────────────

export interface IngestJob {
  ingestId: string;
  siteId: string;
  rootUrl: string;
  depth: number;
  status: 'pending' | 'running' | 'complete' | 'failed';
  pagesDiscovered: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export interface AuditEntry {
  ts: string;
  userId: string;
  role: UserRole;
  siteId: string;
  pageId: string;
  action: string;
  result: 'approved' | 'rejected' | 'published' | 'rolled_back';
  rejections?: RejectionDetail[];
}

// ─── Changeset ─────────────────────────────────────────────────────────────

export type Changeset = Record<string, SlotValue>;
