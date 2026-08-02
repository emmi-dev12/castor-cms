# Castor

A CMS for handing clients the keys to their site — not the code.

You build or clone a website, give a client a link and a password, and they edit
their own content (and, if you allow it, some of the design) right in the
browser. They can't break the layout, every change is versioned, and one click
rolls back. You run one dashboard locally; each client gets a hosted editing
link.

**Live demo:** [castorcms.vercel.app/swiss-allstar](https://castorcms.vercel.app/swiss-allstar)
— a real site rebuilt into Castor. The root of the deployment serves the
marketing landing page; the admin dashboard only runs locally.

**New here?** [SETUP.md](SETUP.md) takes you from a fresh clone to a client
editing their own live site. Licensed under [LICENSE.md](LICENSE.md).

> Castor itself contains **no AI** — the editor and its guardrails are fully
> deterministic. *Ingesting* an existing site into Castor is AI-driven, but
> that's an agent working **on** this codebase, not a feature inside the product.

---

## How it works

```
   YOU (local, on your Mac)            MongoDB Atlas             CLIENT (any browser)
   Admin dashboard  ───build/clone──▶  shared database  ◀──edit──  /edit/<slug>
   • import/build sites, permissions                               • inline edit + design
   • master editor, full control                                  • Draft → Publish
        │                                                          • can't break layout
        └────────────── public site: castorcms.vercel.app/<slug> ─────────────┘
```

**One codebase, two modes.** The same Next.js app is the local admin dashboard
*and* the deployed client editor. Admin features (site building, structural
editing, the site cloner, submission inboxes) are enabled only when it runs
locally; the deployed instance serves just the password-gated client editor and
the public sites. Both talk to one shared MongoDB Atlas database, so a site you
build locally is immediately editable at its hosted link (and public once you
publish it).

### Core ideas

- **Content model** — `Site → Pages → Sections → Slots`. A section is a typed
  block (`hero`, `text`, `features`, `testimonials`, `faq`, `gallery`, `form`,
  `cta`, `footer`) and a slot is one editable value (text, image, link, colour,
  spacing…).
- **The Guardian** — a deterministic policy engine that validates *every* edit
  before it touches the draft. You tick exactly what each client may change —
  text, images, links, text colour, section colours, spacing — and whether
  colours and spacing are limited to your palette and scale. Any combination
  works, and a page can override the site's.
- **Per-element text colour** — every heading and paragraph carries its own
  optional colour, picked with the native OS colour panel (or restricted to
  your palette).
- **Undo/redo** — ⌘Z and ⇧⌘Z in the editor, without hijacking the browser's own
  undo while the client is typing.
- **Draft → Publish → Rollback** — clients edit a private draft; publishing
  snapshots it as an immutable version and flips the live pointer; rollback just
  moves the pointer back. Every published version is kept.
- **Auto-update, no re-ingest** — content lives in the database and rendering
  lives in code, so redeploying renderer improvements (or editing content)
  reaches *every existing site* with nothing to re-import.
- **Forms** — drop in a `form` section and its submissions land in a per-site
  inbox you read from the local dashboard.
- **Import a built site** — drag a ZIP of HTML/CSS/JS onto the dashboard and it
  becomes an editable site. Imported pages render in a sandboxed iframe, so
  their own JavaScript still runs without being able to reach cookies or
  another client's site.

### Ingesting existing sites

Castor can turn an existing website into an editable Castor site. The reliable
path is **agent-driven** (see the `castor-ingest` skill): the agent reads the
real source or drives a real browser, then hand-authors the content into typed
sections — capturing real copy, images, and brand colours across every page. A
built-in Playwright auto-snapshot exists as a fallback but is deliberately not
the default (it freezes lazy-loaded content and only captures one page).

### Security, briefly

The client password is the whole boundary (the editor URL is guessable from the
public one), so it's taken seriously: login and form endpoints are rate limited
(per-IP and a global per-site cap), passwords must pass a strength check and can
be auto-generated with ~79 bits of entropy, sessions are HMAC-signed, and
`CMS_SESSION_SECRET` is required in production. The local admin (dashboard,
master editor, submissions inbox) is itself locked behind `ADMIN_PASSWORD` —
set it in `.env.local` — so it's not wide open to anyone who can reach the dev
server. Writes use optimistic locking so a client and the owner editing at
once can't silently clobber each other.

## Quick start

```bash
cd web
cp .env.example .env.local        # add MONGODB_URI + CMS_SESSION_SECRET + ADMIN_PASSWORD
npm install
npm run seed                      # writes a sample "acme" site
npm run dev                       # http://localhost:3000
```

- **Dashboard:** `/` (local only) — import a site, set what each client may
  change, open the submissions inbox, change the admin password.
- **Client editor:** `/edit/<slug>` — the password-gated link you send a client.
- **Owner master editor:** `/admin/edit/<slug>` (local only) — full control,
  unrestricted by the client's permissions, add/move/delete sections and pages.
- **Public site:** `/<slug>`.

## Commands (run from `web/`)

| | |
|---|---|
| `npm run dev` | local dev server (admin + import work here) |
| `npm run build` | production build |
| `npm run seed` | write the sample site to storage |
| `npm test` | unit tests (Guardian, passwords, ZIP import) |
| `npm run dist` | publish a snapshot to the buyer-facing repo (owner tooling) |
| `npm run lint` / `npx tsc --noEmit` | lint / typecheck |
| `npm run deploy` | deploy **and** re-point the aliases (see `DEPLOY.md`) |

## Tech

Next.js 16 (App Router) · TypeScript · Tailwind · MongoDB Atlas (filesystem
fallback for offline dev) · Playwright (local cloning) · deployed on Vercel.

The app lives in [`web/`](web) (the repo root has a space in its name, which npm
rejects as a package name). Architecture details for contributors are in
[`CLAUDE.md`](CLAUDE.md); the hosting runbook is in [`DEPLOY.md`](DEPLOY.md).
