// One-off: add a second page to "acme" to verify multi-page routing end to end.
// Run with: npx tsx scripts/add-test-page.ts

import { getRepository } from "../lib/storage/repository";
import { newId } from "../lib/model/content";
import { publish } from "../lib/sites/service";

async function main() {
  const repo = await getRepository();
  const site = await repo.getSite("acme");
  if (!site) throw new Error("acme site not found — run npm run seed first");

  if (!site.draft.pages.some((p) => p.path === "about")) {
    site.draft.pages.push({
      id: newId("page"),
      path: "about",
      title: "About Acme",
      sections: [
        {
          id: newId("sec"),
          type: "text",
          slots: [
            { id: newId("s"), type: "text", label: "heading", value: "About Acme" },
            {
              id: newId("s"),
              type: "richtext",
              label: "body",
              value: "This is a second page, added to verify Castor's multi-page routing.",
            },
          ],
        },
      ],
    });
    await repo.putSite(site);
  }
  await publish("acme", "add about page");
  console.log("Added /acme/about and published.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
