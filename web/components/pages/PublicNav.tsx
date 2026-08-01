// A minimal top nav linking between a site's pages. Only rendered on the
// public view when a site has more than one page — single-page sites (the
// common case) get no extra chrome.

import Link from "next/link";
import type { Page } from "@/lib/model/types";

export function PublicNav({
  slug,
  pages,
  currentPath,
}: {
  slug: string;
  pages: Page[];
  currentPath: string;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-6 py-3">
      {pages.map((p) => {
        const isCurrent = p.path === currentPath;
        const href = p.path === "" ? `/${slug}` : `/${slug}/${p.path}`;
        return (
          <Link
            key={p.path || "home"}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              isCurrent ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p.title || (p.path === "" ? "Home" : p.path)}
          </Link>
        );
      })}
    </nav>
  );
}
