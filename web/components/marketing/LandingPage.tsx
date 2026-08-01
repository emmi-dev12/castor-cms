// The public face of Castor: what it is, who it’s for, and one way in.
// Rendered at / on the deployed app (where the admin dashboard is disabled),
// and locally via /?preview=landing so the owner can check it before shipping.

import { EditorDemo } from "./EditorDemo";
import { GravityWordmark } from "./GravityWordmark";
import { FOUNDING, FROM_PRICE, INCLUDED, PRIMARY_CTA, REQUIREMENTS, TIERS } from "./pricing";
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
            <span className="hero__mark">Castor</span>
            <a className="btn" href="#pricing">
              From {FROM_PRICE}
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
                <a
                  className="btn btn--primary"
                  href={PRIMARY_CTA.href}
                  {...(PRIMARY_CTA.external ? external : {})}
                >
                  Get the repo — {PRIMARY_CTA.price}
                </a>
                <a className="btn" href="#demo">
                  Try the editor
                </a>
              </div>
              <p className="hero__terms">
                {FOUNDING.active
                  ? `Founding price for the first ${FOUNDING.seats} buyers. You host it, you own it, no subscription.`
                  : "One-time payment. You host it, you own it, no subscription."}
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
                Type in the page below — it edits like the real thing. Then change the permission
                tier and try a colour it doesn&rsquo;t allow.
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
              <h2 className="section__title">Buy the code, not a subscription.</h2>
              <p className="section__body">
                You get the repository and run Castor on your own hosting. No monthly fee, no
                per-site cut, and nothing to lose access to — build for as many clients as you
                like.
              </p>
            </div>
          </Reveal>
          {FOUNDING.active ? (
            <Reveal delay={60}>
              <aside className="founding">
                <p className="founding__title">
                  Founding price — {FOUNDING.price}, first {FOUNDING.seats} buyers
                </p>
                <p className="founding__body">
                  Castor is new, and you&rsquo;d be taking a chance on it. The first{" "}
                  {FOUNDING.seats} people pay {FOUNDING.price} instead of {TIERS[0]!.price}. Same
                  code, same licence, same updates — just cheaper. In return I&rsquo;d like your
                  bug reports.
                </p>
                <a
                  className="btn btn--primary"
                  href={FOUNDING.href}
                  {...(FOUNDING.external ? external : {})}
                >
                  Get the founding price — {FOUNDING.price}
                </a>
              </aside>
            </Reveal>
          ) : null}

          <div className="prices">
            {TIERS.map((tier, i) => (
              <Reveal key={tier.id} delay={80 + i * 80}>
                <div className={`price ${tier.featured ? "price--featured" : ""}`}>
                  <div className="price__head">
                    <span className="price__name">{tier.name}</span>
                    <span className="price__amount">{tier.price}</span>
                    <span className="price__unit">once, no subscription</span>
                  </div>
                  <p className="price__who">{tier.who}</p>
                  <a
                    className={`btn price__buy ${tier.featured ? "btn--primary" : ""}`}
                    href={tier.href}
                    {...(tier.external ? external : {})}
                  >
                    Get the repo — {tier.price}
                  </a>
                  <p className="price__covers">{tier.covers}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={240}>
            <div className="price__shared">
              <p className="price__shared-title">
                Both tiers get exactly the same thing. Only the licence differs.
              </p>
              <ul className="price__list">
                {INCLUDED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="price__note">
                Paid through Gumroad. Send me your GitHub username and you&rsquo;ll get an invite
                the same day.
              </p>
              <p className="price__note">
                Updates for as long as Castor is maintained, at every tier. No renewal, and
                nothing to lose access to.
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
              Not sure it fits what you&rsquo;re building, or want to see it running on your own
              site before you buy? Ask — you&rsquo;ll get a real answer, not a sales sequence.
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
