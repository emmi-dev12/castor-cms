<div align="center">

<img src="web/public/logo.svg" width="76" alt="Castor">

# Castor

### Let clients edit. Not break.

Hand a client the keys to their own site. They change the words and the photos
in the browser — and **can't** move a section, pick a colour that isn't yours,
or touch the code.

Free · open source (AGPL-3.0) · self-hosted &nbsp;•&nbsp; [Try the editor ↗](https://castorcms.vercel.app/#demo) &nbsp;•&nbsp; [Setup guide](SETUP.md) &nbsp;•&nbsp; [Licence](LICENSE.md)

</div>

---

Most CMSes hand a client the whole dashboard and hope for the best. Castor hands
them a page and a fence — **you** decide which side each thing sits on.

| The client may edit | The client may never touch |
| --- | --- |
| The words, the photos | The layout |
| Links and buttons | The structure |
| Colours *you* allow | Anything off-brand |
| Spacing *you* allow | The code |

You build (or import) the site, tick exactly what each client can change, and
send them a link and a password. Every edit is checked before it saves, every
publish is kept for one-click rollback, and nothing goes live until someone
presses **Publish**.

> Castor itself contains **no AI** — the editor and its guardrails are fully
> deterministic. *Ingesting* an existing site is AI-driven, but that's an agent
> working **on** this codebase (see the `castor-ingest` skill), not a feature
> inside the product.

## How it works

```
   YOU (local)                       MongoDB Atlas            YOUR CLIENT (any browser)
   Admin dashboard  ──build/import──▶  shared database  ◀──edit──  /edit/<slug>
   • set permissions per site                                      • inline edit, in the page
   • master editor, full control                                   • Draft → Publish
        │                                                          • can't break the layout
        └───────────────── public site: your-app/<slug> ───────────────────┘
```

**One codebase, two modes.** The same Next.js app is the local admin dashboard
*and* the deployed client editor. Site-building, importing, structural editing
and the submission inbox run only locally; the deployed instance serves just the
password-gated editor and the public sites. Both share one MongoDB Atlas
database, so a site you build on your machine is instantly editable at its hosted
link.

## What's in it

- **Permissions, per site** — tick exactly what a client may change: text,
  images, links, text colour, section colours, spacing. Any combination, and a
  page can override the site's. Enforced by **the Guardian**, a deterministic
  policy engine every edit passes through before it touches the draft.
- **Click to edit** — click anything on the page and it's selected; the sidebar
  shows the controls for exactly that. A heading's colour, a button's colour and
  link, a section's background colour, background image and spacing — always scoped to what you picked, so
  you can see what you're changing.
- **Colour on a leash** — recolour a single heading or one button with the native
  OS colour picker, or hold the client to the swatches you chose. Per-element, and
  a separate permission from editing the words.
- **Draft → Publish → Rollback** — edits land in a private draft; publishing
  snapshots the whole site; rollback moves the live pointer to any past version.
  Every version is kept.
- **Import a built site** — drag a ZIP of HTML/CSS/JS onto the dashboard and it
  becomes editable. Imported pages render in a sandboxed iframe, so their own
  JavaScript still runs without reaching cookies or another client's site.
- **Undo/redo** — ⌘Z and ⇧⌘Z, without stealing the browser's own undo while the
  client is mid-sentence.
- **Forms** — drop in a `form` section; submissions land in a per-site inbox.
- **Auto-update, no re-ingest** — content lives in the database and rendering
  lives in code, so shipping a renderer improvement reaches *every existing
  site* with nothing to re-import.

**Content model:** `Site → Pages → Sections → Slots`. A section is a typed block
(`hero`, `text`, `features`, `testimonials`, `faq`, `gallery`, `form`, `cta`,
`footer`, or an imported page); a slot is one editable value (text, image, link,
colour, spacing).

## Quick start

Needs Node 20+, a free [MongoDB Atlas](https://cloud.mongodb.com) cluster, and a
[Vercel](https://vercel.com) account. Full walkthrough in **[SETUP.md](SETUP.md)**.

```bash
cd web
cp .env.example .env.local        # add MONGODB_URI + CMS_SESSION_SECRET + ADMIN_PASSWORD
npm install
npm run seed                      # writes a sample "acme" site
npm run dev                       # http://localhost:3000
```

Then:

- **`/`** — the dashboard (local only): import a site, set permissions, read the inbox.
- **`/edit/<slug>`** — the password-gated link you send a client.
- **`/admin/edit/<slug>`** — the owner's master editor (local only): full control.
- **`/<slug>`** — the public site.

## Commands (run from `web/`)

| | |
| --- | --- |
| `npm run dev` | local dev server (admin + import work here) |
| `npm run build` | production build |
| `npm run seed` | write the sample site to storage |
| `npm test` | unit tests — Guardian, passwords, ZIP import |
| `npm run lint` · `npx tsc --noEmit` | lint · typecheck |
| `npm run deploy` | deploy **and** re-point domain aliases ([DEPLOY.md](DEPLOY.md)) |

## Security, briefly

The client password is the whole boundary — the editor URL is guessable from the
public one — so it's taken seriously: login and form endpoints are rate limited
(per-IP plus a global per-site cap), passwords must pass a strength check and can
be generated with ~79 bits of entropy, sessions are HMAC-signed, and
`CMS_SESSION_SECRET` is required in production. The local admin sits behind
`ADMIN_PASSWORD`. Writes use optimistic locking, so a client and the owner
editing at once can't silently clobber each other.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind · MongoDB Atlas (filesystem
fallback for offline dev) · Playwright (local ingest) · deployed on Vercel.

The app lives in [`web/`](web) (the repo root has a space in its name, which npm
rejects as a package name). Architecture notes for contributors are in
[`CLAUDE.md`](CLAUDE.md); the hosting runbook is in [`DEPLOY.md`](DEPLOY.md).

## Roadmap & known limits

Castor is open source and early. It does one thing well — guarded content
editing for content sites — and deliberately isn't trying to be more than that.

**What it doesn't do (by design or not yet):**

- **It's for content sites, not apps.** It renders content from a database; it
  doesn't run your framework. A React/Next source project can't be imported —
  build it first and import the output.
- **Imported sites are frozen.** A ZIP import is a snapshot: every word is
  editable, but it won't restructure in the editor or pick up renderer
  improvements the way a native Castor site does.
- **Images are referenced by URL.** You paste an image link; there's no built-in
  upload/host step yet.
- **One owner.** A single admin password guards the dashboard — no multi-user or
  team roles.
- **Undo/redo covers content**, not structural changes (adding/moving/deleting
  sections and pages).
- **Free tiers are finite.** MongoDB Atlas M0 is 512 MB shared across every site
  and imported asset — plenty for brochure sites, tight for image-heavy imports.

**Ideas worth building (PRs welcome):** image uploads to blob storage, more
section types, richer form handling and notifications, team roles, and per-page
permission presets. Open an issue if you want to take one on.

## Licence

Castor is free and open source under the [GNU AGPL-3.0](LICENSE.md). Use it,
modify it, run it for as many clients as you like, commercially — the one
condition is that anything you build on it (including a version you host as a
service) stays open under the same licence. You can't take Castor closed-source.
