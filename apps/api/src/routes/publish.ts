import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { requireClientOrOwner, requireOwner, type AuthRequest } from '../middleware/auth.js';
import { sensitiveOpLimiter } from '../middleware/rate-limit.js';
import { getStorage } from '../storage/index.js';
import { validate } from '../guardian/guardian.js';
import { renderStaticPage } from '../publish/renderer.js';
import { getDeployAdapter } from '../publish/adapters.js';
import { storeBundle, loadBundle } from '../publish/bundle-store.js';
import { logPublish } from '../guardian/audit.js';
import type { PublishSnapshot } from '@castor/types';

const router: ExpressRouter = Router({ mergeParams: true });

// POST /api/sites/:siteId/pages/:pageId/publish
router.post(
  '/:pageId/publish',
  requireClientOrOwner,
  sensitiveOpLimiter,
  async (req: AuthRequest, res) => {
    const { siteId, pageId } = req.params as { siteId: string; pageId: string };
    const storage = await getStorage();

    const [page, site] = await Promise.all([
      storage.getPage(siteId, pageId),
      storage.getSite(siteId),
    ]);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }

    // Pre-publish Guardian pass — validate all current slot values
    const fullChangeset = Object.fromEntries(
      Object.entries(page.slots).map(([id, d]) => [id, d.currentValue]),
    );
    const guardianResult = validate(page, fullChangeset, site.designTokens);
    if (!guardianResult.approved) {
      res.status(422).json({ error: 'Pre-publish validation failed', rejections: guardianResult.rejections });
      return;
    }

    // Block publish if any slot is undetectable
    const undetectable = Object.values(page.slots).filter((s) => s.status === 'undetectable');
    if (undetectable.length > 0) {
      res.status(409).json({
        error: 'Page has undetectable slots. Resolve or acknowledge them before publishing.',
        slotIds: undetectable.map((s) => s.slotId),
      });
      return;
    }

    // Render static bundle
    let htmlBundle: string;
    try {
      htmlBundle = await renderStaticPage(page, site.designTokens);
    } catch (err) {
      res.status(500).json({ error: `Render failed: ${String(err)}` });
      return;
    }

    // Deploy
    const adapter = getDeployAdapter(site.deployAdapter);
    let deployResult;
    try {
      deployResult = await adapter.deploy(siteId, pageId, htmlBundle);
    } catch (err) {
      res.status(502).json({ error: `Deploy failed: ${String(err)}` });
      return;
    }

    // Save immutable snapshot + bundle on disk
    const htmlHash = crypto.createHash('sha256').update(htmlBundle).digest('hex');
    const snapshot: PublishSnapshot = {
      publishId: uuid(),
      pageId,
      siteId,
      ts: new Date().toISOString(),
      htmlHash,
      deployUrl: deployResult.deployUrl,
      adapterType: deployResult.adapterType,
    };
    await storage.savePublish(snapshot);
    storeBundle(snapshot.publishId, htmlBundle);

    await logPublish(storage, {
      userId: req.auth!.sub,
      role: req.auth!.role,
      siteId,
      pageId,
      publishId: snapshot.publishId,
      deployUrl: deployResult.deployUrl,
    });

    res.json(snapshot);
  },
);

// GET /api/sites/:siteId/pages/:pageId/publishes
router.get('/:pageId/publishes', requireClientOrOwner, async (req: AuthRequest, res) => {
  const { siteId, pageId } = req.params as { siteId: string; pageId: string };
  const storage = await getStorage();
  const publishes = await storage.listPublishes(siteId, pageId);
  res.json(publishes);
});

// POST /api/sites/:siteId/pages/:pageId/publishes/:publishId/rollback
router.post(
  '/:pageId/publishes/:publishId/rollback',
  requireOwner,
  async (req: AuthRequest, res) => {
    const { siteId, pageId, publishId } = req.params as Record<string, string>;
    const storage = await getStorage();

    const snapshot = await storage.getPublish(siteId, publishId);
    if (!snapshot || snapshot.pageId !== pageId) {
      res.status(404).json({ error: 'Publish snapshot not found' });
      return;
    }
    const site = await storage.getSite(siteId);
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }

    // Load the original rendered HTML bundle from disk
    const originalHtml = loadBundle(publishId);
    if (!originalHtml) {
      res.status(404).json({ error: 'HTML bundle for this publish not found on disk.' });
      return;
    }

    const adapter = getDeployAdapter(site.deployAdapter);
    let deployResult;
    try {
      deployResult = await adapter.deploy(siteId, pageId, originalHtml);
    } catch (err) {
      res.status(502).json({ error: `Rollback deploy failed: ${String(err)}` });
      return;
    }

    const newSnapshot: PublishSnapshot = {
      publishId: uuid(),
      pageId,
      siteId,
      ts: new Date().toISOString(),
      htmlHash: snapshot.htmlHash,
      deployUrl: deployResult.deployUrl,
      adapterType: deployResult.adapterType,
    };
    await storage.savePublish(newSnapshot);
    storeBundle(newSnapshot.publishId, originalHtml);

    await logPublish(storage, {
      userId: req.auth!.sub,
      role: req.auth!.role,
      siteId,
      pageId,
      publishId: newSnapshot.publishId,
      deployUrl: deployResult.deployUrl,
    });

    res.json({ ok: true, snapshot: newSnapshot });
  },
);

export default router;
