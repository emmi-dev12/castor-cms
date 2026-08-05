// The public face of Castor: what it is, who it's for, and where to get it.
// Rendered at / on the deployed app (where the admin dashboard is disabled),
// and locally via /?preview=landing so the owner can check it before shipping.
//
// The whole page runs on one idea, acted out with real masking tape instead of
// argued in copy: a client may repaint exactly what's exposed, and nothing
// taped over moves, no matter how hard they pull. Reading the page is already
// a small demo of using the product.

import { CONTRACT } from "./contract";
import { EditorDemo } from "./EditorDemo";
import { REPO_URL } from "./pricing";
import { RequestAccessForm } from "./RequestAccessForm";
import { Reveal } from "./Reveal";
import { ScrollFX } from "./ScrollFX";
import { TapeHero } from "./TapeHero";
import "./landing.css";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

// What the client controls, and what they can't. The single idea, made literal.
const EDITABLE = ["The words", "The photos", "Links and buttons", "Colours you allow"];
const LOCKED = ["The layout", "The structure", "Anything off-brand", "The code"];

// The real capabilities, in the product's own vocabulary.
const FEATURES = [
  {
    title: "Permissions, per site",
    body: "Tick exactly what each client may touch — text, images, links, colour, spacing. Any combination. Change it whenever.",
  },
  {
    title: "Colour, held on a leash",
    body: "Let a client recolour a heading with the real OS colour picker — or keep them to the swatches you chose. Their call, your limits.",
  },
  {
    title: "Draft, then publish",
    body: "Every edit lands in a private draft. Nothing goes live until someone presses Publish. No surprise changes on the real site.",
  },
  {
    title: "Every version kept",
    body: "Publishing snapshots the site. Going back to how it looked on Tuesday is one click — not a restore from a backup.",
  },
  {
    title: "Import a built site",
    body: "Drag a ZIP of an existing site onto the dashboard. It becomes editable, its own scripts still running, safely sandboxed.",
  },
  {
    title: "Undo that behaves",
    body: "⌘Z and ⇧⌘Z, without stealing the browser's own undo while your client is mid-sentence in a paragraph.",
  },
];

const FLOW = [
  {
    who: "You",
    what: "Tape it off",
    note: "Build the site your way, or import one you've already built. Decide what's structural — and what a client may repaint.",
  },
  {
    who: "Your client",
    what: "Paints inside the line",
    note: "They get a link and a password, click a headline, and type. No tickets, no invoice for fixing a typo.",
  },
  {
    who: "Castor",
    what: "Holds the tape down",
    note: "Every change is checked against the boundary you set before it saves. Nothing outside the line moves — ever.",
  },
];

// Illustrative only — Castor doesn't fabricate customer history; this is what
// the publish/rollback list looks like once a real site has some.
const VERSIONS = [
  { label: "v4 · spring hours", note: "live · today", live: true },
  { label: "v3 · new team photo", note: "roll back", live: false },
  { label: "v2 · launch copy", note: "roll back", live: false },
];

export function LandingPage() {
  return (
    <div className="landing">
      {/* A literal HTML comment, not renderable markup, so the direction
          contract survives the production build and is auditable by
          grepping the shipped HTML for "CONTRACT". */}
      <div style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: CONTRACT }} />

      <ScrollFX />

      <header className="hero">
        <div className="wrap">
          <nav className="nav">
            <span className="nav__brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- a static
                  SVG mark; next/image would add a loader for no benefit */}
              <img src="/logo.svg" alt="" width={28} height={28} className="nav__logo" />
              Castor
            </span>
            <span className="nav__right">
              <span className="mono nav__tag">Free &amp; open source</span>
              <a className="btn" href={REPO_URL} {...external}>
                GitHub
              </a>
            </span>
          </nav>

          <div className="hero__lede">
            <div data-parallax="-18">
              <h1 className="hero__title">
                Tape off what&rsquo;s <span className="ed">yours.</span>
                <br />
                Hand over the rest.
              </h1>
              <p className="hero__sub">
                Castor is the boundary between a website you built and a client who wants to help.
                Mark exactly what they can repaint — the words, a photo, one button&rsquo;s colour —
                and nothing outside the line moves, no matter how hard they lean on it.
              </p>
              <div className="hero__cta">
                <a className="btn btn--primary" href={REPO_URL} {...external}>
                  Get the code
                </a>
                <a className="btn" href="#demo">
                  Try the editor
                </a>
              </div>
              <p className="hero__terms">Free, self-hosted, AGPL-3.0. No subscription, no seat count.</p>
            </div>
            <div data-parallax="18">
              <TapeHero />
            </div>
          </div>
        </div>
      </header>

      {/* The thesis, made literal: one side taped over, one side exposed. */}
      <section className="section section--ruled">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">You lay the tape. Once.</h2>
              <p className="section__body">
                Most CMSes hand a client the whole dashboard and hope for the best. Castor hands
                them a page and a taped-off line. You decide which side of it each thing sits on.
              </p>
            </div>
          </Reveal>
          <div className="split">
            <Reveal>
              <div className="split__card split__card--edit">
                <span className="split__label hand">exposed — paint it</span>
                <ul className="split__list">
                  {EDITABLE.map((item) => (
                    <li key={item}>
                      <span>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="split__card split__card--lock">
                <span className="split__label">taped — locked</span>
                <ul className="split__list">
                  {LOCKED.map((item) => (
                    <li key={item}>
                      <span>&minus;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The proof: a working editor, in the page. */}
      <section className="section section--ruled" id="demo">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">Try to break it.</h2>
              <p className="section__body">
                This isn&rsquo;t a screenshot — type in the page below and it edits like the real
                thing. Then change what&rsquo;s permitted and reach for a colour it won&rsquo;t let you have.
              </p>
            </div>
            <EditorDemo />
          </Reveal>
        </div>
      </section>

      {/* How it works. */}
      <section className="section section--ruled">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">Three moves.</h2>
            </div>
          </Reveal>
          <div className="flow">
            {FLOW.map((step, i) => (
              <Reveal key={step.what} delay={i * 90}>
                <article className="flow__step" data-parallax={String(-8 - i * 12)}>
                  <p className="flow__who">{step.who}</p>
                  <h3 className="flow__what">{step.what}</h3>
                  <p className="flow__note">{step.note}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The capabilities. */}
      <section className="section section--ruled">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">Enough to hand over with a straight face.</h2>
            </div>
          </Reveal>
          <div className="grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 70}>
                <div className="cell">
                  <span className="cell__tab" aria-hidden="true" />
                  <h3 className="cell__title">{f.title}</h3>
                  <p className="cell__body">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Draft / publish / rollback. */}
      <section className="section section--ruled">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">Nothing goes live by accident.</h2>
              <p className="section__body">
                Edits sit in a draft until published. Each publish is kept forever, so undoing a
                bad week is one click.
              </p>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <span className="mono versions__label">Sample publish history</span>
          </Reveal>
          <div className="versions">
            {VERSIONS.map((v, i) => (
              <Reveal key={v.label} delay={i * 110} className="versions__slot">
                <div className="versions__row" data-live={v.live ? "yes" : "no"}>
                  <span>
                    {v.live ? <span className="pill pill--draft">live</span> : null} {v.label}
                  </span>
                  <span className="versions__muted">{v.note}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* The close: free, get it. */}
      <section className="section section--ruled" id="get">
        <div className="wrap">
          <Reveal>
            <div className="closer">
              <span className="stamp" aria-hidden="true">
                <span className="stamp__ring">
                  approved
                  <br />
                  for use
                </span>
                <span className="stamp__core">AGPL</span>
              </span>
              <h2 className="closer__title">
                It&rsquo;s <mark>free</mark>. Go build.
              </h2>
              <p className="closer__body">
                The source is public and yours to run — for as many client sites as you like, at no
                cost. It&rsquo;s open source (AGPL) — anything you build on it stays open too.
              </p>
              <div className="closer__cta">
                <a className="btn btn--primary" href={REPO_URL} {...external}>
                  Get the code on GitHub
                </a>
              </div>
              <p className="closer__reqs">Node · Vercel · MongoDB Atlas — free tiers are plenty</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Questions. */}
      <section className="section section--ruled" id="questions">
        <div className="wrap">
          <div className="access">
            <Reveal>
              <div className="section__head">
                <h2 className="section__title">Questions first?</h2>
                <p className="section__body">
                  Not sure it fits what you&rsquo;re building, or stuck getting it running? Ask —
                  you&rsquo;ll get a real answer from the person who wrote it.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <RequestAccessForm />
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="wrap foot">
        <span className="foot__brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static mark */}
          <img src="/logo.svg" alt="" width={20} height={20} className="nav__logo" />
          Castor
        </span>
        <span className="foot__links">
          <a href={REPO_URL} {...external}>
            GitHub
          </a>
          <a href="#demo">Demo</a>
          <a href="#get">Get it</a>
        </span>
        <span>Tape off what&rsquo;s yours. Hand over the rest.</span>
      </footer>
    </div>
  );
}
