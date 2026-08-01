# Deploying the AI-Native CMS

The system is **two halves that share one database**:

- **Local admin** — you run `npm run dev` on your Mac. This is where you build/clone
  sites, set passwords, tiers, and AI keys. (Playwright cloning only works here.)
- **Hosted editor** — the same app deployed to Vercel. Clients open
  `your-app.vercel.app/<slug>`, log in, and edit. It reads/writes the same DB.

The shared database is **MongoDB Atlas**. That's the one piece that makes both
halves see the same sites.

---

## 1. MongoDB Atlas (the shared database) — you do this

1. Create a free account at https://www.mongodb.com/atlas and create a **free M0
   cluster**.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — needed so Vercel
   can connect). For tighter security you can restrict later.
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`

Keep that string — it's your `MONGODB_URI`.

## 2. Point your LOCAL admin at Atlas

So sites you build locally land in the shared DB (not the local filesystem):

```bash
cd web
cp .env.example .env.local
```

Edit `.env.local`:
- `MONGODB_URI=` → your Atlas string
- `CMS_SESSION_SECRET=` → run `openssl rand -hex 32` and paste the result

Then seed a test site into Atlas and confirm:

```bash
npm run seed      # writes site "acme" to Atlas
npm run dev       # open http://localhost:3000 — you should see the site listed
```

## 3. Deploy the hosted editor to Vercel — you do this

The app lives in the `web/` subfolder, so set that as the root.

**Easiest (no GitHub needed) — Vercel CLI:**
```bash
npm i -g vercel
cd web
vercel            # log in, link a new project; accept Next.js defaults
```

Then add the environment variables (Vercel dashboard → your project → Settings →
Environment Variables, for **Production**):

| Variable | Value |
|---|---|
| `MONGODB_URI` | your Atlas string (same as local) |
| `CMS_SESSION_SECRET` | the same `openssl rand -hex 32` value |
| `BLOB_READ_WRITE_TOKEN` | *(optional)* enables image uploads — see step 4 |

Deploy to production:
```bash
vercel --prod
```

> If you imported via GitHub instead: set the project's **Root Directory** to
> `web` in Vercel settings; everything else auto-detects.

## 4. Image uploads (optional but recommended)

Without this, clients can still **paste image URLs**, but **file uploads** are
disabled in production.

- Vercel dashboard → your project → **Storage** → create a **Blob** store and
  connect it. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically. Redeploy.

## 5. Form submissions

Nothing to configure. A site's `form` section posts to the public
`/api/[slug]/submit`, and submissions are stored in the same Atlas database.
Read them from the **local admin** at `/admin/submissions/[slug]` (linked from
the dashboard) — the inbox is never exposed on the deployed site.

---

## How you actually use it, day to day

1. **Locally**: build or clone a site → set its slug, client password, and tier.
   (It saves to Atlas.)
2. **Send the client**: `https://your-app.vercel.app/<slug>/edit` + their password.
3. They edit within the rails you set; hit **Publish**; the public site at
   `/<slug>` updates. You can roll back anytime.

## Security notes
- The **admin dashboard and all `/api/admin/*` routes are disabled in production**
  — admin only works on your local machine.
- The app **won't start in production without `CMS_SESSION_SECRET`** (prevents
  forgeable sessions).
- Vercel's free (Hobby) tier is for non-commercial use; paid client work needs a
  Pro plan per Vercel's terms.
