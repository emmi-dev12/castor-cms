"use client";

// The landing page's signature: a mock homepage with real masking tape laid
// across the parts of it a client may never touch. The exposed, yellow-washed
// regions — headline, photo, button — are what's handed over. This isn't
// decoration around the pitch; it IS the pitch, the same distinction the
// product enforces, acted out with tape instead of a policy engine.
//
// Hover or tap a strip and it lifts — peeling reveals what's underneath is
// still stencilled "PROTECTED," never an unlocked surface. The interaction
// exists to prove the boundary holds even when someone pulls at it, which is
// the one thing a screenshot of the real product cannot demonstrate here.

import { useState } from "react";

type StripStyle = React.CSSProperties & { "--r"?: string };

interface Strip {
  id: string;
  label: string;
  box: StripStyle;
}

const STRIPS: Strip[] = [
  { id: "frame", label: "Layout", box: { top: "-16px", left: "-4%", width: "58%", height: "40px", "--r": "-4deg" } },
  // Centred on the nav's own dashed divider (measured ~51px down at rest) so
  // it never fights the headline wash's "yours to paint" flag just below it.
  { id: "nav", label: "Structure", box: { top: "28px", left: "10%", width: "46%", height: "38px", "--r": "2.5deg" } },
  { id: "foot", label: "Code", box: { bottom: "-10px", right: "-3%", width: "44%", height: "38px", "--r": "-2deg" } },
];

export function TapeHero() {
  const [peeled, setPeeled] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setPeeled((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="rig">
      <p className="rig__tag">
        <span className="rig__pin" aria-hidden="true" />
        client-site.example
      </p>

      <div
        className="rig__panel"
        role="group"
        aria-label="Demonstration: taped areas are locked, washed areas are editable"
      >
        {/* The mock page underneath — never real content, just the shapes a
            homepage is made of. */}
        <div className="rig__nav">
          <span className="rig__dot" />
          <span className="rig__navline" />
        </div>

        <div className="rig__wash rig__wash--head">
          <span className="rig__flag">yours to paint</span>
          <span className="rig__bar rig__bar--h1" />
          <span className="rig__bar rig__bar--h2" />
        </div>

        <div className="rig__row">
          <div className="rig__wash rig__wash--photo">
            <span className="rig__flag">yours to paint</span>
            <span className="rig__hatch" />
          </div>
          <div className="rig__wash rig__wash--copy">
            <span className="rig__bar" />
            <span className="rig__bar" style={{ width: "88%" }} />
            <span className="rig__bar" style={{ width: "62%" }} />
            <span className="rig__pill">Book a table</span>
          </div>
        </div>

        <div className="rig__footline" />

        {/* What's underneath the tape, always present, revealed by the tape
            lifting away rather than by toggling this layer's own visibility —
            the point is that peeling changes nothing about the answer. */}
        {STRIPS.map((s) => (
          <span key={`${s.id}-under`} className="rig__under" style={s.box} aria-hidden="true">
            <span className="rig__stamp">NO</span>
            protected
          </span>
        ))}

        {STRIPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="tape"
            style={s.box}
            data-peeled={peeled[s.id] ? "true" : "false"}
            onClick={() => toggle(s.id)}
            aria-pressed={!!peeled[s.id]}
            aria-label={`${s.label} — locked. Press to try peeling the tape.`}
          >
            <span className="tape__label">{s.label}</span>
          </button>
        ))}
      </div>

      <p className="rig__caption">
        Tape marks what&rsquo;s locked. Peel one back — it still says no.
      </p>
    </div>
  );
}
