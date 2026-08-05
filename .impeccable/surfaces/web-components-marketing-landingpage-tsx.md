---
version: 1
slug: "web-components-marketing-landingpage-tsx"
primary_target: "web/components/marketing/LandingPage.tsx"
related_targets: []
---

## Scope

Public marketing landing page (`web/components/marketing/`), rendered at `/`
in production and via `/?preview=landing` locally. Mode: **Persuade**. Not
covered: the admin dashboard or client editor, which are a separate,
established Tailwind/slate system (see `DESIGN.md`'s Scope note).

## Audience, job, action, proof, constraints

- **Audience:** freelancers, small studios, and self-hosting developers who
  build websites for other people — broad, not exclusively technical.
- **Job:** decide whether Castor's permission mechanism (the Guardian) solves
  their actual problem — a client wrecking a design — better than "just don't
  give the client access" or a competing page-builder's tiered permissions.
- **Action:** get the code (`github.com/emmi-dev12/castor-cms`) or try the
  live in-page editor demo (`#demo`) first. Secondary: send a question via
  the contact form if unsure it fits.
- **Proof:** the TapeHero interaction itself (a real, working peel that always
  resolves to "protected"), and the live `EditorDemo` component further down
  the page, which is the actual editor UI, not a mockup.
- **Constraints:** no fabricated metrics, logos, or testimonials — the project
  is early and PRODUCT.md says so explicitly. The "sample publish history"
  list is explicitly labelled as illustrative, not real customer data.

## Chosen direction and memorable moment

**"Taped Line"** — a sign-painter's masking-tape world (see `DESIGN.md` for
the full token system). Assigned by the mandatory `concept-seed.mjs` roll
(seed key `afd8eb7f`, position 4 of 7 grounded directions the builder
generated), confirmed by the user via the decision page over three dealt
challengers (one-bit-desktop/marching-ants, endurance-motorsport-livery,
oscilloscope/signal-bench) and the standing category-default option.

The memorable moment: peeling a piece of tape in the hero and finding the
word "protected" still there. That's the whole pitch acted out, not argued.

## Unresolved decisions

- No `.impeccable/mocks/` comp exists for this direction (it was authored,
  not sourced from the skill's catalog), so there is no pixel-level approved
  comp to hold future edits against — judge new work here against
  `DESIGN.md`'s tokens and Do's/Don'ts instead.
- The "sample publish history" versions list and the six feature-grid items
  are static, hand-authored content, not pulled from a live data source; if
  the product later exposes real version history or usage data, this section
  should be revisited rather than assumed still illustrative.
- No A/B or analytics instrumentation exists on this page; "what converts"
  is currently a judgment call, not measured.
