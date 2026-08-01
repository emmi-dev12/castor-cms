// Verification one-off: add a page whose path is literally "edit" to acme.
// Before the /edit/[slug] route move this page was publicly unreachable
// (masked by the editor route). Now /acme/edit should serve it.
// Run with: npx tsx scripts/add-edit-page.ts

import { getRepository } from "../lib/storage/repository";
import { newId } from "../lib/model/content";
import { publish } from "../lib/sites/service";

async function main() {
  const repo = await getRepository();
  const site = await repo.getSite("acme");
  if (!site) throw new Error("acme not found");

  if (!site.draft.pages.some((p) => p.path === "edit")) {
    site.draft.pages.push({
      id: newId("page"),
      path: "edit",
      title: "Edit (the tricky one)",
      sections: [
        {
          id: newId("sec"),
          type: "text",
          slots: [
            { id: newId("s"), type: "text", label: "heading", value: "A page named “edit”" },
            {
              id: newId("s"),
              type: "richtext",
              label: "body",
              value:
                "This page's path is literally 'edit'. It used to be unreachable because it collided with the editor route. Now the editor lives at /edit/[slug], so this public page works fine.",
            },
          ],
        },
      ],
    });
    await repo.putSite(site);
  }
  await publish("acme", "add page named edit (routing fix)");
  console.log("Added /acme/edit (a content page) and published.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
