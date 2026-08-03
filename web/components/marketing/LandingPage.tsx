// The public face of Castor: what it is, who it’s for, and one way in.
// Rendered at / on the deployed app (where the admin dashboard is disabled),
// and locally via /?preview=landing so the owner can check it before shipping.

import { EditorDemo } from "./EditorDemo";
import { GravityWordmark } from "./GravityWordmark";
import { INCLUDED, REPO_URL, REQUIREMENTS } from "./pricing";
import { RequestAccessForm } from "./RequestAccessForm";
import { Reveal } from "./Reveal";
import { ScrollFX } from "./ScrollFX";
import "./landing.css";

// Only a real external checkout opens in a new tab; the in-page fallback to the
// contact form must not.
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

const FLOW = [
  {
    what: "You build the site",
    note: "Design it however you like, or clone one that already exists. Castor turns it into named, editable slots.",
  },
  {
    what: "They edit their own words",
    note: "Your client gets a link and a password. They click the headline and type. No tickets, no invoices for a typo.",
  },
  {
    what: "Castor keeps it standing",
    note: "Every change is checked against what you allowed before it’s saved. The layout you shipped is the layout they keep.",
  },
];

const VERSIONS = [
  { label: "v4 · spring prices", note: "published today", live: true },
  { label: "v3 · new team photo", note: "roll back", live: false },
  { label: "v2 · launch copy", note: "roll back", live: false },
];

export function LandingPage() {
  return (
    <div className="landing">
      <ScrollFX />

      <header className="hero">
        <div className="wrap">
          <div className="hero__bar">
            <span className="hero__mark">
              {/* eslint-disable-next-line @next/next/no-img-element -- a static
                  SVG mark; next/image would add a loader for no benefit */}
              <img src="/logo.svg" alt="" width={26} height={26} className="hero__logo" />
              Castor
            </span>
            <a className="btn" href={REPO_URL} {...external}>
              GitHub
            </a>
          </div>

          <GravityWordmark />

          <div className="hero__lede">
            <div data-parallax="-30">
              <h1 className="hero__title">
                Hand over the <mark>keys</mark>, not the code.
              </h1>
            </div>
            <div data-parallax="30">
              <p className="hero__sub">
                Your client edits their own text and images in the browser. They can&rsquo;t move a
                section they shouldn&rsquo;t, pick a colour that isn&rsquo;t yours, or break the
                page you shipped.
              </p>
              <div className="hero__cta">
                <a className="btn btn--primary" href={REPO_URL} {...external}>
                  Get the code
                </a>
                <a className="btn" href="#demo">
                  Try the editor
                </a>
              </div>
              <p className="hero__terms">
                Free to run and free to keep. You host it, you own it, no subscription.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="demo">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">This is what your client gets.</h2>
              <p className="section__body">
                Type in the page below — it edits like the real thing. Then change what&rsquo;s
                permitted and try a colour it doesn&rsquo;t allow.
              </p>
            </div>
            <EditorDemo />
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2 className="section__title">Three moves, in order.</h2>
          </Reveal>
          <div className="flow">
            {FLOW.map((step, i) => (
              <Reveal key={step.what} delay={i * 90}>
                {/* Each card drifts a little more than the last, so the row
                    separates as it passes rather than moving as one slab. */}
                <article className="flow__step" data-parallax={String(-14 - i * 16)}>
                  <h3 className="flow__what">{step.what}</h3>
                  <p className="flow__note">{step.note}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">Nothing goes live until someone means it.</h2>
              <p className="section__body">
                Edits land in a draft. Publishing takes a snapshot and keeps it forever, so going
                back to Tuesday is one click — not a restore from backup.
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

      <section className="section" id="pricing">
        <div className="wrap">
          <Reveal>
            <div className="section__head">
              <h2 className="section__title">Free, and yours to keep.</h2>
              <p className="section__body">
                Castor is free and the source is public. Clone it, run it on your own hosting,
                and use it for as many client sites as you like — there is nothing to buy and
                no per-site fee to anyone.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="price__shared">
              <ul className="price__list">
                {INCLUDED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <a className="btn btn--primary price__buy" href={REPO_URL} {...external}>
                Get the code on GitHub
              </a>
              <p className="price__note">
                Use it for client work, commercially, at no cost. The one thing the licence
                asks is that you don&rsquo;t resell Castor itself.
              </p>

              <div className="price__reqs">
                <p className="price__reqs-title">What you&rsquo;ll need to run it</p>
                <ul>
                  {REQUIREMENTS.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="access">
        <div className="wrap access">
          <Reveal>
            <h2 className="section__title">Questions first?</h2>
            <p className="section__body">
              Not sure it fits what you&rsquo;re building, or stuck getting it running? Ask —
              you&rsquo;ll get a real answer from the person who wrote it.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <RequestAccessForm />
          </Reveal>
        </div>
      </section>

      <footer className="wrap foot">
        <span>Castor</span>
        <span>Built for one designer and their clients.</span>
      </footer>
    </div>
  );
}
