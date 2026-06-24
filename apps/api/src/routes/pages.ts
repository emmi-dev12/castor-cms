import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getStorage } from '../storage/index.js';
import { requireClientOrOwner, requireOwner, type AuthRequest } from '../middleware/auth.js';
import { contentMutationLimiter } from '../middleware/rate-limit.js';
import { validate } from '../guardian/guardian.js';
import { logValidation } from '../guardian/audit.js';
import { checkInvariance, alertUndetectable } from '../ingest/invariance.js';
import type { Changeset, PageVersion, SlotDescriptor } from '@castor/types';

const router: ExpressRouter = Router({ mergeParams: true });

// GET /api/sites/:siteId/pages — list pages
router.get('/', requireClientOrOwner, async (req: AuthRequest, res) => {
  const storage = await getStorage();
  const pages = await storage.listPages(req.params['siteId']!);
  res.json(pages.filter(p => p.status !== 'deleted'));
});

// GET /api/sites/:siteId/pages/:pageId
router.get('/:pageId', requireClientOrOwner, async (req: AuthRequest, res) => {
  const storage = await getStorage();
  const page = await storage.getPage(req.params['siteId']!, req.params['pageId']!);
  if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
  res.json(page);
});

// PATCH /api/sites/:siteId/pages/:pageId/content — apply changeset via Guardian
router.patch(
  '/:pageId/content',
  requireClientOrOwner,
  contentMutationLimiter,
  async (req: AuthRequest, res) => {
    const { siteId, pageId } = req.params as { siteId: string; pageId: string };
    const storage = await getStorage();

    const page = await storage.getPage(siteId, pageId);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
    if (page.status === 'draft_curation') {
      res.status(409).json({ error: 'Page is still in curation; complete slot curation first.' });
      return;
    }

    const site = await storage.getSite(siteId);
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }

    const changeset = req.body as Changeset;
    const validationResult = validate(page, changeset, site.designTokens);

    await logValidation(storage, {
      userId: req.auth!.sub,
      role: req.auth!.role,
      siteId,
      pageId,
      action: 'content_update',
      changeset,
      result: validationResult,
    });

    if (!validationResult.approved) {
      res.status(422).json({ approved: false, rejections: validationResult.rejections });
      return;
    }

    // Apply approved changes
    for (const [slotId, newValue] of Object.entries(changeset)) {
      page.slots[slotId].currentValue = newValue;
    }
    page.currentVersion += 1;
    page.updatedAt = new Date().toISOString();

    const version: PageVersion = {
      version: page.currentVersion,
      ts: page.updatedAt,
      authorId: req.auth!.sub,
      slotValues: Object.fromEntries(
        Object.entries(page.slots).map(([id, d]) => [id, d.currentValue]),
      ),
    };

    await storage.savePage(page);
    await storage.saveVersion(siteId, pageId, version);

    res.json({ approved: true, version: page.currentVersion });
  },
);

// PATCH /api/sites/:siteId/pages/:pageId/slots/:slotId/visibility — curation
router.patch(
  '/:pageId/slots/:slotId/visibility',
  requireOwner,
  async (req: AuthRequest, res) => {
    const { siteId, pageId, slotId } = req.params as Record<string, string>;
    const { visibility } = req.body as { visibility: SlotDescriptor['visibility'] };

    if (!['client-visible', 'owner-only', 'frozen'].includes(visibility)) {
      res.status(400).json({ error: 'Invalid visibility value' });
      return;
    }

    const storage = await getStorage();
    const page = await storage.getPage(siteId, pageId);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
    if (!page.slots[slotId]) { res.status(404).json({ error: 'Slot not found' }); return; }

    page.slots[slotId].visibility = visibility;
    page.updatedAt = new Date().toISOString();
    await storage.savePage(page);
    res.json({ ok: true, slotId, visibility });
  },
);

// POST /api/sites/:siteId/pages/:pageId/curate — confirm curation complete
router.post('/:pageId/curate', requireOwner, async (req: AuthRequest, res) => {
  const { siteId, pageId } = req.params as { siteId: string; pageId: string };
  const storage = await getStorage();
  const page = await storage.getPage(siteId, pageId);
  if (!page) { res.status(404).json({ error: 'Page not found' }); return; }

  page.status = 'active';
  page.updatedAt = new Date().toISOString();
  await storage.savePage(page);
  res.json({ ok: true, status: 'active' });
});

// GET /api/sites/:siteId/pages/:pageId/versions
router.get('/:pageId/versions', requireClientOrOwner, async (req: AuthRequest, res) => {
  const { siteId, pageId } = req.params as { siteId: string; pageId: string };
  const storage = await getStorage();
  const versions = await storage.listVersions(siteId, pageId);
  res.json(versions);
});

// POST /api/sites/:siteId/pages/:pageId/versions/:version/rollback
router.post(
  '/:pageId/versions/:version/rollback',
  requireOwner,
  async (req: AuthRequest, res) => {
    const { siteId, pageId, version } = req.params as Record<string, string>;
    const storage = await getStorage();

    const page = await storage.getPage(siteId, pageId);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }

    const historicVersion = await storage.getVersion(siteId, pageId, parseInt(version, 10));
    if (!historicVersion) { res.status(404).json({ error: 'Version not found' }); return; }

    // Validate historic slot values through Guardian before applying
    const site = await storage.getSite(siteId);
    const validationResult = validate(page, historicVersion.slotValues, site?.designTokens);

    if (!validationResult.approved) {
      res.status(422).json({ error: 'Historic version fails current Guardian rules', rejections: validationResult.rejections });
      return;
    }

    // Apply
    for (const [slotId, value] of Object.entries(historicVersion.slotValues)) {
      if (page.slots[slotId]) page.slots[slotId].currentValue = value;
    }
    page.currentVersion += 1;
    page.updatedAt = new Date().toISOString();

    const newVersion: PageVersion = {
      version: page.currentVersion,
      ts: page.updatedAt,
      authorId: req.auth!.sub,
      slotValues: historicVersion.slotValues,
    };

    await storage.savePage(page);
    await storage.saveVersion(siteId, pageId, newVersion);

    await logValidation(storage, {
      userId: req.auth!.sub,
      role: req.auth!.role,
      siteId,
      pageId,
      action: `rollback_to_v${version}`,
      changeset: historicVersion.slotValues,
      result: validationResult,
    });

    res.json({ ok: true, rolledBackTo: parseInt(version, 10), newVersion: page.currentVersion });
  },
);

// POST /api/sites/:siteId/pages/:pageId/verify-slots — on-demand invariance check
router.post('/:pageId/verify-slots', requireOwner, async (req: AuthRequest, res) => {
  const { siteId, pageId } = req.params as { siteId: string; pageId: string };
  const storage = await getStorage();

  const page = await storage.getPage(siteId, pageId);
  if (!page) { res.status(404).json({ error: 'Page not found' }); return; }

  // Fetch fresh HTML
  const fetchRes = await fetch(page.url);
  if (!fetchRes.ok) { res.status(502).json({ error: 'Failed to fetch page URL' }); return; }
  const freshHtml = await fetchRes.text();

  const report = checkInvariance(page, freshHtml);

  // Mark undetectable slots
  for (const slotId of report.undetectableSlots) {
    page.slots[slotId].status = 'undetectable';
  }
  for (const slotId of report.stableSlots) {
    page.slots[slotId].status = 'active';
  }
  page.updatedAt = new Date().toISOString();
  await storage.savePage(page);

  if (report.undetectableSlots.length > 0) {
    await alertUndetectable(siteId, pageId, report.undetectableSlots);
  }

  res.json(report);
});

// GET /api/sites/:siteId/pages/:pageId/template-html — rendered template for preview
router.get('/:pageId/template-html', requireClientOrOwner, async (req: AuthRequest, res) => {
  const { siteId, pageId } = req.params as { siteId: string; pageId: string };
  const storage = await getStorage();
  const [page, site] = await Promise.all([
    storage.getPage(siteId, pageId),
    storage.getSite(siteId),
  ]);
  if (!page || !site) { res.status(404).json({ error: 'Not found' }); return; }
  try {
    const { renderStaticPage } = await import('../publish/renderer.js');
    const html = await renderStaticPage(page, site.designTokens);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /api/sites/:siteId/pages/:pageId (owner only)
router.delete('/:pageId', requireOwner, async (req, res) => {
  const { siteId, pageId } = req.params as { siteId: string; pageId: string };
  const storage = await getStorage();
  const page = await storage.getPage(siteId, pageId);
  if (!page) { res.status(404).json({ error: 'Not found' }); return; }
  page.status = 'deleted' as typeof page.status;
  page.updatedAt = new Date().toISOString();
  await storage.savePage(page);
  res.json({ ok: true });
});

// GET /api/sites/:siteId/audit (owner only)
router.get('/audit', requireOwner, async (req, res) => {
  const { siteId } = req.params as { siteId: string };
  const limit = parseInt((req.query['limit'] as string) ?? '50', 10);
  const offset = parseInt((req.query['offset'] as string) ?? '0', 10);
  const storage = await getStorage();
  const entries = await storage.listAudit(siteId, limit, offset);
  res.json(entries);
});

export default router;
