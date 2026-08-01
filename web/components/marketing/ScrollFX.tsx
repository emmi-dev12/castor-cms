"use client";

// Page-level scroll behaviour, in one place and one listener:
//
//  • a progress rule across the top, so long-page position is always readable
//  • parallax for anything tagged [data-parallax="<speed>"] — positive drifts
//    down, negative drifts up, relative to the element's distance from centre
//
// All work happens inside a single rAF per scroll event, and only transforms
// are written, so nothing here forces a layout. Reduced motion opts out
// entirely (the progress rule stays — it's information, not decoration).

import { useEffect } from "react";

export function ScrollFX() {
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>("[data-scrollbar]");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = still
      ? []
      : Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]")).map((el) => ({
          el,
          speed: Number(el.dataset.parallax) || 0,
        }));

    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(doc.scrollTop / max, 1) : 0})`;

      const mid = window.innerHeight / 2;
      for (const t of targets) {
        const rect = t.el.getBoundingClientRect();
        // Distance of this element's centre from the viewport centre, so the
        // drift reads as depth rather than as a jump at the top of the page.
        const offset = (rect.top + rect.height / 2 - mid) / window.innerHeight;
        t.el.style.transform = `translate3d(0, ${(offset * t.speed).toFixed(2)}px, 0)`;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return <div className="progress" aria-hidden="true" data-scrollbar />;
}
