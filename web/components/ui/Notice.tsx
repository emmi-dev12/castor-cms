// A simple centered message page (server-safe). Used for the polite
// root / unknown-slug / not-published screens.

import type { ReactNode } from "react";

export function Notice({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
    </div>
  );
}
