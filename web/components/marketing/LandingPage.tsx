// The public face of Castor: what it is, who it's for, and where to get it.
// Rendered at / on the deployed app (where the admin dashboard is disabled),
// and locally via /?preview=landing so the owner can check it before shipping.
//
// The whole page is built from the product's core distinction — what a client
// may edit (marked in the editable-highlight yellow) versus what's locked
// (spoken in the mono "system" voice). Reading it is a small demo of using it.

import { EditorDemo } from "./EditorDemo";
import { GravityWordmark } from "./GravityWordmark";
import { REPO_URL } from "./pricing";
import { RequestAccessForm } from "./RequestAccessForm";
import { Reveal } from "./Reveal";
import { ScrollFX } from "./ScrollFX";
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
    what: "Build the site",
    note: "Design it however you like, or import one you've already built. Castor turns it into named, editable slots.",
  },
  {
    who: "Your client",
    what: "Edits their words",
    note: "They get a link and a password, click a headline, and type. No tickets, no invoice for fixing a typo.",
  },
  {
    who: "Castor",
    what: "Holds the line",
    note: "Every change is checked against what you allowed before it saves. The layout you shipped is the layout they keep.",
  },
];

const VERSIONS = [
  { label: "v4 · spring hours", note: "live · today", live: true },
  { label: "v3 · new team photo", note: "roll back", live: false },
  { label: "v2 · launch copy", note: "roll back", live: false },
];

export function LandingPage() {
  return (
    <div className="landing">
      <ScrollFX />

      <header className="hero">
        <div className="wrap">
          <nav className="nav">
            <span className="nav__brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- a static
                  SVG mark; next/image would add a loader for no benefit */}
              <img src="/logo.svg" alt="" width={26} height={26} className="nav__logo" />
              Castor
            </span>
            <span className="nav__right">
              <span className="mono nav__tag">Free &amp; open source</span>
              <a className="btn" href={REPO_URL} {...external}>
                GitHub
              </a>
            </span>
          </nav>

          <GravityWordmark />

          <div className="hero__lede">
            <div data-parallax="-26">
              <p className="mono hero__eyebrow">
                A CMS for people who build sites for other people
              </p>
              <h1 className="hero__title">
                Let clients <span className="ed">edit</span>. Not break.
              </h1>
            </div>
            <div data-parallax="26">
              <p className="hero__sub">
                Hand a client the keys to their own site. They change the words and the photos in
                the browser — and can&rsquo;t move a section, pick a colour that isn&rsquo;t yours,
                or touch the code.
              </p>
              <div className="hero__cta">
                <a className="btn btn--mark" href={REPO_URL} {...external}>
                  Get the code
                </a>
                <a className="btn" href="#demo">
                  Try the editor
                </a>
              </div>
              <p className="hero__terms">
                Run it on your own hosting. No subscription, no seat count.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* The thesis, made literal: two columns, one you can touch, one you can't. */}
      <section className="section section--ruled">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <p className="mono section__eyebrow">The whole idea</p>
              <h2 className="section__title">You draw the line. Once.</h2>
              <p className="section__body">
                Most CMSes hand a client the whole dashboard and hope for the best. Castor hands
                them a page and a fence. You decide which side each thing sits on.
              </p>
            </div>
          </Reveal>
          <div className="split">
            <Reveal>
              <div className="split__card split__card--edit">
                <span className="perm perm--edit split__label">Editable</span>
                <ul className="split__list">
                  {EDITABLE.map((item) => (
                    <li key={item}>
                      <span>+</span>
                      <em className="split__mark">{item}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="split__card split__card--lock">
                <span className="perm perm--lock split__label">Locked</span>
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
              <p className="mono section__eyebrow">Live · not a screenshot</p>
              <h2 className="section__title">Try to break it.</h2>
              <p className="section__body">
                Type in the page below — it edits like the real thing. Then change what&rsquo;s
                permitted and reach for a colour it won&rsquo;t let you have.
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
              <p className="mono section__eyebrow">How it works</p>
              <h2 className="section__title">Three moves.</h2>
            </div>
          </Reveal>
          <div className="flow">
            {FLOW.map((step, i) => (
              <Reveal key={step.what} delay={i * 90}>
                <article className="flow__step" data-parallax={String(-10 - i * 14)}>
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
              <p className="mono section__eyebrow">What&rsquo;s in it</p>
              <h2 className="section__title">Enough to hand over with a straight face.</h2>
            </div>
          </Reveal>
          <div className="grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 70}>
                <div className="cell">
                  <p className="cell__no">{String(i + 1).padStart(2, "0")}</p>
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
              <p className="mono section__eyebrow">Draft &rarr; publish &rarr; roll back</p>
              <h2 className="section__title">Nothing goes live by accident.</h2>
              <p className="section__body">
                Edits sit in a draft until published. Each publish is kept forever, so undoing a
                bad week is one click.
              </p>
            </div>
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
              <h2 className="closer__title">
                It&rsquo;s <mark>free</mark>. Go build.
              </h2>
              <p className="closer__body">
                The source is public and yours to run — for as many client sites as you like, at no
                cost. It&rsquo;s open source (AGPL) — anything you build on it stays open too.
              </p>
              <div className="closer__cta">
                <a className="btn btn--mark" href={REPO_URL} {...external}>
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
                <p className="mono section__eyebrow">Ask a human</p>
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
        <span>Hand over the keys, not the code.</span>
      </footer>
    </div>
  );
}
