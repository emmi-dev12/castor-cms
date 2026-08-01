# Setting up Castor

You bought the repo. This gets you from a fresh clone to a client editing their
own live site. It assumes you can use a terminal, and nothing else.

Budget about 30 minutes the first time. Everything here fits inside the free
tier of both services it uses.

**What you need**

- **Node.js 20 or newer** — check with `node -v`
- **A MongoDB Atlas account** — the free M0 cluster is enough
- **A Vercel account** — the free Hobby plan is enough

> Vercel's Hobby plan is for non-commercial use. If you're billing clients for
> this work, you need a paid Vercel plan (or different hosting) — that's
> Vercel's rule, not Castor's.

---

## 1. Install

The app lives in the `web/` subdirectory. Run everything from there.

```bash
git clone <your-repo-url> castor && cd castor/web && npm install
```

## 2. Create the database

1. In [MongoDB Atlas](https://cloud.mongodb.com), create a free **M0** cluster.
2. **Database Access** → add a user with a password. Save the password.
3. **Network Access** → add `0.0.0.0/0` (Vercel's IPs aren't fixed, so the
   connection has to be allowed from anywhere; the database password is what
   protects it).
4. **Connect** → **Drivers** → copy the connection string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`.
   Substitute your real password into it.

## 3. Configure

Create `web/.env.local`:

```bash
cp .env.example .env.local
```

Fill in three values:

```bash
MONGODB_URI=mongodb+srv://...        # from step 2
CMS_SESSION_SECRET=...               # openssl rand -hex 32
ADMIN_PASSWORD=...                   # anything long; this guards your dashboard
```

`ADMIN_PASSWORD` is required to open the local admin. Without it the dashboard
refuses to load rather than falling back to a default.

## 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>. Enter your `ADMIN_PASSWORD` and you're in the
dashboard. Create your first site with:

```bash
export MONGODB_URI="$(grep ^MONGODB_URI= .env.local | sed 's/^MONGODB_URI=//')"
npm run seed
```

That writes a sample site called `acme`. Open it at `/admin/edit/acme` to edit
it as the owner, or `/acme` to see it as the public would.

> The seed script doesn't read `.env.local` on its own, which is why the export
> is there. Without it you'd seed the local filesystem instead of Atlas.

## 5. Deploy

```bash
npm i -g vercel
vercel link          # create or pick a project
```

Set the environment variables on the **production** environment:

```bash
vercel env add MONGODB_URI production        # same value as .env.local
vercel env add CMS_SESSION_SECRET production # same value as .env.local
vercel env add SITE_URL production           # https://your-project.vercel.app
```

Then ship it:

```bash
vercel --prod
```

Use the **same** `MONGODB_URI` locally and in production — that shared database
is how a site you build on your machine becomes editable at its hosted link.

Do **not** set `ADMIN_PASSWORD` in production. The admin dashboard is disabled
there automatically; the deployed app serves only the client editor and the
public sites.

### About `npm run deploy`

`scripts/deploy.sh` deploys and then re-points custom aliases, because
`vercel --prod` doesn't move aliases created with `vercel alias set`. Set your
own aliases before using it:

```bash
CASTOR_ALIASES="yourdomain.vercel.app" npm run deploy
```

With no aliases configured it just deploys, which is all most setups need.

## 6. Hand a site to a client

1. In the local dashboard, open the site and set its **permission tier**:
   - **Locked** — text, images, links and buttons only
   - **Moderate** — the above, plus palette colours and preset spacing
   - **Free** — anything
2. Reset the client password from the admin editor. It generates a strong one —
   copy it.
3. Send them `https://your-domain/edit/<slug>` and that password.

They log in, edit, and press Publish. Nothing they do is public until they do.

---

## Environment variables

| Variable | Where | Required | What it does |
| --- | --- | --- | --- |
| `MONGODB_URI` | both | **Yes** in production | Atlas connection string. Unset locally = filesystem storage in `web/.data`, which the deployment can't see. |
| `CMS_SESSION_SECRET` | both | **Yes** in production | Signs client session cookies. The app refuses to start in production without it. |
| `ADMIN_PASSWORD` | local only | Yes, to use the admin | Guards the local dashboard. Leave unset in production. |
| `SITE_URL` | production | Recommended | Your public URL. Used for canonical links, OpenGraph tags, `robots.txt` and `sitemap.xml`. |
| `MONGODB_DB` | both | No | Database name. Defaults to `ai_native_cms`. |
| `CMS_ENABLE_ADMIN` | both | No | Force the admin on (`1`) or off (`0`). Defaults to on locally, off in production. Setting `1` in production exposes your dashboard — don't. |
| `GUMROAD_URL` | production | No | Only used by the marketing landing page, which you'll probably replace. |

## When something's wrong

**"Admin password not set"** — `ADMIN_PASSWORD` is missing from `.env.local`, or
the dev server wasn't restarted after adding it.

**Sites appear locally but not on the deployment** — the two are using different
databases. Confirm `MONGODB_URI` is set locally and matches production.

**Every route 404s after deploying** — the Vercel project's framework preset
isn't Next.js. `web/vercel.json` pins it; make sure Vercel's root directory is
set to `web`.

**`ChunkLoadError` in dev** — something deleted `.next` while the dev server was
running. Stop the server, `rm -rf .next`, start it again.

**Typecheck fails after adding or deleting routes** — `rm -rf .next/types` and
re-run.

## Making it yours

- The public landing page is `web/components/marketing/` and renders at `/` in
  production. Delete it, or replace it with your own — the CMS doesn't depend on
  it.
- Section types live in `web/lib/model/sectionTemplates.ts` and render in
  `web/components/sections/SectionView.tsx`. Adding one means a template plus a
  `case`.
- Permission rules are in `web/lib/guardian/`, and they're unit tested. Run
  `npm test` after changing them.

`CLAUDE.md` in the repo root explains the architecture in more depth — it's
written for AI coding agents, but it's the most complete map of the codebase.

---

Licensed under [LICENSE.md](LICENSE.md). Short version: build whatever you want
for as many clients as you want; don't republish or resell the source.
