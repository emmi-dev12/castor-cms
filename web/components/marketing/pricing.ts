// Where the landing page's calls-to-action point.
//
// Castor is free and the source is public, so there is no checkout: every CTA
// goes to the repository. Kept in one file so that changing the offer — or
// bringing back a paid tier — is a single edit rather than a hunt through JSX.
//
// Set CASTOR_REPO_URL to point at your own fork.

const configured = (process.env.CASTOR_REPO_URL ?? "").trim();

/** The public repository. */
export const REPO_URL = configured.startsWith("http")
  ? configured
  : "https://github.com/emmi-dev12/castor-cms";

/** What you get, in plain terms. */
export const INCLUDED = [
  "The whole codebase, public and free — not a template",
  "Deploy it on your own hosting, under your own domain",
  "Unlimited client sites, with no per-site fee to anyone",
  "The full editor: inline text, images, links, buttons and colours",
  "Permission switches, so you decide what each client can change",
  "Draft and publish, with every published version kept for rollback",
  "Import an existing built site from a ZIP",
  "Contact forms with a submission inbox",
];

/** What they need to run it, said plainly before they start. */
export const REQUIREMENTS = [
  "Node.js and a little comfort with a terminal",
  "A Vercel account (the free tier is enough)",
  "A MongoDB Atlas cluster (the free tier is enough)",
];
