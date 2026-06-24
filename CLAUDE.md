# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Castor** — AI-native CMS for a web design service. Non-technical clients edit designated content slots on their website; the structural template is locked immutably. A deterministic Guardian validates every change. Changes publish as static HTML via Vercel CLI.

**Monorepo** (pnpm workspaces):
- `apps/api` — Express/Node backend (port 3000)
- `apps/editor` — Next.js 14 App Router frontend (port 3001)
- `packages/types` — Shared TypeScript types as `@castor/types`

**Deployed:**
- Editor → `castor-cms.vercel.app` (Vercel)
- API → `castor-api.onrender.com` (Render, auto-deploys from `master`)
- DB → MongoDB Atlas (`castor` database)

## Commands

```bash
# Root (runs both apps concurrently)
pnpm dev

# Per-package
pnpm --filter api dev
pnpm --filter api test
pnpm --filter api test:watch
pnpm --filter api typecheck
pnpm --filter editor dev
pnpm --filter editor typecheck

# Single test file
pnpm --filter api exec vitest run src/guardian/__tests__/guardian.test.ts

# Types must be built before other packages reference dist/
pnpm --filter @castor/types build
```

## Environment

`apps/api/.env`:
- `OWNER_MASTER_KEY` — owner login password
- `JWT_SECRET` — signs all JWTs
- `MONGO_URI` — MongoDB Atlas connection string (switches storage from filesystem to MongoDB when set)
- `EDITOR_ORIGIN` — comma-separated allowed CORS origins
- `VERCEL_SCOPE` — for CLI publish deploys

`apps/editor/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

On Vercel, `NEXT_PUBLIC_API_URL=https://castor-api.onrender.com`.

Runtime settings (AI keys, deploy adapter, password hash) live in `data/settings.json` and override env vars. Managed via `apps/api/src/config/settings.ts`.

## Architecture

### Data flow — content edit

```
Client browser
  → PATCH /api/sites/:siteId/pages/:pageId/content  (Changeset)
  → Guardian.validate(pageSchema, changeset, designTokens)   ← pure sync, no AI
  → if approved: savePage + saveVersion snapshot
  → audit log appended (append-only)
```

### Storage

**MongoDB** (when `MONGO_URI` set) or **filesystem** JSON under `apps/api/data/`. The `StorageAdapter` interface in `src/storage/adapter.ts` abstracts all persistence — swap the adapter without touching business logic.

Filesystem layout (also mirrors MongoDB document structure):
```
data/
  settings.json
  templates/<hash>.html      ← immutable, hash-addressed
  bundles/<publishId>.html
  sites/<siteId>/
    site.json
    audit.log                ← append-only NDJSON
    ingests/<ingestId>/
    pages/<pageId>/
      page.json
      versions/v<n>.json
```

### Key API modules

| Path | Purpose |
|---|---|
| `src/storage/adapter.ts` | `StorageAdapter` interface |
| `src/storage/filesystem.adapter.ts` | Default JSON-file adapter; accepts `dataRoot?` for test isolation |
| `src/storage/mongo/` | Mongoose adapter, activated by `MONGO_URI` |
| `src/guardian/guardian.ts` | Pure sync validation — 9 rules, no side effects |
| `src/ingest/orchestrator.ts` | crawl → slot extraction → template storage → page upsert (deduplicates by URL) |
| `src/ingest/crawler.ts` | Puppeteer crawler; uses `domcontentloaded` (not `networkidle2`) for speed |
| `src/ingest/slot-id.ts` | SHA-256 slot IDs + 3-layer fallback re-identification |
| `src/ingest/template.ts` | Strips content → `{{slot:ID}}` placeholders; immutable store |
| `src/ingest/template.ts` | `storeTemplate`/`loadTemplate` — async; uses MongoDB when connected, filesystem otherwise |
| `src/publish/adapters.ts` | `DeployAdapter` interface + `VercelAdapter` (CLI) + `RenderAdapter` |
| `src/ai/provider.ts` | Anthropic / OpenRouter; keys from runtime settings only |
| `src/routes/ingest.ts` | POST returns real UUID ingestId immediately; job runs in background; GET polls status |

### Guardian rules (in order, first failure wins per slot)

1. Slot must exist in schema
2. Slot must not be `frozen`
3. Slot must not be `undetectable`
4. Type must match schema type
5. Required slot cannot be emptied
6. Zod schema (URL format, maxLength)
7. `maxLength` from descriptor constraints
8. XSS patterns (script, javascript:, event handlers, iframe)
9. Unapproved CSS design token references

### Page lifecycle

Pages go straight to `active` after ingest (no curation gate by default). `draft_curation` status still exists for manual curation via `POST /pages/:id/curate` and the `CurationShell` UI.

### Site IDs

Generated as URL slugs (`example-com`) not UUIDs. Collision-safe with `-2`, `-3` suffix. Existing sites from before this change have UUID IDs.

### Auth

- `POST /api/auth/owner` → 24h JWT (`role: owner`)
- `POST /api/auth/client` → 8h JWT scoped to `siteId`
- JWT stored as httpOnly cookie `cms_token`
- CORS accepts multiple origins from `EDITOR_ORIGIN` (comma-separated)
- Admin routes (`/admin/*`) are local-only: middleware blocks remote access and shows `/admin-local-only` page instead
- On localhost, `/` redirects to `/admin`; on Vercel, `/` shows the public landing page

### Editor frontend

- `/` — landing page (Vercel) or redirect to `/admin` (localhost)
- `/login` — password field; `?siteId=` for client mode
- `/admin` — owner dashboard
- `/admin/sites/[siteId]` — ingest form (`IngestForm` polls job status and calls `router.refresh()` on complete), pages list, delete site
- `/admin/sites/[siteId]/pages/[pageId]` — slot curation (`CurationShell`)
- `/admin/settings` — AI keys, deploy config, password (`SettingsForm`)
- `/editor/[siteId]/[pageId]` — `EditorShell`

`EditorShell` owns: dirty slot state, save/publish status, active panel (`ai | tokens | history`), and `activeTokens` (color/spacing/font selections passed to both `DesignTokenPanel` and `PreviewPane`). Design token changes update the preview iframe in real time via `srcDoc` rebuild — no direct DOM manipulation.

`PreviewPane` builds a complete HTML document string and sets it as `srcDoc` on a sandboxed iframe. Token selections are injected as CSS variables.

### Branding / design system

"Warm Obsidian" aesthetic. CSS variables defined in `apps/editor/src/app/globals.css`. Key vars: `--bg`, `--surface`, `--surface-2`, `--border`, `--accent` (`#E8A828`), `--text`, `--text-2`, `--text-3`. Fonts: Playfair Display (display), DM Sans (body), JetBrains Mono (mono).

Hover/focus effects use CSS classes (`hover-surface`, `hover-accent`, `focus-accent`) defined in `globals.css` — **never inline `onMouseEnter`/`onMouseLeave` in Server Components**.

Logo component: `src/components/CastorLogo.tsx` — `variant="full" | "mark" | "word"`.

## Testing

Tests in `apps/api/src/**/__tests__/`. Vitest, no DOM needed.

`src/test-setup.ts` sets required env vars via Vitest `setupFiles`. Pass `dataRoot` to `FilesystemAdapter` constructor for test isolation (avoids `process.chdir`).

## TypeScript notes

- Shared types package is `@castor/types` (was `@cms-ai/types`)
- Cheerio/domhandler: import `Element`, `AnyNode`, `Text` from `domhandler`, not `cheerio`
- Express routers: annotate `const router: ExpressRouter = Router()` to avoid TS2742
- `'use server'` only in files where all exports are async server actions. `lib/auth.ts` must NOT have it (exports sync `decodeToken`)
- Server Components cannot have inline event handlers (`onMouseEnter` etc.) — use CSS classes or extract to a `'use client'` component
- `PageStatus` includes `'deleted'` — filter with `p.status !== 'deleted'` in list endpoints
