# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Broad: anyone building websites for other people — freelancers, small studios,
and self-hosting developers alike. Two roles per deployment: the **owner**
(runs the local admin, builds or imports sites, sets what each client may
change) and the **client** (a non-technical person who edits their own site's
content through a password-gated link).

## Product Purpose

Castor lets someone who builds a website for a client hand that client a
self-service editor — without risking the client breaking the design or the
code. The owner builds or imports a site, decides exactly what's editable, and
the client edits within those rails. Drafts are private until published; every
published version is kept for one-click rollback.

## Positioning

The mechanism a competitor can't casually copy: **the Guardian**, a
deterministic, AI-free policy engine that validates every edit against
per-capability permissions (text, images, links, text colour, section colours,
spacing — each independently switchable, each with its own range) before it
touches the draft. Most CMSes are "editable" or "not editable." Castor lets the
owner draw the line anywhere, per site, per page, and enforces it server-side
regardless of what the editor UI shows.

Free and self-hosted under AGPL-3.0 (no SaaS tier, no seat pricing) is also
positioning, not just a licence choice: it competes with hosted page-builders
on cost and with closed source-available tools on trust.

## Operating Context

- **Local, one machine, one owner.** The admin dashboard, site building, ZIP
  import, and the owner's master editor run only on `localhost` in dev; they
  are disabled entirely when deployed.
- **Shared production database.** Local admin and the deployed client editor
  both read/write one MongoDB Atlas database, so a site built locally is
  immediately live at its hosted link.
- **Deployment is Vercel**, via `npm run deploy` (re-points custom domain
  aliases after each deploy — plain `vercel --prod` does not).
- **A client's whole session is one URL + one password** — `/edit/<slug>` plus
  a generated or client-chosen password. No client accounts, no client-side
  signup.
- **Two content origins**: hand-authored typed sections (AI/agent-driven
  ingest, or built directly in the admin) and ZIP-imported built sites
  (rendered in a sandboxed iframe, editable per-word, but structurally frozen).

## Capabilities and Constraints

- Content model: `Site → Pages → Sections → Slots`. A section is a typed block
  (hero, text, features, testimonials, faq, gallery, form, cta, footer),
  `raw-html` (agent/Playwright-driven clone), or `imported` (ZIP import,
  sandboxed iframe). A slot is one editable value: text, richtext, image,
  link, button, color, space, or list.
- Permissions are per-capability switches (not tiers): text, images, links,
  textColor, sectionColors, spacing — each on/off, plus colour and spacing
  range (palette/scale vs. any). Any combination is valid; a page may override
  the site's switches.
- Per-element colour: any individual text node or button/link carries its own
  optional colour, independent of the section's shared colour tokens.
- Section backgrounds (colour and image) are section-wide design choices,
  gated by `sectionColors`.
- Click-to-select editing in the admin/client editor: selecting an element
  surfaces exactly its own controls, rather than an undifferentiated sidebar.
- Undo/redo (⌘Z / ⇧⌘Z) covers slot-level content edits; it does not cover
  structural changes (add/move/delete section or page).
- Images are referenced by URL — no built-in upload/hosting step.
- Rate limiting, password-strength enforcement, and optimistic locking
  (compare-and-swap on `site.rev`) protect the client login, the public form
  endpoint, and concurrent edits.
- Free-tier ceiling: MongoDB Atlas M0 (512 MB) is shared across every site's
  content and imported assets on one deployment.
- Single admin password per deployment — no multi-user/team roles yet.
- Castor itself contains no AI; ingestion (turning an existing live site into
  Castor sections) is agent-driven, not a product feature.

## Brand Commitments

- Name: **Castor**. Landing-page tagline: "Tape off what's yours. Hand over
  the rest."
- Public repository: `github.com/emmi-dev12/castor-cms`. Copyright held by
  Matthew Hapnicks.
- Licensed under **GNU AGPL-3.0** (verbatim, for licence-detector compatibility
  — no prose preamble in `LICENSE.md`). Free to use, modify, and run
  commercially for client work; any shipped or hosted derivative must stay
  open under the same licence.
- The landing page (`web/components/marketing/`) commits to "Taped Line": a
  sign-painter's masking-tape world — raw canvas ground, near-black ink,
  sign-paint yellow marking what's editable, a torn-tape motif for every locked
  boundary, and a signature interactive hero (`TapeHero`) where real tape sits
  over the parts of a mocked homepage a client may never touch. See
  `DESIGN.md` for the full token system. This is scoped to the public
  marketing page only — the admin dashboard and client editor keep their own
  separate, plain Tailwind/slate system, which `DESIGN.md` does not govern.

## Evidence on Hand

- Live product: `castorcms.vercel.app` (marketing landing page at `/`, admin
  dashboard only on localhost).
- No customer testimonials, logos, press, or usage metrics exist yet — do not
  fabricate them. The project is early; the README says so directly.

## Product Principles

1. **The owner draws the line; the system enforces it.** Every capability is
   opt-in per site/page, and validated server-side — never trust the client UI
   alone to prevent an out-of-bounds edit.
2. **Draft is safe, publish is deliberate.** Nothing a client does is public
   until they explicitly publish; every publish is a kept, rollback-able
   version.
3. **No re-ingest for renderer improvements.** Content lives in the database,
   rendering lives in code, so shipping a better section renderer improves
   every existing typed-section site with zero migration.
4. **Open by licence, not just by price.** AGPL-3.0 is chosen deliberately:
   commercial use is unrestricted, but derivatives (including a hosted fork)
   must stay open. Future features should not quietly require closing the
   source to make sense (e.g. no proprietary-only add-ons).
5. **Self-hosted, low-ceremony.** Node + Vercel + MongoDB Atlas free tiers is
   the whole stack; new capabilities should not silently require a paid
   third-party service to function at small scale.

## Accessibility & Inclusion

No product-specific accessibility requirement has been confirmed beyond
standard web practice (visible focus states, keyboard operability). Not yet
audited formally.
