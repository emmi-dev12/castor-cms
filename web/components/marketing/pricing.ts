// Pricing, in one place so the numbers and checkout links can change without
// touching the page.
//
// Both tiers deliver exactly the same thing: access to the repository. What
// differs is who the licence covers — one person, or a company. Nothing is
// held back from the cheaper tier, and the page says so.
//
// Checkout links come from the environment. Set these in the Vercel project
// (and web/.env.local for dev):
//
//   GUMROAD_URL_PERSONAL=https://yourname.gumroad.com/l/castor
//   GUMROAD_URL_BUSINESS=https://yourname.gumroad.com/l/castor-business
//   GUMROAD_URL_FOUNDING=https://yourname.gumroad.com/l/castor-founding
//
// GUMROAD_URL still works as a fallback for the personal tier. Until a link is
// set, buy buttons fall back to the contact form on the page — a link that
// goes somewhere useful beats a dead one, so the page is never broken while
// the product listings are still being written.

const env = (name: string) => (process.env[name] ?? "").trim();

/** A checkout href, or the on-page contact form when none is configured. */
function checkout(...candidates: string[]): { href: string; external: boolean } {
  const url = candidates.find((c) => c.startsWith("http"));
  return url ? { href: url, external: true } : { href: "#access", external: false };
}

/**
 * The launch offer: the first buyers get in at half price in exchange for
 * taking a chance on something with no track record. Price is the only
 * difference — every tier gets the same code and the same updates, so there's
 * no per-buyer policy to track later.
 *
 * Set FOUNDING_SEATS=0 to end it — the banner disappears and the personal tier
 * goes back to full price everywhere on the page.
 */
const seats = Number(env("FOUNDING_SEATS") || "10");

export const FOUNDING = {
  active: Number.isFinite(seats) && seats > 0,
  seats,
  price: "$99",
  ...checkout(env("GUMROAD_URL_FOUNDING"), env("GUMROAD_URL_PERSONAL"), env("GUMROAD_URL")),
};

export interface Tier {
  id: string;
  name: string;
  price: string;
  who: string;
  covers: string;
  href: string;
  external: boolean;
  featured?: boolean;
}

export const TIERS: Tier[] = [
  {
    id: "personal",
    name: "Personal",
    price: "$199",
    who: "One freelancer, building for their own clients.",
    covers: "Covers you, on unlimited client sites.",
    featured: true,
    ...checkout(env("GUMROAD_URL_PERSONAL"), env("GUMROAD_URL")),
  },
  {
    id: "business",
    name: "Business",
    price: "$499",
    who: "A studio or agency, with more than one person touching the code.",
    covers: "Covers everyone at your company, on unlimited client sites.",
    ...checkout(env("GUMROAD_URL_BUSINESS")),
  },
];

/** Cheapest price on offer right now — used in the header and hero. */
export const FROM_PRICE = FOUNDING.active ? FOUNDING.price : TIERS[0]!.price;

/** The hero's primary button follows the best available deal. */
export const PRIMARY_CTA = FOUNDING.active
  ? { href: FOUNDING.href, external: FOUNDING.external, price: FOUNDING.price }
  : { href: TIERS[0]!.href, external: TIERS[0]!.external, price: TIERS[0]!.price };

/** Identical for every tier — the product is the same, the licence isn't. */
export const INCLUDED = [
  "Access to the private repository — the whole codebase, not a template",
  "Deploy it on your own hosting, under your own domain",
  "Unlimited client sites, with no per-site fee to anyone",
  "The full editor: inline text, images, links, buttons and colours",
  "Permission tiers, so you decide what each client can change",
  "Draft and publish, with every published version kept for rollback",
  "Contact forms with a submission inbox",
  "Every future update, for as long as Castor is maintained",
];

/** What they need to run it, said plainly before they buy. */
export const REQUIREMENTS = [
  "Node.js and a little comfort with a terminal",
  "A Vercel account (the free tier is enough)",
  "A MongoDB Atlas cluster (the free tier is enough)",
];
