---
name: Castor — Taped Line
description: The public marketing landing page's visual system — masking tape as the literal permission boundary. Scoped to web/components/marketing/ only; the product's own admin dashboard and client editor keep a separate, plain Tailwind/slate system this file does not govern.
colors:
  canvas: "#f4efe4"
  canvas-recessed: "#ebe1c9"
  card: "#fffdf6"
  ink: "#18130d"
  ink-soft: "#5b4d3a"
  faint: "#786646"
  hairline: "#dccfa9"
  hairline-deep: "#c9b98d"
  tape: "#e8b023"
  tape-ink: "#6b4a00"
  paint: "#b6392b"
  locked: "#211a12"
typography:
  display:
    fontFamily: "Alfa Slab One, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  hand:
    fontFamily: "Caveat, cursive"
    fontWeight: 700
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.7rem"
    letterSpacing: "0.18em"
rounded:
  xs: "3px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
components:
  button-primary:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "0.72rem 1.3rem"
  button-primary-hover:
    backgroundColor: "#f0bd35"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "0.72rem 1.3rem"
---

# Design System: Castor — Taped Line

**Scope.** This file documents the public marketing landing page only
(`web/components/marketing/`). Castor's product UI — the admin dashboard, the
owner's master editor, the client editor — is a separate, deliberately plain
Tailwind slate/white system that predates this world and is untouched by it.
Do not apply these tokens to `components/editor/`, `components/sections/`, or
any admin route. The two systems are allowed to disagree; `.landing` scopes
every rule below so they never leak into each other.

## Overview

**Creative North Star: "The Taped-Off Shop Window"**

Castor's whole pitch is that the owner decides exactly what a client may
touch, and the system enforces the line no matter how hard someone pulls at
it. Rather than argue this in copy over a dashboard screenshot — the category
default — the page acts it out: a mocked homepage sits behind real masking
tape, sign-paint yellow washes over the words and pictures a client may
repaint, and the tape strips genuinely lift on hover or tap, revealing a
permanent "PROTECTED" stamp underneath rather than an unlocked surface. The
interaction *is* the proof, not a decoration next to it.

The palette is warm and workshop-grounded — raw canvas, near-black ink, one
signal red — never the near-black-plus-neon-accent SaaS default, and never
cream-plus-serif. Type pairs a heavy stencilled slab display face with a plain
workhorse body face and a hand-lettered face reserved for short tape labels
only; the hand face never carries a sentence. Confirmed visual rejections:
software chrome of any kind (no browser bar, no dashboard mockup, no window
traffic-lights), and section-numbering used to imply order that doesn't exist.

**Key Characteristics:**
- Real masking tape, not a metaphor spoken about — a working peel interaction with a permanent "protected" state underneath
- Warm canvas ground, ink-dark text, one yellow "editable" signal, one red accent used sparingly
- A heavy slab display face, a hand-lettered face rationed to short labels, a plain body face
- Motion always starts from a fully visible, legible default — position can settle in, content is never hidden behind a trigger
- No kickers, no eyebrows, no numbering without real sequence, no hard-offset "neobrutalist" shadows — this world's depth is soft and paper-lifted, not blocky

## Colors

Warm and workshop-toned: a raw canvas ground, near-black ink, sign-paint
yellow as the one thing that means "you may touch this," and a single red used
only for the stamped/hazard accents.

### Primary
- **Sign-Paint Yellow** (`#e8b023`): the editable signal, end to end. Every
  wash marking a paintable region, every tape strip, the primary button, the
  "live" version pill, and the `.ed` word-highlight in body copy all use this
  one colour. Its rarity as the *only* "go" colour is the point — if
  something is yellow, it means a client can touch it.

### Neutral
- **Canvas** (`#f4efe4`): the page ground — raw, slightly textured (a hairline
  cross-hatch background-image), never stark white.
- **Recessed Canvas** (`#ebe1c9`): worn/inset panels — nav dividers, muted
  fills.
- **Card** (`#fffdf6`): paper-white surfaces (cards, form fields, the demo
  chrome) — warm, never `#fff`.
- **Ink** (`#18130d`): primary text and the "locked" card ground. Near-black,
  warm rather than cool.
- **Ink-Soft** (`#5b4d3a`): body copy secondary text (7.1:1 on canvas).
- **Faint** (`#786646`): captions and fine print (4.8:1 on canvas — chosen
  specifically to clear WCAG AA; the original draft value failed at 2.8:1).
- **Hairline** (`#dccfa9` / `#c9b98d`): dashed section rules and card borders.

### Tertiary
- **Signal Red** (`#b6392b`): the scroll-progress rule, the stamp badge, hazard
  corner marks on the "locked" card, form error text. Used sparingly — it
  marks warnings and officialdom, never decoration.

### Named Rules
**The One Yellow Rule.** Sign-paint yellow means "editable" everywhere on the
page — a tape strip, a text highlight, a button, a pill. It never appears as
plain decoration; if you reach for yellow, you are marking something a client
can touch.

## Typography

**Display Font:** Alfa Slab One (with system-ui fallback)
**Body Font:** Archivo (with system-ui fallback)
**Label/Mono Font:** Geist Mono (`ui-monospace` fallback)
**Hand Font:** Caveat — reserved for short tape labels only ("Layout",
"Structure", "yours to paint"); it never sets a full sentence.

**Character:** A heavy, stencil-cut slab carries every heading at full
commitment (Alfa Slab One ships one weight, already maximal); a plain
workhorse grotesk runs body copy so the display face stays the one loud
voice; a hand-lettered face marks the tape itself, grease-pencil style,
strictly rationed.

### Hierarchy
- **Display** (400, `clamp(2.4rem, 5.6vw, 4.4rem)`, 1.02 line-height): page H1
  and section H2s. No heading anywhere on the page uses a kicker/eyebrow above
  it — the heading carries its own weight.
- **Body** (400, `clamp(1.02rem, 1.4vw, 1.15rem)` for section intros / 1rem
  base elsewhere, 1.5–1.6 line-height): all prose.
- **Label** (400–700, 0.66–0.72rem, uppercase, 0.06–0.18em tracking): the
  mono "system voice" — pills, captions, stamp text.
- **Hand** (700, ~0.85–1.3rem): tape strip labels and the "exposed" card's
  label only.

### Named Rules
**The No-Kicker Rule.** No heading on this page is preceded by an eyebrow,
kicker, or overline label. This was corrected during finish review — the page
originally opened five section headings with a mono kicker; all five were
removed and the informational ones (e.g. "this is live, not a screenshot")
were folded into the following sentence instead. Do not reintroduce the
pattern to a new section.

## Layout

Single centered column (`max-width: 1120px`), fluid `clamp()`-based section
padding (`clamp(4rem, 9vw, 7.5rem)` block padding per section) rather than
fixed breakpoint steps. The hero splits to two columns above 940px (copy left,
the TapeHero rig right) and stacks below it. The feature grid steps
1 → 2 → 3 columns at 640px / 940px. Sections are separated by a dashed
hairline (`border-top: 1px dashed`), never a solid rule or a filled band.

## Elevation & Depth

Soft and paper-lifted, never blocky. Every shadow is blurred; the page does
not use the flat zero-blur "neobrutalist" offset shadow anywhere — that
pattern was present in an earlier draft (buttons, panels, the demo chrome,
the form) and was removed at finish review because this world never committed
to it as a material. The one place a harder-edged shadow belongs is the tape
strips themselves, and even those use a blurred `drop-shadow`, just a tighter
one at rest and a larger, softer one on lift — the *lift distance* signals
depth, not a hard edge.

### Shadow Vocabulary
- **Resting lift** (`box-shadow: 0 20px 40px -28px rgb(24 19 13 / 0.35)`):
  panels and cards at rest (`.rig__panel`, `.demo__chrome`).
- **Button hover** (`box-shadow: 0 10px 18px -10px rgb(24 19 13 / 0.4)`):
  paired with a small `translateY(-2px) rotate(-0.4deg)`.
- **Tape at rest** (`filter: drop-shadow(0 5px 8px rgb(24 19 13 / 0.32))`).
- **Tape lifted/peeled** (`filter: drop-shadow(0 26px 22px rgb(24 19 13 / 0.4))`),
  paired with `rotate` + `translate` + `scale(1.06)`.

### Named Rules
**The Blur-Always Rule.** Every shadow on this page has a blur radius greater
than zero. A hard offset shadow (`Npx Npx 0 0`) is a neobrutalist costume this
world never chose; if a new component wants depth, give it a soft lift, not a
block double.

## Shapes

Small, consistent radii — 3px on interactive controls (buttons, tape),
6–8px on medium surfaces (cells, versions rows, form fields), 10–12px on the
largest containers (the hero rig, the demo chrome, the closer band). Nothing
on the page uses a fully squared (0px) or fully round (pill, `999px`) corner
except the two things that are semantically pills: the mono status pills and
the CTA-adjacent tape flags, which read as sticky-note/label shapes, not
buttons.

The signature geometric device is the **torn tape edge**: a `clip-path`
zigzag applied to every "this is taped/locked" surface (`.tape`,
`.ed::before`), irregular rather than a uniform sawtooth — hand-generated with
varying peak heights so it reads as torn paper, not a repeating machine
pattern. This shape is reserved for the tape motif specifically; do not reuse
it as generic decoration elsewhere.

## Components

### Buttons
- **Shape:** 3px radius, 1px ink border.
- **Primary:** sign-paint yellow background, ink text, ink border — the
  page's only filled button colour.
- **Secondary:** card-white background, ink text, ink border — visually
  identical shape to primary, colour is the only differentiator.
- **Hover:** `translateY(-2px) rotate(-0.4deg)` plus the soft "button hover"
  shadow above. The slight rotation is deliberate — a perfectly axis-aligned
  lift reads as a generic UI hover; a hair of rotation reads as a physical
  object tilting.

### Cards / Containers
- **Corner style:** 8–10px depending on size (see Shapes).
- **Background:** card-white for neutral surfaces; a yellow-tinted wash
  (`color-mix(in srgb, tape 14–16%, card)`) with a dashed ink-yellow outline
  for anything marked "editable" (`.split__card--edit`, `.rig__wash`); solid
  `--locked` ink for anything marked "locked" (`.split__card--lock`).
- **Shadow strategy:** resting lift (see Elevation).
- **Border:** 1px hairline on neutral cards; dashed outline (not solid) on
  editable-wash surfaces, signalling "provisional/paintable" rather than
  "fixed."

### Inputs / Fields
- **Style:** 1px hairline border, 5px radius, canvas-coloured fill (not
  white) so fields read as part of the paper, not a separate UI layer.
- **Focus:** 2px solid paint-red outline, 2px offset — high-contrast and
  identical across every interactive element on the page (links, buttons,
  inputs, the tape strips themselves).

### Navigation
- Flat row, no background change, ink-coloured brand mark plus a plain
  bordered "GitHub" button. No active/current-page state exists (single-page
  scroll layout); anchor links (`#demo`, `#get`) use the same secondary-button
  styling as any other link.

### The Tape Strip (signature component)
A `<button>`, not a `<div>` — every strip is a real, keyboard-focusable
control with `aria-pressed`. At rest it sits at a small per-instance rotation
(a `--r` custom property) with the torn-edge clip-path and the resting-lift
shadow. On hover or with `data-peeled="true"`, it rotates further, translates
up and sideways, scales to 1.06, and its shadow grows and softens — reading
as a physical lift, not an opacity fade. A separate, permanently-present
element sits underneath at the same footprint (`.rig__under`), holding a
small red "NO" stamp and the word "protected" — peeling the tape never
changes what's underneath, which is the whole point: the boundary holds even
when pulled at.

## Do's and Don'ts

### Do:
- **Do** keep sign-paint yellow (`{colors.tape}`) as the *only* colour that
  means "editable" — do not introduce a second "this is touchable" colour.
- **Do** give every shadow a blur radius (see The Blur-Always Rule).
- **Do** let headings stand alone — no kicker, eyebrow, or overline label
  above any heading (see The No-Kicker Rule).
- **Do** default every piece of content to visible; motion may settle a
  position in, but must never gate visibility behind a scroll trigger or any
  other JS event.
- **Do** reserve the Caveat hand face for short tape labels; never set body
  copy or a full sentence in it.
- **Do** number a sequence only when the order itself carries information the
  reader needs (the three-step "how it works" flow qualifies; a feature grid
  of unordered capabilities does not).

### Don't:
- **Don't** add a dashboard-screenshot or browser-chrome hero — the whole
  point of this world is that it never shows software chrome, only the tape
  and the mocked page underneath it.
- **Don't** use a flat, zero-blur offset shadow (`Npx Npx 0 0`) anywhere on
  this page; it is a neobrutalist costume this world does not wear.
- **Don't** fake a colored `border-left`/`border-right` via an inset
  box-shadow on cards or list rows — this pattern was present on the
  "live" version row and the form's success state in an earlier draft and was
  removed at finish review.
- **Don't** apply any token in this file to `components/editor/` or
  `components/sections/` (the product UI) — that surface's plain
  Tailwind/slate system is separate and this file does not govern it.
