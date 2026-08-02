// The editor bridge injected into an imported page's sandboxed frame.
//
// The frame runs with `sandbox="allow-scripts"` and *without*
// `allow-same-origin`, so it sits in an opaque origin: the parent cannot reach
// into it, and its own scripts cannot read cookies or touch another client's
// site. That isolation is the point — but it also means the editor can't drive
// the page from outside.
//
// So the page drives itself. This script is injected server-side into the
// document, makes tagged elements editable, and reports changes outward with
// postMessage. The parent validates and persists them as normal, through the
// Guardian. Nothing here is trusted: it's a convenience for a legitimate
// editor, and every message it sends is re-checked server-side.

/**
 * Height reporting alone, for the public view. Without it the frame would need
 * a fixed height, which either clips a long page or leaves a gap under a short
 * one. Editing is not wired up here — a visitor gets no editing affordances.
 */
export function heightReporterScript(): string {
  return `
(function () {
  // Measure the BODY, never documentElement: documentElement.scrollHeight is
  // at least the viewport, which here is the iframe itself — so it would just
  // report back whatever height the frame already had and never shrink or grow.
  function contentHeight() {
    var b = document.body;
    return Math.max(b ? b.scrollHeight : 0, b ? b.offsetHeight : 0, 200);
  }
  function report() {
    parent.postMessage({ __castor: true, type: "height", height: contentHeight() }, "*");
  }
  document.addEventListener("DOMContentLoaded", report);
  window.addEventListener("load", report);
  window.addEventListener("resize", report);
  if (document.readyState !== "loading") report();
  new MutationObserver(report).observe(document.documentElement, { childList: true, subtree: true });
})();
`.trim();
}

/**
 * Returned as a <script> body. Kept dependency-free and small; it runs inside
 * someone else's page, so it touches nothing but its own tagged elements.
 */
export function editorBridgeScript(): string {
  return `
(function () {
  var TAG = "[data-slot-id]";

  function post(type, payload) {
    // The parent is a different (opaque) origin from here, so "*" is the only
    // usable target. The parent checks event.source before acting.
    parent.postMessage(Object.assign({ __castor: true, type: type }, payload), "*");
  }

  function wire() {
    document.querySelectorAll(TAG).forEach(function (el) {
      var id = el.getAttribute("data-slot-id");
      if (!id || el.__castorWired) return;
      el.__castorWired = true;

      if (el.tagName === "IMG") {
        el.style.outline = "2px dashed rgba(234,179,8,.9)";
        el.style.cursor = "pointer";
        el.addEventListener("click", function (e) {
          e.preventDefault();
          post("image", { slotId: id, src: el.getAttribute("src") || "", alt: el.getAttribute("alt") || "" });
        });
        return;
      }

      el.setAttribute("contenteditable", "true");
      el.style.outline = "1px dashed rgba(234,179,8,.6)";
      el.addEventListener("focus", function () {
        el.style.outline = "2px solid rgba(234,179,8,1)";
      });
      el.addEventListener("blur", function () {
        el.style.outline = "1px dashed rgba(234,179,8,.6)";
        post("text", { slotId: id, value: el.textContent || "" });
      });
    });
  }

  // Report height so the parent can size the frame to the content: a scrollbar
  // inside a scrollbar is miserable to edit in.
  //
  // Measured on the BODY, never documentElement — the latter is at least the
  // viewport, which is the iframe itself, so it would echo the current height
  // back and the frame could never shrink to fit.
  function reportHeight() {
    var b = document.body;
    post("height", { height: Math.max(b ? b.scrollHeight : 0, b ? b.offsetHeight : 0, 200) });
  }

  document.addEventListener("DOMContentLoaded", function () { wire(); reportHeight(); });
  window.addEventListener("load", reportHeight);
  if (document.readyState !== "loading") { wire(); reportHeight(); }
  // Late-rendering scripts can add nodes after load.
  new MutationObserver(function () { wire(); reportHeight(); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
`.trim();
}
