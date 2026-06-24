import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import bcrypt from 'bcryptjs';
import { getStorage } from '../storage/index.js';
import { requireOwner } from '../middleware/auth.js';
import type { SiteConfig } from '@castor/types';

function urlToSlug(rootUrl: string): string {
  try {
    return new URL(rootUrl).hostname
      .replace(/^www\./, '')
      .replace(/\./g, '-')
      .replace(/[^a-z0-9-]/gi, '')
      .toLowerCase();
  } catch {
    return `site-${Date.now()}`;
  }
}

const router: ExpressRouter = Router();

// POST /api/sites — create site
router.post('/', requireOwner, async (req, res) => {
  const { name, rootUrl, clientPassword, deployAdapter, designTokens } = req.body as {
    name?: string;
    rootUrl?: string;
    clientPassword?: string;
    deployAdapter?: 'vercel' | 'render';
    designTokens?: SiteConfig['designTokens'];
  };

  if (!name || !rootUrl || !clientPassword) {
    res.status(400).json({ error: 'name, rootUrl, and clientPassword are required' });
    return;
  }

  const storage = await getStorage();
  const clientPasswordHash = await bcrypt.hash(clientPassword, 12);

  // Generate collision-free slug
  const base = urlToSlug(rootUrl);
  const existing = await storage.listSites();
  const taken = new Set(existing.map(s => s.siteId));
  let siteId = base;
  let n = 2;
  while (taken.has(siteId)) siteId = `${base}-${n++}`;

  const site: SiteConfig = {
    siteId,
    name,
    rootUrl,
    clientPasswordHash,
    designTokens: designTokens ?? {
      colors: ['#000000', '#ffffff', '#0066cc'],
      spacingPresets: ['Normal'],
      fonts: ['sans-serif'],
    },
    deployAdapter: deployAdapter ?? 'vercel',
    deployConfig: {},
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storage.saveSite(site);
  const { clientPasswordHash: _omit, ...safesite } = site;
  res.status(201).json(safesite);
});

// GET /api/sites — list all sites (owner)
router.get('/', requireOwner, async (_req, res) => {
  const storage = await getStorage();
  const sites = await storage.listSites();
  res.json(
    sites
      .filter((s) => s.status !== 'deleted')
      .map(({ clientPasswordHash: _omit, ...s }) => s),
  );
});

// GET /api/sites/:siteId — get one site
router.get('/:siteId', requireOwner, async (req, res) => {
  const storage = await getStorage();
  const site = await storage.getSite(req.params['siteId']!);
  if (!site || site.status === 'deleted') { res.status(404).json({ error: 'Not found' }); return; }
  const { clientPasswordHash: _omit, ...safe } = site;
  res.json(safe);
});

// PATCH /api/sites/:siteId/config — update design tokens (owner)
router.patch('/:siteId/config', requireOwner, async (req, res) => {
  const storage = await getStorage();
  const site = await storage.getSite(req.params['siteId']!);
  if (!site || site.status === 'deleted') { res.status(404).json({ error: 'Not found' }); return; }

  const { designTokens, deployAdapter, deployConfig } = req.body as Partial<SiteConfig>;
  if (designTokens) site.designTokens = designTokens;
  if (deployAdapter) site.deployAdapter = deployAdapter;
  if (deployConfig) site.deployConfig = deployConfig;
  site.updatedAt = new Date().toISOString();

  await storage.saveSite(site);
  const { clientPasswordHash: _omit, ...safe } = site;
  res.json(safe);
});

// DELETE /api/sites/:siteId — soft delete
router.delete('/:siteId', requireOwner, async (req, res) => {
  const storage = await getStorage();
  const site = await storage.getSite(req.params['siteId']!);
  if (!site) { res.status(404).json({ error: 'Not found' }); return; }
  site.status = 'deleted';
  site.updatedAt = new Date().toISOString();
  await storage.saveSite(site);
  res.json({ ok: true });
});

export default router;
