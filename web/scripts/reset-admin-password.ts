// Recover the local admin when the dashboard password is lost or wrong.
//
// A password changed from the dashboard is stored hashed and takes precedence
// over ADMIN_PASSWORD, so editing .env.local cannot get you back in. This is
// the way out. It only touches the settings store, never a site.
//
// Run from web/:
//   export MONGODB_URI="$(grep ^MONGODB_URI= .env.local | sed 's/^MONGODB_URI=//')"
//   npx tsx scripts/reset-admin-password.ts --clear          # fall back to ADMIN_PASSWORD
//   npx tsx scripts/reset-admin-password.ts --set 'new pass' # set a specific one
//   npx tsx scripts/reset-admin-password.ts                  # just report

import bcrypt from "bcryptjs";
import { MIN_ADMIN_PASSWORD_LENGTH } from "../lib/auth/adminSession";
import { assessPassword } from "../lib/security/passwords";
import { getRepository } from "../lib/storage/repository";

const SETTING = "adminPasswordHash";

async function main() {
  const repo = await getRepository();
  const args = process.argv.slice(2);
  const stored = await repo.getSetting(SETTING);

  console.log(`storage:  ${repo.constructor.name}`);
  console.log(`stored:   ${stored ? "a changed password is set" : "none — ADMIN_PASSWORD is in use"}`);
  console.log(`env:      ADMIN_PASSWORD is ${process.env.ADMIN_PASSWORD ? "set" : "NOT set"}`);

  if (args.includes("--clear")) {
    // Empty string rather than a delete: setSetting is the only writer both
    // repository implementations share, and "" is falsy everywhere it's read.
    await repo.setSetting(SETTING, "");
    console.log(
      process.env.ADMIN_PASSWORD
        ? "\nCleared. Sign in with ADMIN_PASSWORD from .env.local."
        : "\nCleared — but ADMIN_PASSWORD is not set, so the admin will refuse to load. Set it in .env.local.",
    );
    return;
  }

  const setIndex = args.indexOf("--set");
  if (setIndex !== -1) {
    const password = args[setIndex + 1];
    if (!password) {
      console.error("\n--set needs a password argument.");
      process.exitCode = 1;
      return;
    }
    const strength = assessPassword(password, MIN_ADMIN_PASSWORD_LENGTH);
    if (!strength.ok) {
      console.error(`\nRefused: ${strength.reason}`);
      process.exitCode = 1;
      return;
    }
    await repo.setSetting(SETTING, await bcrypt.hash(password, 10));
    console.log("\nSet. Sign in with the new password.");
    return;
  }

  console.log("\nNothing changed. Pass --clear or --set '<password>'.");
}

main().then(() => process.exit(process.exitCode ?? 0));
