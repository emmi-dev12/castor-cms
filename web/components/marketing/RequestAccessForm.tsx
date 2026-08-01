"use client";

// The one conversion point on the landing page. Posts to /api/access-request,
// which stores the request where the owner already reads form submissions.

import { useState } from "react";

export function RequestAccessForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");

    const res = await fetch("/api/access-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        about: form.get("about"),
        trap: form.get("company"),
      }),
    }).catch(() => null);

    const data = (await res?.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
    if (!res || !data?.ok) {
      setState("idle");
      setError(data?.reason ?? "Couldn’t send that. Check your connection and try again.");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="access__done" role="status">
        <h3>Question sent</h3>
        <p>You’ll get a reply at that address, usually within a day.</p>
      </div>
    );
  }

  return (
    <form className="access__form" onSubmit={onSubmit}>
      <label className="field">
        <span>Name</span>
        <input name="name" required autoComplete="name" placeholder="Your name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@studio.com" />
      </label>
      <label className="field field--wide">
        <span>What do you want to know?</span>
        <textarea name="about" rows={3} placeholder="What you're building, or what you'd need it to do." />
      </label>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="trap"
      />

      <button className="btn btn--primary" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send question"}
      </button>
      {error ? (
        <p className="access__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
