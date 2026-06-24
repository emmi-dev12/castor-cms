import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import bcrypt from 'bcryptjs';
import { requireOwner } from '../middleware/auth.js';
import { loadSettings, saveSettings } from '../config/settings.js';

const router: ExpressRouter = Router();

// GET /api/admin/settings — returns settings with keys masked
router.get('/', requireOwner, (_req, res) => {
  const s = loadSettings();
  res.json({
    aiProvider: s.aiProvider ?? 'anthropic',
    hasAnthropicKey: !!s.anthropicApiKey,
    hasOpenrouterKey: !!s.openrouterApiKey,
    deployAdapter: s.deployAdapter ?? 'vercel',
    vercelScope: s.vercelScope ?? '',
    alertWebhookUrl: s.alertWebhookUrl ?? '',
    slotVerifyIntervalMinutes: s.slotVerifyIntervalMinutes ?? 5,
    hasCustomPassword: !!s.ownerPasswordHash,
  });
});

// PATCH /api/admin/settings
router.patch('/', requireOwner, async (req, res) => {
  const body = req.body as {
    aiProvider?: 'anthropic' | 'openrouter';
    anthropicApiKey?: string;
    openrouterApiKey?: string;
    deployAdapter?: 'vercel' | 'render';
    vercelScope?: string;
    alertWebhookUrl?: string;
    slotVerifyIntervalMinutes?: number;
    // Password change
    newPassword?: string;
    currentPassword?: string;
  };

  const patch: Parameters<typeof saveSettings>[0] = {};

  if (body.aiProvider) patch.aiProvider = body.aiProvider;
  if (body.anthropicApiKey !== undefined) patch.anthropicApiKey = body.anthropicApiKey || undefined;
  if (body.openrouterApiKey !== undefined) patch.openrouterApiKey = body.openrouterApiKey || undefined;
  if (body.deployAdapter) patch.deployAdapter = body.deployAdapter;
  if (body.vercelScope !== undefined) patch.vercelScope = body.vercelScope || undefined;
  if (body.alertWebhookUrl !== undefined) patch.alertWebhookUrl = body.alertWebhookUrl || undefined;
  if (body.slotVerifyIntervalMinutes) patch.slotVerifyIntervalMinutes = body.slotVerifyIntervalMinutes;

  if (body.newPassword) {
    if (body.newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    patch.ownerPasswordHash = await bcrypt.hash(body.newPassword, 12);
  }

  saveSettings(patch);
  res.json({ ok: true });
});

export default router;
