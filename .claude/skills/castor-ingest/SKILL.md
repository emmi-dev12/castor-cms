---
name: castor-ingest
description: >-
  Ingest a website — from a live URL, or (preferably, when available) a real
  source codebase — into Castor (this repo) as fully-editable, correctly-rendered, multi-page typed sections. Driven
  by the agent reading real source/DOM directly, not the automated Playwright
  DOM-snapshot pipeline (which freezes lazy-load placeholder skeletons instead
  of real content on JS-heavy sites, and only ever captures one page as an
  opaque blob). Use this whenever the user asks to ingest, clone, add, or bring
  a site or a codebase into Castor, or says a Castor clone "looks broken" /
  "rendered garbage" / lost content / is missing pages. Do not use Castor's
  /api/admin/ingest (Playwright auto-snapshot) as the default path — it is a
  known-unreliable fallback for a single, very simple static page only.
---

# Castor ingest — agent-driven, into typed multi-page sections

## Why this exists

Castor's automated `/api/admin/ingest` (Playwright: load → wait → freeze DOM →
tag slots) has two hard limits: it freezes whatever the DOM happens to look
like at snapshot time (lazy-loaded images become frozen placeholder skeletons
on real modern sites — not a tunable bug, just the ceiling of blind scraping),
and it only ever captures **one page** as a single opaque `raw-html` blob. A
real site is a **codebase**, not one rendered page — it has multiple routes,
real components, and real content files. Treating a screenshot of the
homepage as "the whole site" is exactly the failure mode to avoid: it's a
frontend that *pretends* to be the whole thing.

The fix is doing the research directly — reading real source when it's
available (ground truth, zero guessing), or driving a real browser and
confirming real content actually loaded when it isn't — then hand-authoring
the result into Castor's typed, multi-page content model.

## Step 0: what's your source?

**Prefer a real codebase over a live URL whenever one is available.** A live
URL only shows you the *rendered projection* of the site — lossy, and
sometimes (lazy-loading, client-side routing) actively misleading. The actual
source (a git repo, a local project folder, an exported CMS/static-site
generator project) is ground truth: exact copy strings, exact structure, exact
asset paths, and the *complete list of pages/routes* — no guessing which pages
exist or reverse-engineering copy from rendered text.

- **Full codebase available** (repo URL, or a local path the user gives you):
  go to Step 1A.
- **Only a live URL, no source access**: go to Step 1B (the real-browser
  research method).
- Either way, the goal is the **same multi-page Castor site** at the end —
  Step 2 onward is shared.

## Step 1A: reading a real codebase (preferred)

Clone or open the project. Identify its shape first — this determines where
content and pages live:

- **Next.js**: pages live in `app/**/page.tsx` or `pages/**.tsx`. Read the JSX
  directly for real copy; don't guess from component names.
- **Astro / Gatsby / Hugo / Jekyll / Eleventy**: content is usually in
  Markdown/MDX files (`content/`, `src/content/`, `_posts/`) plus templates —
  read the Markdown for the real copy, the templates for structure/section
  order.
- **Plain multi-page static HTML**: each `.html` file is a page; read them
  directly.
- **A CMS export or headless-CMS-backed site**: look for JSON/YAML content
  files, or a `content`/`data` directory — that's the real content, not the
  rendered markup.

For **every page/route** in the source, note: its path (this becomes
`Page.path`), its title, and its section-by-section content (headings, body
copy, stats, testimonials, FAQ, images). Find real image paths in the source
(`public/`, `assets/`, `static/`, import statements) — if the project has a
live deployed version, prefer hotlinking the *live* URL for each asset (Castor
images are URL-based, no upload storage — see Step 3); if there's no live
deployment, ask the user how they want images hosted before inventing a path.

**Cross-check against the rendered site if one exists** (same as Step 1B's
"wait and confirm real content loaded") — source code tells you what's
*supposed* to render, a quick look at the live site confirms it actually does
and gives you real brand colors from computed styles.

## Step 1B: no source — real-browser research

Navigate to the URL using your browser automation tool. **Wait and confirm
real content loaded** — screenshot or read the DOM; if you see placeholder
colors/skeletons instead of photos, scroll the page (triggers lazy-load) and
wait again before trusting what you extract. Don't rely on a plain HTTP fetch
alone for JS-rendered sites — it often returns almost nothing.

Extract, in order, **for every page** (see "Find every page" below, don't stop
at the homepage):
- **Copy**: headline, subhead, every section's heading + body, stats,
  testimonials (quote + author), FAQ (question + answer), footer text. Get the
  real text by reading the rendered DOM directly — don't invent copy.
- **Real image URLs**: query the DOM directly for `img.currentSrc || img.src`
  (by executing JavaScript in the page), filtered to meaningfully large
  images (e.g. `naturalWidth > 200`). This gives you the *actual* resolved
  photo URLs, not placeholders. Keep the `alt` text too — it often tells you
  which section an image belongs to.
- **Brand colors**: read a real CTA button's `getComputedStyle(...).
  backgroundColor` for the accent, and any dark band's background for the
  secondary/dark brand color.

**Find every page**: read the site's nav/header links (`document.querySelectorAll('nav a, header a')`)
and internal links in the footer to build the real page list, then visit each
one and repeat the extraction above. A "full codebase" ingest means the whole
site — Home, About, Services, Contact, whatever the real nav has — not just
the page you landed on.

## Step 2: map content onto Castor's typed sections

Castor's content model (`web/lib/model/types.ts`) is `Site → Pages → Sections
→ Slots`. A `Site` has multiple `Page`s (each with its own `path`); a
`Section.type` is a free string rendered by
`web/components/sections/SectionView.tsx`. Available types and what they need
(slot `label`s — see that file for the exact rendering):

| type | use for | slots |
|---|---|---|
| `hero` | page opener | `headline`, `subhead` (text), `cta` (button), `accent` (color), `image` |
| `text` | any heading+body block; **add an `image` slot and it becomes a 2-col photo+copy split** | `heading`, `body` (richtext), optional `image` |
| `features` | 3 short stat/feature cards | `heading`, `feature-{one,two,three}-title`, `feature-{one,two,three}-body` |
| `testimonials` | real quote+author cards (don't squash these into a text paragraph — use this type) | `heading`, `testimonial-{one,two,three}-quote` (richtext), `testimonial-{one,two,three}-author` |
| `faq` | native accordion, up to 6 Q&A pairs (don't squash into prose) | `heading`, `faq-{one..six}-q`, `faq-{one..six}-a` (richtext) |
| `gallery` | up to 4 extra photos with no natural text pairing | `heading`, `image-{one,two,three,four}` |
| `form` | a contact form whose submissions land in the site's inbox — use this for the source site's contact page instead of linking out | `heading`, `intro`, `field-{name,email,message}-label`, `submit-label`, `success`, `accent` (color) |
| `cta` | closing call to action | `heading`, `button`, `bg` (color) |
| `footer` | page footer | `text` |

**The point of this table is "no catch": if the real site has photos,
testimonials, or an FAQ, there is a typed section for them — don't drop or
squash real content to fit a narrower set of types.** If you hit content that
genuinely doesn't fit any type above, that's a real gap — extend
`SectionView.tsx` with a new case rather than lossily cramming it in (see
"Extending the section library" below).

Image slots use hotlinked URLs from the source (`{ src, alt }`); color slots
are hex strings; the Guardian (`lib/guardian/validate.ts`) sanitizes everything
regardless, so this is safe.

**Every page you found in Step 1 becomes its own `Page`** in the site's
`pages[]` array, each with its own `path` (e.g. `""` for home, `"about"`,
`"contact"` — no leading slash) and its own `sections[]`. Do not build only
the homepage and call the ingest done if the real site has more pages.

**Slot ids must be unique across the whole site**, not just within a page — a
duplicate id makes `findSlot` edit the wrong slot. On a multi-page ingest use a
per-page prefix helper (see the reference script) rather than hand-numbering.

Page paths have no reserved words — the editor lives at its own top-level
`/edit/[slug]` prefix, so a page path of literally `"edit"` is fine. What IS
reserved is the **site slug**: `"edit"`, `"admin"`, and `"api"` can't name a
site (they'd collide with top-level routes); `createSite`/`createSiteFromClone`
reject them.

### For raw-html clone sections, one label matters more than others
If a section still ends up as `raw-html` (rare — prefer typed sections; this
is only for content genuinely too bespoke to model), its `label` conventions
don't apply the same way — see `lib/ingest/tokens.ts` for how those are
substituted. Typed sections are strongly preferred: they're what makes the
result actually editable per-slot rather than one big blob.

## Step 3: write it into Castor
Don't hand-build JSON in the chat — write a small one-off TypeScript script
under `web/scripts/` (see `web/scripts/reingest-swiss-allstar.ts` for a
worked single-page example, or `web/scripts/add-test-page.ts` for how a second
`Page` gets pushed onto `site.draft.pages`) that constructs a `SiteContent`
(with one or more `pages[]`) and calls:

```ts
import { createSite, publish } from "../lib/sites/service";
await createSite({ slug, name, password, draft: content }); // upserts, all pages at once
// `permissions` is optional and defaults to content-only (text/images/links).
// Pass one of the PRESETS from lib/guardian/policy.ts to widen it.
await publish(slug, "agent-driven ingest");
```

Run it against the **shared Atlas DB** (local admin and the Vercel deploy read
the same database), not the local filesystem fallback:

```bash
cd web
MONGODB_URI="$(grep -E '^MONGODB_URI=' .env.local | sed 's/^MONGODB_URI=//')" \
  npx tsx scripts/reingest-<slug>.ts
```

## Step 4: verify — locally first, then on the live domain
1. `npm run dev`, open `http://localhost:3000/<slug>` for the home page and
   `http://localhost:3000/<slug>/<path>` for every other page you ingested.
   Confirm every page renders with real content and real images (no
   placeholders, nothing missing), and that the top nav (auto-shown when a
   site has more than one page) lets you click between them.
2. Log into `http://localhost:3000/edit/<slug>` (the editor lives under the
   top-level `/edit/*` prefix, not `/<slug>/edit`), confirm the **Pages**
   sidebar panel lists every page and switches between them
   (`/edit/<slug>/<path>`), and that editing works on each.
3. If you changed `SectionView.tsx` (new section type) or any other code,
   deploy: `npm run deploy` (wraps `web/scripts/deploy.sh`) — **not** a bare
   `vercel --prod`. Custom aliases like `castorcms.vercel.app` are *static*
   pointers set via `vercel alias set`; they do **not** auto-follow new
   deployments the way the project's own `<name>.vercel.app` domain does. A
   bare `vercel --prod` will silently leave the custom domain serving the old
   build — `npm run deploy` re-points the aliases every time.
4. If you only changed *content* (no code/component changes), no redeploy is
   needed — the already-deployed app reads content from Atlas live.
   Either way, **existing sites auto-update with no re-ingest**: content
   lives in the DB and rendering in code, so a redeploy applies renderer/
   section improvements to every site, and content edits show immediately
   (the public/edit routes are `force-dynamic`). Only re-ingest a site if
   you want to *replace* its content, never just to pick up code changes.
5. Re-verify on the real domain (`https://castorcms.vercel.app/<slug>` and its
   sub-pages), not just localhost — check via DOM queries (image count,
   `blockquote`/`details` counts, number of nav links) as well as a
   screenshot, since a stale-alias deploy can look plausible in a screenshot
   while actually serving old code.

## Extending the section library

If a site needs a layout none of the existing types support well, add a new
`case` to the `switch (section.type)` in `SectionView.tsx` rather than forcing
content into an ill-fitting type. No content-model changes are needed —
`Section.type` is already a free string and slot types (`text`, `richtext`,
`image`, `color`, `space`, etc.) are already generic. Follow the existing
pattern: a `slotByLabel` lookup per named slot, Tailwind classes matching the
existing typed-section look (slate/white palette, rounded-xl cards), and
respect the `textColor`/`padding`/`accent`/`bg` design-token slots other
sections already support so the Guardian's permission switches keep working
uniformly — a slot labelled `textColor` is gated by the `textColor`
permission, any other colour slot by `sectionColors`. Typecheck (`npx tsc --noEmit`) before deploying.

## Before you start: is this a job for ZIP import?

Castor can import a **built** site directly (`lib/import/`, the "Import a site"
box on the dashboard, or `POST /api/admin/import`). It unzips the output, stores
assets by content hash, rewrites links, tags text and images as editable slots,
and renders each page in a sandboxed iframe so the site's own JavaScript keeps
working.

Use ZIP import when:
- the user already has built output (a `dist/`, `out/`, `_site/`, an export from
  Webflow/Framer/Astro/Eleventy), and
- pixel-exact fidelity matters more than the site being restructured.

Hand-author into typed sections (the rest of this skill) when:
- there's no built output, only a live URL or a source project, or
- the site should become a *Castor-native* site — one that keeps improving as
  Castor's section renderers improve.

The trade-off is real and worth stating to the user: an imported page is a
frozen document. It will not pick up renderer improvements the way typed
sections do, and its layout can't be restructured in the editor. A typed-section
ingest is more work up front and better afterwards.

Never try to "import" a source project by building it — Castor does not run
customer build tooling. Ask the user to build it and zip the output.

## Per-slot text colour

`text` and `richtext` slots carry an optional `color`, so each piece of text is
coloured independently:

```ts
{ id: "hero_headline", type: "text", label: "headline", value: "…", color: "#b91c1c" }
```

Use it to reproduce a source that colours individual words or headings
differently — previously the only option was a section-wide `textColor` token,
which forced everything in the section to one colour. Leave it unset to inherit.
Whether a client may change it is a separate permission (`textColor`) from the
words themselves (`text`), so setting it during ingest never widens what the
client can do.

## Permissions on a new site

There are no tiers. `createSite` defaults to content-only (text, images, links)
and nothing visual, which is the right default for a client site. To widen it,
pass `permissions` from `lib/guardian/policy.ts` (`DEFAULT_PERMISSIONS`,
`ALL_PERMISSIONS`, or one of `PRESETS`). The owner can change it at any time
from the dashboard, so don't agonise over it during ingest.

## Reference: a known-good ingest
`web/scripts/reingest-swiss-allstar.ts` is the canonical example — a real
**multi-page** ingest of `swissbasketballcamp.com` via the real-browser path.
Its routes were enumerated from the site's own nav/footer links, then each page
visited and its copy read from the rendered DOM:

- `/` — hero, photo+text safety, 3-stat `features`, `testimonials`, photo+text
  training and community, `cta`, `footer`
- `/camp-informationen` — hero, facts `features`, three photo+text blocks,
  a `testimonials` card, a 6-question `faq`, `cta`
- `/anmeldung` — hero, pricing `features`, two text blocks, `cta`
- `/kontakt` — a `form` section (enquiries land in the Castor inbox) + `footer`

Note its per-page slot-id prefix helper, and that boilerplate routes
(impressum/datenschutz/agb) and an external booking flow were deliberately
**not** modelled — ingest the content pages, not every URL.
Live at `https://castorcms.vercel.app/swiss-allstar`.
`web/scripts/add-test-page.ts` shows the minimal shape of pushing one extra
`Page` onto an existing site's `pages[]`.
