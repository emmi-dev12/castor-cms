# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Castor** — a client CMS. You build or clone a website, hand a client a slug +
password, and they self-edit their own content (and, if allowed, design)
in-browser without breaking the layout. Draft → Publish, every published version
kept for one-click rollback. See `DEPLOY.md` for the production/hosting model,
`SETUP.md` for first-time setup from a fresh clone, and `LICENSE.md` for the
terms — the source is public and free, so treat both as user-facing docs and
keep them true when behaviour changes.

Castor itself contains **no AI** — it's fully deterministic (an AI layer existed
briefly and was removed). Ingestion of new sites *is* AI-driven, but that's an
agent working **on** this codebase (see the `castor-ingest` skill), not a feature
inside the product.

## Layout

The Next.js app lives in the **`web/` subdirectory** (the repo root has spaces in
its name, which npm rejects as a package name — hence the subfolder). Run all
commands from `web/`.

> `web/AGENTS.md` warns that this is **Next.js 16** with breaking changes from
> older versions. Notably: dynamic-route `params` and `cookies()` are **async**
> (`await params`, `await cookies()`). Read `web/node_modules/next/dist/docs/`
> before writing route/page code.

## Commands (run from `web/`)

```bash
npm run dev          # local dev server (this is where admin + Playwright clone work)
npm run build        # production build
npm run deploy       # deploy AND re-point the aliases (see Deploy — never bare `vercel --prod`)
npm run dist         # publish a snapshot to the buyer-facing repo (owner tooling; see below)
npm run seed         # write the sample "acme" site to storage (see note below)
npm test             # unit tests: Guardian permissions + password rules (node:test via tsx)
npx tsx --test lib/guardian/validate.test.ts          # one file
npx tsx --test --test-name-pattern="palette range" lib/guardian/validate.test.ts  # one test
npm run lint         # eslint
npx tsc --noEmit     # typecheck
```

- **Never `rm -rf .next` while `npm run dev` is running** — it deletes the dev
  server's build output mid-flight and the server then throws ChunkLoadError /
  ENOENT on every route. Stop the server first, then clean, then restart.

- **Seeding against Atlas:** `npm run seed` (tsx) does NOT auto-load `.env.local`.
  To seed the shared DB, export the URI first:
  `export MONGODB_URI="$(grep ^MONGODB_URI= .env.local | sed 's/^MONGODB_URI=//')" && npm run seed`
- After deleting/adding routes, Next's generated `.next/types` can go stale and
  fail `tsc`; `rm -rf .next/types` and re-run.

## Architecture (the big picture)

**One codebase, two modes** (`lib/auth/admin.ts` `isAdminEnabled()`):
- **Local (dev)** — admin routes (`app/admin/*`, `app/api/admin/*`), site
  building, and the Playwright clone are enabled. This is where the owner works.
- **Deployed (prod on Vercel)** — admin is disabled (403); only the client editor
  + public rendering are served. Playwright never runs there.

Even locally, the admin surface sits behind an `ADMIN_PASSWORD` gate
(`lib/auth/adminSession.ts` `checkAdminGate()`/`requireAdminApi()`). The gate has
three states beyond `disabled` (prod): with **no** `ADMIN_PASSWORD` set the admin
is refused entirely (`not-configured` — it never falls back to a default
password); once set, pages/APIs are `locked` (401 / "Admin password not set"
notice) until you log in at `/api/admin/login`, then `ok`. So to use the local
admin you **must** set `ADMIN_PASSWORD` in `web/.env.local` and restart.
The owner can then change it from the dashboard (`POST /api/admin/password`,
current password required, min 12 chars). A changed password is stored **bcrypt
hashed** via `Repository.getSetting/setSetting` and **takes precedence over
`ADMIN_PASSWORD`** — so after a change the env var no longer signs you in, and
only the stored hash does. `verifyAdminPassword`/`isAdminPasswordConfigured`
are **async**: `await` them, since `!somePromise` is always false and would
silently accept any password.

**Storage is environment-selected** (`lib/storage/repository.ts` `getRepository()`):
filesystem (`web/.data/`) when `MONGODB_URI` is unset, MongoDB Atlas when set.
Local admin and the hosted editor **share one Atlas DB** — set `MONGODB_URI` in
`web/.env.local` locally so sites you build land in the same DB the deploy reads.

**Content model** (`lib/model/types.ts`): `Site → Pages → Sections → Slots`.
- A `Section` is either a **typed block** — `hero`, `text` (add an `image` slot
  and it becomes a 2-col split), `features`, `testimonials`, `faq`, `gallery`,
  `form`, `cta`, `footer` — rendered by `components/sections/SectionView.tsx`,
  `raw-html` (a Playwright clone: frozen `template`/`head` + tagged slots,
  rendered inline by `components/sections/RawHtmlSection.tsx`), or `imported`
  (a ZIP import: the same frozen shape, but rendered in a **sandboxed iframe**
  by `components/sections/ImportedSection.tsx` — see ZIP import below).
  Adding a type = a new `case` in `SectionView` + a template in
  `lib/model/sectionTemplates.ts` (which also drives the admin "add section" menu).
- A `Slot` is `{id, type, value}`, `type ∈ text|richtext|image|link|button|
  color|space|list`. `image` values carry an optional display `width`;
  `text`/`richtext` carry an optional `color` (see the Guardian, below).
- **Draft vs published:** `site.draft` is the working copy; `site.versions[]` are
  immutable snapshots; `site.publishedVersionId` points at the live one. Publish
  snapshots the draft; rollback just moves the pointer (`lib/sites/service.ts`).

**Auto-update invariant (don't break this):** content lives in the DB, rendering
lives in code. So every existing site picks up content edits *and* redeployed
renderer/section changes with **no re-ingest**. The deployed content routes
(`app/[slug]/**`, `app/edit/[slug]/**`) set `export const dynamic = "force-dynamic"`
so each request reads fresh from Mongo — never add caching/ISR to them without
a deliberate revalidation story, or existing sites would serve stale content.
(Caveat: `raw-html` clone sections are a frozen HTML blob, so only the
`RawHtmlSection` *wrapper* code auto-updates, not the captured markup —
the Claude-driven typed-section ingest path, which is the default, auto-updates
fully.)

**Concurrency — read this before touching a write path.** A whole `Site`
document is replaced on write, so read-modify-write must go through
`Repository.updateSite` (compare-and-swap on `site.rev`), NOT `putSite`
(unconditional — only for creating/overwriting a site). On a lost race the
helpers return `CONFLICT` (exported from `lib/sites/service.ts`), the APIs
answer **409** with `{conflict:true}`, and the editor reloads the canonical
draft instead of silently clobbering the other party's edit. Mongo's filter
treats a missing `rev` as 0 so pre-`rev` documents still update.

**The Guardian** (`lib/guardian/`) is a deterministic, AI-free policy engine:
`validate(slot, value, permissions)`. Every edit passes through it before
touching the draft. There are **no tiers** (they were removed): the owner ticks
individual capabilities per site — `text`, `images`, `links`, `textColor`,
`sectionColors`, `spacing` — plus two ranges, `colorRange` (`palette` | `any`)
and `spacingRange` (`scale` | `any`). Any combination is valid, and a page may
override any subset via `page.permissions`. `resolvePermissions()` fills gaps
with **off**, so a malformed document fails closed. `PRESETS` in
`lib/guardian/policy.ts` are admin-UI shortcuts only — never stored as a tier.
Migrate legacy tier documents with `npx tsx scripts/migrate-permissions.ts`
(dry-run by default, `--write` to apply; idempotent).

**Per-slot text colour:** `text`/`richtext` slots carry an optional `color`, so
each piece of text is coloured independently (unset = inherit the section's).
It travels as a separate `color` field on the edit APIs — `applyEdit(slug,
slotId, value, color)`, `null` clears it — and is gated by `textColor`,
*separately* from the section-level `sectionColors`. When adding an edit route,
remember to forward `body.color`; forgetting it silently drops colour changes
while still answering 200.

**ZIP import** (`lib/import/`, local admin only): drag a ZIP of a **built**
site onto the dashboard and it becomes an editable site. `unpack.ts` is the
security boundary — the archive is untrusted, so entries are decompressed in
memory (never to disk, defusing path traversal by construction) with caps on
file size, total size and count. `prepare.ts` rewrites every asset reference to
`/assets/<sha256>` and internal links to `/<slug>/<page>`, then tags text and
image leaves using the **same token format as `lib/ingest/snapshot.ts`**, so
`applySlots` renders both paths identically. Each HTML file becomes one Page
holding one `imported` section. Assets are content-addressed in the DB
(`Repository.putAsset/getAsset`), so a logo on ten pages is stored once, and
`/assets/[sha]` serves them `immutable` + `nosniff`.

**Imported pages run in a sandboxed iframe** (`ImportedSection`, `/frame/...`):
`sandbox="allow-scripts"` **without** `allow-same-origin`. Imported JavaScript
therefore runs — menus and sliders survive — but in an opaque origin, so it
can't read cookies or reach another client's site on the shared domain. The
parent consequently *can't script into the frame*, so the frame carries an
injected bridge (`lib/import/bridge.ts`) that makes tagged elements editable
and `postMessage`s changes out; the parent checks `e.source` and persists via
the normal Guardian path. Two traps: `?edit=1` serves the **draft** and is
auth-gated, and the height reporter must measure `document.body`, never
`documentElement` (whose scrollHeight is at least the viewport — i.e. the
iframe itself — so the frame would echo its own height and never resize).

**Undo/redo** (`components/editor/useEditHistory.ts`): a bounded stack of
before/after slot snapshots. Ordinary edits, undo and redo all go through one
`persist()` in `EditorApp`, so they can't drift. Two rules worth keeping:
⌘Z is **not** intercepted while the caret is in a text field (the browser's own
undo is what someone wants mid-sentence), and replay only sends `color` when the
original edit changed it — text and colour are separate permissions, so an
unnecessary colour field would get a text-only client's undo refused.
`EditableText` syncs its uncontrolled DOM text only when the incoming prop
differs from the last one it saw: true after an undo, false while typing, so the
caret survives.

**Owner tooling — `npm run dist`** (`scripts/dist.sh`): copies the committed
tree into a separate buyer-facing repo with a clean history (no personal email,
no commit-by-commit record of pricing decisions), commits and pushes. Publishes
`HEAD`, refuses a dirty working tree, and refuses to commit under the machine's
default git identity. Destination from `CASTOR_DIST_PATH`; identity from the
destination repo's own git config.

**Cloning** (`lib/ingest/`, local admin only) — **no longer exposed in the UI.**
The dashboard's "Clone a site" form was removed: ingestion is AI-driven (the
`castor-ingest` skill), because the Playwright snapshot freezes lazy-load
placeholders and captures only one page. `POST /api/admin/ingest` still exists
and still works if called directly, but nothing links to it. How it works:
Playwright renders a URL, strips
scripts, rewrites URLs absolute, and tags text/image leaves as slots, replacing
their content with `U+E000`-delimited tokens. `lib/ingest/tokens.ts` `applySlots`
substitutes current values into the HTML string at render time so the public page
is correct without JS. Playwright is a `serverExternalPackages` entry and only
imported dynamically.

**Owner master editor** (`lib/sites/adminOps.ts`, local only): the same
`EditorApp` in `admin` mode. Edits run with every permission granted (bypassing
whatever the client is allowed to change) via `/api/admin/[slug]/edit`, plus structural control the client editor
lacks — move/duplicate/delete sections, add sections from a template,
add/delete pages (`/api/admin/[slug]/structure`), reset the client password and
delete the site (`/api/admin/[slug]/manage`).

**Forms** (`components/sections/FormSection.tsx`): a `form` section POSTs to the
**public** `POST /api/[slug]/submit`. That endpoint is deliberately
unauthenticated, so it's defensive: honeypot field (returns a fake ok so bots
don't learn), HTML stripped, control chars normalised, field count/length capped,
site must exist and be published, and it's rate limited (below). Submissions are stored via
`Repository.addSubmission/listSubmissions/deleteSubmission` and read in the
local-only inbox at `/admin/submissions/[slug]`.

**Auth** (`lib/auth/session.ts`): per-site client password (bcrypt) unlocks an
HMAC-signed session cookie. The cookie is scoped to path `/` (not `/[slug]`) so it
reaches `/api/[slug]/*`. `CMS_SESSION_SECRET` is **required in production** — the
app throws without it rather than fall back to a predictable secret.

The client password is effectively the whole security boundary (the editor URL
is guessable from the public one), so **both password-verifying endpoints are
rate limited** (`lib/security/rateLimit.ts`): failed logins 8 per site+IP / 15
min, `/submit` 15 per IP+site / hour, each returning 429 + `Retry-After`.
Counters are storage-backed (`Repository.bumpRate/clearRate`), never in-memory —
serverless instances don't share memory. Keyed on site+IP so an attacker can't
lock the real client out, and cleared on successful login.
A per-IP limit alone is beatable with many IPs, so there's also a bounded
global per-site failed-login cap (defence in depth; a deliberate small
lock-out risk beats unbounded guessing). The durable defence, though, is
**password entropy** (`lib/security/passwords.ts`): a generator produces
~79-bit passwords and `assessPassword` rejects weak/common ones — enforced on
both the client change and owner reset. Rate-limit counters self-expire (Mongo
TTL index on `expireAt`; fs impl prunes) so the store can't grow unbounded.
Clients change their own password at `POST /api/[slug]/password` (needs the
session **and** the current password); the owner resets it from the admin
editor (generates a strong one). `MIN_PASSWORD_LENGTH` (service.ts) governs both.

**Client onboarding**: the login screen is branded with the site name, and
first-time clients get a spotlight walkthrough (`components/editor/Walkthrough.tsx`),
reopenable from the header **? Help** button. Steps target `data-tour="..."`
attributes in `EditorApp` and any step whose target is absent is skipped, so the
tour always matches what that client can actually see. "Seen" state is
localStorage per slug (a UI preference, not site data).

**SEO** (`lib/model/seo.ts`, `app/robots.ts`, `app/sitemap.ts`): every public
route exports `generateMetadata` → `pageMetadata(site, page, slug, path)`, which
derives a per-page `<title>` (home = brand, sub-pages = `Section · Brand`),
meta description (first subhead/intro/body slot, clipped to 160), canonical URL,
and OpenGraph/Twitter tags (og:image = first absolute image on the page) straight
from published content — no editor work, no re-ingest. `metadataBase` (in
`app/layout.tsx`) resolves relative URLs; override the domain with `SITE_URL`.
`robots.txt` allows `/` but blocks `/edit/`, `/admin/`, `/api/`; `sitemap.xml`
(force-dynamic) lists every published page of every site. Reads go through the
request-deduped `getSiteCached` (`lib/sites/read.ts`, React `cache()`) so
`generateMetadata` and the page render share one DB fetch.

**Marketing landing page** (`components/marketing/`, rendered at `/` in prod):
sells the product itself, and is the one part of the app a buyer will delete or
rewrite. It is self-contained — the CMS does not import from it. Castor is free and
source-available, so there is no checkout: every CTA points at the public
repository, configured in one place (`components/marketing/pricing.ts`,
`CASTOR_REPO_URL` to point at a fork). `POST /api/access-request` stores enquiries as
submissions under the pseudo-slug `__access`, readable at
`/admin/submissions/__access`; it reuses the `/submit` defences (honeypot,
length caps, per-IP rate limit).

## Routing

- `/` — owner dashboard locally; the **marketing landing page** in prod.
  Locally, `/?preview=landing` renders the landing page without deploying.
- `/[slug]` + `/[slug]/[...path]` — public published view (home + sub-pages).
- `/edit/[slug]` + `/edit/[slug]/[...path]` — password-gated client editor.
  The editor lives under its own top-level `/edit/*` prefix (not `/[slug]/edit`)
  so a content page path — including one literally named `edit` — never
  collides with it. `RESERVED_SLUGS` (`lib/sites/service.ts`) forbids `edit`,
  `admin`, `api`, `""` as site slugs (they'd shadow top-level routes).
- `/admin/edit/[slug]` (+ `/[...path]`) — owner master editor, local-only.
- `/admin/submissions/[slug]` — form-submission inbox, local-only.
- `/assets/[sha]` — content-addressed asset store for imported sites (public,
  `immutable`). `/frame/[slug]/[[...path]]` — the document rendered inside an
  imported page's sandboxed iframe; `?edit=1` serves the draft and is
  auth-gated. Both are in `RESERVED_SLUGS`, so no site can shadow them.
- Admin APIs (all `requireAdminApi()`-gated, local-only): `/api/admin/login`,
  `/api/admin/password` (change the dashboard password),
  `/api/admin/import` (ZIP import),
  `/api/admin/[slug]/{edit,structure,manage,permissions,submissions}`, and the
  unlinked `/api/admin/ingest`. There is no `/tier` route — it was replaced by
  `/permissions`.
- Public + edit routes share logic via `components/pages/{Public,Edit,AdminEdit}SitePage.tsx`.
  Multi-page sites get a `PublicNav` (public) and a "Pages" switcher (editor).
- Unknown slug → polite "this isn't your site" notice.

## Deploy

Deployed on Vercel. `web/vercel.json` pins
`framework: nextjs` (a bare-created project defaults to "Other" and 404s every
route). Required prod env: `MONGODB_URI`, `CMS_SESSION_SECRET`. `npm run deploy` also
re-points any domains listed in `CASTOR_ALIASES` (environment or
`web/.env.local`) — deliberately not hard-coded, so the repo carries nobody's
domains. Full runbook in `DEPLOY.md`; first-time setup in `SETUP.md`.
