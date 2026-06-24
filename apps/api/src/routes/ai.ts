import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { requireClientOrOwner, type AuthRequest } from '../middleware/auth.js';
import { sensitiveOpLimiter } from '../middleware/rate-limit.js';
import { getStorage } from '../storage/index.js';
import { generateSuggestion } from '../ai/suggest.js';
import { validate } from '../guardian/guardian.js';

const router: ExpressRouter = Router({ mergeParams: true });

// POST /api/sites/:siteId/pages/:pageId/ai-suggest
router.post(
  '/:pageId/ai-suggest',
  requireClientOrOwner,
  sensitiveOpLimiter,
  async (req: AuthRequest, res) => {
    const { siteId, pageId } = req.params as { siteId: string; pageId: string };
    const { prompt } = req.body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const storage = await getStorage();
    const page = await storage.getPage(siteId, pageId);
    if (!page) { res.status(404).json({ error: 'Page not found' }); return; }

    const site = await storage.getSite(siteId);
    if (!site) { res.status(404).json({ error: 'Site not found' }); return; }

    let suggestion;
    try {
      suggestion = await generateSuggestion(page, prompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Distinguish config errors from LLM errors
      if (msg.includes('No AI provider')) {
        res.status(503).json({ error: msg });
      } else {
        res.status(502).json({ error: `AI request failed: ${msg}` });
      }
      return;
    }

    // Run Guardian on the suggestion — do NOT save, just validate
    const validationResult = validate(page, suggestion.changes, site.designTokens);

    // Never expose API keys — response contains only the suggestion and validation
    res.json({
      suggestion: suggestion.changes,
      provider: suggestion.provider,
      validation: validationResult,
      // Client must call PATCH /content to confirm application
    });
  },
);

export default router;
