---
name: castor-ingest
description: Ingest an existing live website into Castor as an editable site. Use whenever asked to clone, ingest, or import an existing site/URL into Castor. Hand-authors the site into typed Sections/Slots by reading the real source, rather than relying only on the Playwright auto-snapshot fallback.
---

# Castor site ingest

Turn a real, live website into an editable Castor site by reading it and
hand-authoring its pages as typed Sections/Slots (`lib/model/types.ts`,
`lib/model/sectionTemplates.ts`). This is a **faithful clone**, not a redesign.

## Non-negotiable fidelity rules

These are hard constraints, not suggestions:

1. **Replicate structure, layout, and navigation pattern exactly as observed.**
   If the source uses a collapsing/hamburger nav at the viewport you captured
   it at, the output must too — do not substitute a different nav pattern
   (e.g. a plain banner/list) because it seems simpler or clearer.
2. **Do not modernize, redesign, simplify, or "improve" the UX/IA.** Resist
   the urge to fix things you'd personally design differently. The job is to
   reproduce what's there, not to editorialize.
3. **Capture real copy verbatim.** Do not rewrite, summarize, or "clean up"
   text content. Use the actual words from the source.
4. **Use real image URLs and real brand colors** taken from the source, not
   placeholders or a palette you think looks better.
5. **Preserve page structure, page count, and section order** for every page
   you ingest, not just the homepage.
6. **If something can't be faithfully represented** in the current typed
   section vocabulary (`hero`, `text`, `features`, `testimonials`, `faq`,
   `gallery`, `form`, `cta`, `footer`), say so explicitly to the user rather
   than silently substituting a different design or dropping it.

If you're ever unsure whether a change counts as "faithful" vs. "improved,"
default to faithful and ask the user.

## Workflow

1. Read the live site: fetch/browse every page you're asked to ingest.
2. Enumerate each page's visually distinct blocks in order.
3. Map each block to the closest existing typed section in
   `lib/model/sectionTemplates.ts` — reuse that template's slot structure
   rather than inventing new section shapes.
4. Fill each slot with the real content per the fidelity rules above.
5. Persist the site using the existing site-creation path
   (`lib/sites/service.ts`, `lib/sites/adminOps.ts`, and the admin ingest API
   routes) — reuse existing creation/section code rather than writing new
   one-off scripts or bypassing the model.

## Fallback

A deterministic Playwright auto-snapshot exists at `lib/ingest/snapshot.ts`
(`raw-html` Section type, `web/app/api/admin/ingest/route.ts`). It freezes the
DOM pixel-for-pixel but only captures one viewport/one page and won't
auto-update its markup on redeploy (see root `CLAUDE.md`). Use it only when
faithful typed-section mapping genuinely isn't feasible for a given page.
