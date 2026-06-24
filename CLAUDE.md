# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

AI-native CMS: non-technical clients edit designated content slots on a website; the structural template is frozen immutably. A deterministic Guardian validates every change before it is saved. Changes are published as static HTML snapshots deployed via the Vercel CLI.

**Monorepo** (pnpm workspaces):
- `apps/api` — Express/Node backend (port 3000)
- `apps/editor` — Next.js 14 App Router frontend (port 3001)
- `packages/types` — Shared TypeScript types imported by both apps as `@cms-ai/types`

## Commands

```bash
# Root (runs both apps concurrently)
pnpm dev          # start api + editor in watch mode
pnpm test         # run all tests across workspace
pnpm typecheck    # typecheck all packages
pnpm build        # build all packages

# Per-package
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api test:watch         # vitest in watch mode
pnpm --filter api typecheck
pnpm --filter editor dev
pnpm --filter editor typecheck

# Run a single test file
pnpm --filter api exec vitest run src/guardian/__tests__/guardian.test.ts

# Types package must be built before the others reference its dist/
pnpm --filter types build
```

## Environment

`apps/api/.env` (copy from `.env.example`). Required vars:
- `OWNER_MASTER_KEY` — owner login password (plaintext; overridden by bcrypt hash in `data/settings.json` once changed via Settings UI)
- `JWT_SECRET` — signs all JWTs

Optional but needed for full functionality:
- `VERCEL_SCOPE` — Vercel team/personal slug for CLI deploys
- `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` — AI chat
- `MONGO_URI` — switches storage from filesystem to MongoDB

`apps/editor/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Runtime settings (AI keys, deploy adapter, password hash) are stored in `data/settings.json` and take priority over env vars. Managed via `apps/api/src/config/settings.ts`.

## Architecture

### Data flow for a content edit

```
Client browser
  → PATCH /api/sites/:siteId/pages/:pageId/content  (Changeset)
  → Guardian.validate(pageSchema, changeset, designTokens)   ← pure sync function, no AI
  → if approved: savePage + saveVersion
  → audit log appended (append-only)
```

### Key modules — API

| Path | Purpose |
|---|---|
| `src/config/env.ts` | Required/optional env vars; throws on missing required |
| `src/config/settings.ts` | Runtime settings store (`data/settings.json`); overrides env |
| `src/storage/adapter.ts` | `StorageAdapter` interface — every persistence op goes through this |
| `src/storage/filesystem.adapter.ts` | Default: JSON files under `data/sites/<siteId>/` |
| `src/storage/mongo/` | Mongoose adapter, activated when `MONGO_URI` is set |
| `src/guardian/guardian.ts` | **Deterministic validation** — 9 rules, pure function, no side effects |
| `src/guardian/schemas.ts` | Zod schemas for TextSlotValue, ImageSlotValue, LinkSlotValue |
| `src/guardian/audit.ts` | Appends to immutable `data/sites/<siteId>/audit.log` |
| `src/ingest/slot-id.ts` | Stable slot ID generation (SHA-256 of xpath+tag+content) + 3-layer re-identification |
| `src/ingest/template.ts` | Strips slot values → `{{slot:ID}}` placeholders; stores templates immutably at `data/templates/<hash>.html` |
| `src/ingest/crawler.ts` | Puppeteer-based site crawler; returns HTML + screenshots + bounding boxes |
| `src/ingest/orchestrator.ts` | Coordinates crawl → slot extraction → template storage → page schema creation |
| `src/ingest/invariance.ts` | Re-identifies slots in fresh HTML; marks `UNDETECTABLE`, fires webhook |
| `src/publish/renderer.ts` | Substitutes `{{slot:ID}}` placeholders into template; injects design token CSS vars |
| `src/publish/adapters.ts` | `DeployAdapter` interface + `VercelAdapter` (CLI) + `RenderAdapter` (stub) |
| `src/publish/bundle-store.ts` | Persists rendered HTML to `data/bundles/<publishId>.html` for rollback |
| `src/ai/provider.ts` | Calls Anthropic or OpenRouter; keys come from runtime settings, never exposed |
| `src/ai/suggest.ts` | Builds system prompt with slot context; parses LLM JSON; normalises to `Changeset` |

### Guardian rules (all in `src/guardian/guardian.ts`)

Rejection stops on first failing rule per slot. Rules in order:
1. Slot must exist in schema
2. Slot must not be `frozen`
3. Slot must not be `undetectable`
4. Type must match schema type
5. Required slot cannot be emptied
6. Zod schema (URL format, maxLength via Zod)
7. `maxLength` from descriptor constraints
8. XSS patterns (script, javascript:, event handlers, iframe, etc.)
9. Unapproved CSS design token references

### Page lifecycle

```
draft_curation  →  (owner curates slot visibility)  →  active
```
Pages enter `draft_curation` after ingest. They cannot be edited by clients or published until the owner confirms curation (`POST /pages/:id/curate`).

Slot visibility per slot: `client-visible` | `owner-only` | `frozen`

### Auth

- `POST /api/auth/owner` — returns 24h JWT (`role: owner`)
- `POST /api/auth/client` — returns 8h JWT scoped to `siteId` (`role: client`)
- `POST /api/auth/editor-link` — owner generates pre-signed shareable URL for client
- Middleware: `requireOwner`, `requireClientOrOwner(siteId)` in `src/middleware/auth.ts`
- JWT stored as httpOnly cookie (`cms_token`) in the editor
- Optional TOTP 2FA for owner via `OWNER_2FA_SECRET` env var

### Editor frontend structure

- `/` → redirects to `/admin` (owner) or `/editor/:siteId` (client) or `/login`
- `/login` — single password field; `?siteId=` param switches to client mode
- `/admin` — owner dashboard (sites list, stats)
- `/admin/sites/[siteId]` — ingest form, pages list
- `/admin/sites/[siteId]/pages/[pageId]` — slot curation (`CurationShell`)
- `/admin/settings` — AI keys, deploy config, password change (`SettingsForm`)
- `/editor/[siteId]/[pageId]` — full editor (`EditorShell`)

`EditorShell` is the main client component. It manages dirty slot state, calls `PATCH /content`, shows Guardian rejections inline, and controls three side panels (AI Chat, Design Tokens, Version History). The preview is a sandboxed `<iframe srcdoc>` rebuilt from current slot values.

### Storage on disk

```
data/
  settings.json              ← runtime settings (AI keys, password hash, etc.)
  templates/<hash>.html      ← immutable frozen templates (hash-addressed)
  bundles/<publishId>.html   ← rendered HTML for publish rollback
  sites/<siteId>/
    site.json
    audit.log                ← newline-delimited JSON, append-only
    ingests/<ingestId>/      ← raw HTML + screenshots from crawler
    pages/<pageId>/
      page.json
      versions/v<n>.json
    publishes/<publishId>.json
```

### Slot ID stability

Three identification layers, tried in order on re-ingest:
1. **Primary**: SHA-256(`xpath::tagName::contentSample[:64]`)
2. **Fallback 1**: `parentTag>tagName[siblingIndex]:lengthBucket`
3. **Fallback 2**: Bounding-box centroid proximity (±5%) + Levenshtein text similarity ≥ 0.8

If all three fail the slot is flagged `UNDETECTABLE` (not deleted) and an alert is fired. A page with undetectable slots cannot be published.

## Testing

Tests are in `apps/api/src/**/__tests__/`. Vitest, no DOM environment needed.

Key test files:
- `src/guardian/__tests__/guardian.test.ts` — 28 tests, one per rejection rule branch
- `src/ingest/__tests__/slot-id.test.ts` — primary ID stability + fallback re-identification under DOM drift
- `src/ingest/__tests__/template.test.ts` — immutability enforcement
- `src/storage/__tests__/adapters.test.ts` — full CRUD against `FilesystemAdapter`
- `src/routes/__tests__/auth.test.ts` — JWT issuance, rate limiting, scope enforcement

`src/test-setup.ts` sets required env vars before module load (Vitest `setupFiles`).

The `FilesystemAdapter` constructor accepts an optional `dataRoot` override — pass a `mkdtemp` path in tests instead of using `process.chdir`.

## TypeScript notes

- API: CommonJS output (`module: CommonJS`), `DOM` lib included (needed for Puppeteer `page.evaluate` callbacks)
- Cheerio/domhandler types: import `Element`, `AnyNode`, `Text` from `domhandler` (not from `cheerio` directly)
- Express router files: annotate as `const router: ExpressRouter = Router()` to avoid TS2742 portable type errors
- Editor: Next.js `bundler` module resolution; `@/*` maps to `src/*`
- `'use server'` belongs only in files where **all** exports are async server actions (e.g. `actions.ts`). Server-side utility modules (like `lib/auth.ts`) must NOT have `'use server'` at the file level.
