import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { randomUUID } from 'crypto';
import { requireOwner, type AuthRequest } from '../middleware/auth.js';
import { getStorage } from '../storage/index.js';
import { runIngest } from '../ingest/orchestrator.js';

const router: ExpressRouter = Router({ mergeParams: true });

// POST /api/sites/:siteId/ingest
router.post('/', requireOwner, async (req: AuthRequest, res) => {
  const { siteId } = req.params as { siteId: string };
  const { url, depth = 2 } = req.body as { url?: string; depth?: number };

  if (!url) { res.status(400).json({ error: 'url is required' }); return; }

  const storage = await getStorage();
  const site = await storage.getSite(siteId);
  if (!site || site.status === 'deleted') {
    res.status(404).json({ error: 'Site not found' });
    return;
  }

  const ingestId = randomUUID();
  const job = {
    ingestId, siteId, rootUrl: url, depth,
    status: 'pending' as const,
    pagesDiscovered: 0,
    createdAt: new Date().toISOString(),
  };
  await storage.saveIngestJob(job);
  res.status(202).json({ ingestId });

  // Run in background with our pre-assigned ID
  runIngest(storage, site, url, depth, ingestId).then((completed) => {
    console.log(`[ingest] ${ingestId} done: ${completed.pagesDiscovered} pages`);
  }).catch(async (err) => {
    console.error('[ingest] job failed:', err);
    await storage.saveIngestJob({ ...job, status: 'failed', error: String(err), completedAt: new Date().toISOString() });
  });
});

// GET /api/sites/:siteId/ingest/:ingestId — poll status
router.get('/:ingestId', requireOwner, async (req, res) => {
  const storage = await getStorage();
  const job = await storage.getIngestJob(req.params['ingestId']!);
  if (!job) { res.status(404).json({ error: 'Ingest job not found' }); return; }
  res.json(job);
});

export default router;
