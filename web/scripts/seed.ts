// Local admin seed: creates a sample CMS-native site so we can exercise the
// full edit -> publish -> rollback loop. Run with:  npm run seed
//
// Uses the filesystem repository (no MONGODB_URI) -> writes web/.data/sites/acme.json

import { createSite, publish } from "../lib/sites/service";
import { ALL_PERMISSIONS } from "../lib/guardian/policy";
import type { SiteContent } from "../lib/model/types";

const content: SiteContent = {
  pages: [
    {
      id: "page_home",
      path: "",
      title: "Acme — Home",
      sections: [
        {
          id: "sec_hero",
          type: "hero",
          slots: [
            { id: "hero_headline", type: "text", label: "headline", value: "Coffee, roasted right." },
            {
              id: "hero_subhead",
              type: "text",
              label: "subhead",
              value: "Small-batch beans delivered to your door every week. Fresh, fair, unfussy.",
            },
            {
              id: "hero_cta",
              type: "button",
              label: "cta",
              value: { text: "Start your subscription", href: "#pricing" },
            },
            { id: "hero_accent", type: "color", label: "accent", value: "#0f172a" },
            { id: "hero_textColor", type: "color", label: "textColor", value: "#0f172a" },
            { id: "hero_padding", type: "space", label: "padding", value: "6rem" },
            {
              id: "hero_image",
              type: "image",
              label: "image",
              value: {
                src: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1200&q=60",
                alt: "A cup of freshly brewed coffee",
              },
            },
          ],
        },
        {
          id: "sec_features",
          type: "features",
          slots: [
            { id: "feat_heading", type: "text", label: "heading", value: "Why Acme" },
            { id: "feat_one_title", type: "text", label: "feature-one-title", value: "Freshly roasted" },
            { id: "feat_one_body", type: "text", label: "feature-one-body", value: "Roasted to order and shipped within 24 hours." },
            { id: "feat_two_title", type: "text", label: "feature-two-title", value: "Fairly sourced" },
            { id: "feat_two_body", type: "text", label: "feature-two-body", value: "Direct-trade beans from growers we know by name." },
            { id: "feat_three_title", type: "text", label: "feature-three-title", value: "Flexible plans" },
            { id: "feat_three_body", type: "text", label: "feature-three-body", value: "Pause, skip, or cancel anytime — no strings." },
          ],
        },
        {
          id: "sec_story",
          type: "text",
          slots: [
            { id: "story_heading", type: "text", label: "heading", value: "Our story" },
            {
              id: "story_body",
              type: "richtext",
              label: "body",
              value:
                "We started Acme in a tiny garage with one roaster and too many opinions about espresso. Today we serve thousands of homes — same obsession, bigger garage.",
            },
          ],
        },
        {
          id: "sec_cta",
          type: "cta",
          slots: [
            { id: "cta_heading", type: "text", label: "heading", value: "Ready for better mornings?" },
            { id: "cta_bg", type: "color", label: "bg", value: "#0f172a" },
            { id: "cta_padding", type: "space", label: "padding", value: "4rem" },
            { id: "cta_button", type: "button", label: "button", value: { text: "Get started", href: "#" } },
          ],
        },
        {
          id: "sec_footer",
          type: "footer",
          slots: [
            { id: "footer_text", type: "text", label: "text", value: "© Acme Coffee. Made with care." },
          ],
        },
      ],
    },
  ],
};

async function main() {
  const slug = "acme";
  const password = "letmein";
  await createSite({ slug, name: "Acme Coffee", password, permissions: ALL_PERMISSIONS, draft: content });
  await publish(slug, "initial seed");
  console.log(`Seeded site "${slug}" (password: ${password}) and published v1.`);
  console.log(`Public:  http://localhost:3000/${slug}`);
  console.log(`Editor:  http://localhost:3000/edit/${slug}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
