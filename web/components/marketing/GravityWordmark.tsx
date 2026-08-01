"use client";

// The landing page's signature: the six letters of CASTOR fall under real
// gravity, collide, and settle on the baseline — the product thesis (everything
// lands where it belongs) as the first thing you see.
//
// Scrolling then takes over. As the hero leaves, each letter falls away again
// at its own rate, so the wordmark comes apart under the same gravity that
// assembled it. Scroll back up and it reassembles.
//
// The solver is a small axis-aligned rigid-body integrator written here on
// purpose: no dependency, no canvas. Letters stay real DOM text, so they remain
// selectable and legible to assistive tech.

import { useCallback, useEffect, useRef } from "react";

const LETTERS = ["C", "A", "S", "T", "O", "R"];

const GRAVITY = 2600; // px/s² — heavier than earth-scale so the drop reads fast
const RESTITUTION = 0.38; // energy kept on bounce
const FRICTION = 0.86; // horizontal damping on ground contact
const SLEEP_SPEED = 12; // px/s below which the wordmark is at rest
const SLEEP_FRAMES = 20; // consecutive calm frames before the loop stops

interface Body {
  x: number; // top-left, px within the stage
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  el: HTMLElement;
}

export function GravityWordmark() {
  const stageRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<Body[]>([]);
  const rafRef = useRef<number | null>(null);
  /** 0 = hero fully in view, 1 = hero fully scrolled past. */
  const scrollRef = useRef(0);

  // Physics position plus the scroll-driven fall-away, applied together so the
  // two never fight over the same transform.
  const draw = useCallback((b: Body, i: number) => {
    const p = scrollRef.current;
    const drift = p * p * (140 + i * 46); // later letters fall further
    b.el.style.transform = `translate3d(${b.x}px, ${b.y + drift}px, 0)`;
    b.el.style.opacity = String(Math.max(0, 1 - p * 1.35));
  }, []);

  const wake = useCallback(() => {
    if (rafRef.current !== null) return;
    let last = performance.now();
    let calm = 0;

    const step = (now: number) => {
      const stage = stageRef.current;
      if (!stage) {
        rafRef.current = null;
        return;
      }
      const bodies = bodiesRef.current;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      // Clamp dt so a backgrounded tab doesn't resume with one giant step
      // that tunnels every letter through the floor.
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      for (const b of bodies) {
        b.vy += GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (b.x < 0) {
          b.x = 0;
          b.vx = -b.vx * RESTITUTION;
        } else if (b.x + b.w > W) {
          b.x = W - b.w;
          b.vx = -b.vx * RESTITUTION;
        }
        if (b.y + b.h > H) {
          b.y = H - b.h;
          b.vy = -b.vy * RESTITUTION;
          b.vx *= FRICTION;
          if (Math.abs(b.vy) < 60) b.vy = 0; // stop micro-bouncing
        }
      }

      // Letter vs letter: resolve along the axis of least overlap and swap
      // velocity. Two passes settle a stack without a full constraint solver.
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i]!;
            const c = bodies[j]!;
            const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
            const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
            if (ox <= 0 || oy <= 0) continue;

            if (ox < oy) {
              const dir = a.x < c.x ? -1 : 1;
              a.x += ox * 0.5 * dir;
              c.x -= ox * 0.5 * dir;
              const avx = a.vx;
              a.vx = c.vx * RESTITUTION;
              c.vx = avx * RESTITUTION;
            } else {
              const dir = a.y < c.y ? -1 : 1;
              a.y += oy * 0.5 * dir;
              c.y -= oy * 0.5 * dir;
              const avy = a.vy;
              a.vy = c.vy * RESTITUTION;
              c.vy = avy * RESTITUTION;
            }
          }
        }
      }

      let fastest = 0;
      bodies.forEach((b, i) => {
        draw(b, i);
        fastest = Math.max(fastest, Math.abs(b.vx) + Math.abs(b.vy));
      });
      calm = fastest > SLEEP_SPEED ? 0 : calm + 1;

      if (calm < SLEEP_FRAMES) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null; // settled: the loop stops until the next layout
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [draw]);

  // Lay the letters out and (optionally) drop them in. Re-runs on resize so the
  // stage stays correct across breakpoints and rotation.
  const layout = useCallback(
    (drop: boolean) => {
      const stage = stageRef.current;
      if (!stage) return;
      const W = stage.clientWidth;
      const H = stage.clientHeight;

      bodiesRef.current.forEach((b, i) => {
        b.w = b.el.offsetWidth;
        b.h = b.el.offsetHeight;
        const gap = (W - b.w * LETTERS.length) / (LETTERS.length + 1);
        b.x = Math.max(0, gap + i * (b.w + gap));
        // Stagger the start heights so they land one after another.
        b.y = drop ? -H * (0.5 + i * 0.32) : H - b.h;
        b.vx = 0;
        b.vy = 0;
        draw(b, i);
      });
      if (drop) wake();
    },
    [draw, wake],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    bodiesRef.current = Array.from(stage.querySelectorAll<HTMLElement>("[data-letter]")).map(
      (el) => ({ x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, el }),
    );

    // Someone who asked for less motion gets the wordmark already assembled,
    // and no scroll-driven movement at all.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    layout(!still);

    const onResize = () => layout(false);
    window.addEventListener("resize", onResize);

    let ticking = false;
    const onScroll = () => {
      if (still || ticking) return;
      ticking = true;
      // Read and write inside one frame so scrolling never thrashes layout.
      requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const travel = rect.height + 260;
        scrollRef.current = Math.min(Math.max(-rect.top / travel, 0), 1);
        bodiesRef.current.forEach(draw);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [draw, layout]);

  return (
    <div className="gravity">
      <div ref={stageRef} className="gravity__stage" aria-hidden="true">
        {LETTERS.map((ch, i) => (
          <span key={i} data-letter className="gravity__letter">
            {ch}
          </span>
        ))}
      </div>
      {/* The stage is decorative to assistive tech; the word itself is not. */}
      <span className="sr-only">Castor</span>
      <div className="gravity__baseline" />
    </div>
  );
}
