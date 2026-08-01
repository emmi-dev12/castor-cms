# Castor — `web/`

The Next.js app for Castor. See the [repo README](../README.md) for what Castor
is and a quick start, [`../CLAUDE.md`](../CLAUDE.md) for architecture, and
[`../DEPLOY.md`](../DEPLOY.md) for the hosting runbook.

Run all commands from this directory:

```bash
npm run dev        # local dev server
npm run build      # production build
npm run seed       # write the sample "acme" site
npm test           # unit tests
npm run deploy     # deploy + re-point aliases
```

> **Note:** this is **Next.js 16** — dynamic-route `params` and `cookies()` are
> async (`await` them). See `AGENTS.md`.
