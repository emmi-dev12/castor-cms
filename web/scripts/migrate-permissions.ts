// One-off migration: permission tiers -> per-capability permissions.
//
// Castor used to store a single `tier` ("locked" | "moderate" | "free") on each
// site, with an optional per-page override. It now stores an explicit set of
// switches, so the owner can allow any combination. This rewrites existing
// documents into the new shape, preserving what each client could already do.
//
// Safe to run more than once: a site that already has `permissions` is skipped.
//
// Run from web/:
//   export MONGODB_URI="$(grep ^MONGODB_URI= .env.local | sed 's/^MONGODB_URI=//')"
//   npx tsx scripts/migrate-permissions.ts          # report only
//   npx tsx scripts/migrate-permissions.ts --write  # actually write

import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS } from "../lib/guardian/policy";
import type { Permissions, Site } from "../lib/model/types";
import { getRepository } from "../lib/storage/repository";

type LegacyTier = "locked" | "moderate" | "free";

/** What each old tier allowed, expressed as the new switches. */
function fromTier(tier: LegacyTier | undefined): Permissions {
  switch (tier) {
    case "free":
      return { ...ALL_PERMISSIONS };
    case "moderate":
      // Content, plus colours and spacing kept to the palette and scale.
      return {
        text: true,
        images: true,
        links: true,
        textColor: true,
        sectionColors: true,
        spacing: true,
        colorRange: "palette",
        spacingRange: "scale",
      };
    case "locked":
    default:
      // Content only — and an absent tier is treated as the strictest option.
      return { ...DEFAULT_PERMISSIONS };
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const repo = await getRepository();
  const sites = await repo.listSites();

  let changed = 0;
  for (const site of sites) {
    const raw = site as unknown as Record<string, unknown>;
    const legacy = raw.tier as LegacyTier | undefined;

    if (raw.permissions) {
      console.log(`${site.slug.padEnd(20)} already migrated — skipped`);
      continue;
    }

    const permissions = fromTier(legacy);
    const pageNotes: string[] = [];
    for (const page of site.draft.pages) {
      const pageRaw = page as unknown as Record<string, unknown>;
      const pageTier = pageRaw.tier as LegacyTier | undefined;
      if (pageTier) {
        page.permissions = fromTier(pageTier);
        pageNotes.push(`${page.path || "home"}=${pageTier}`);
      }
      delete pageRaw.tier;
    }

    console.log(
      `${site.slug.padEnd(20)} tier=${legacy ?? "(none)"} -> ${describe(permissions)}` +
        (pageNotes.length ? ` [pages: ${pageNotes.join(", ")}]` : ""),
    );

    if (write) {
      (site as Site).permissions = permissions;
      delete raw.tier;
      // Compare-and-swap, so this can't clobber a concurrent edit.
      const ok = await repo.updateSite(site);
      if (!ok) {
        console.error(`  ! ${site.slug}: conflict — re-run the migration for this site`);
        continue;
      }
    }
    changed++;
  }

  console.log(
    write
      ? `\nMigrated ${changed} site(s).`
      : `\n${changed} site(s) would change. Re-run with --write to apply.`,
  );
}

function describe(p: Permissions): string {
  const on = (Object.keys(p) as (keyof Permissions)[]).filter((k) => p[k] === true);
  return `${on.join("+") || "nothing"} (colours: ${p.colorRange}, spacing: ${p.spacingRange})`;
}

main().then(() => process.exit(0));
