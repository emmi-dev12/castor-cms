import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { loadSettings } from '../config/settings.js';
import { getStorage } from '../storage/index.js';
import type { JwtPayload } from '@castor/types';

const router: ExpressRouter = Router();

function makeLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later.' },
  });
}

const ownerLimiter = makeLimiter();
const clientLimiter = makeLimiter();

function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as Parameters<typeof jwt.sign>[2]);
}

// POST /api/auth/owner
router.post('/owner', ownerLimiter, async (req, res) => {
  const { masterKey, totp } = req.body as { masterKey?: string; totp?: string };

  if (!masterKey) { res.status(401).json({ error: 'Invalid password' }); return; }

  // Check against runtime hash first (set via settings), then fall back to env plaintext
  const settings = loadSettings();
  let valid = false;
  if (settings.ownerPasswordHash) {
    valid = await bcrypt.compare(masterKey, settings.ownerPasswordHash);
  } else {
    valid = masterKey === env.OWNER_MASTER_KEY;
  }

  if (!valid) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  if (env.OWNER_2FA_SECRET) {
    if (!totp) {
      res.status(401).json({ error: '2FA code required' });
      return;
    }
    const valid = authenticator.verify({ token: totp, secret: env.OWNER_2FA_SECRET });
    if (!valid) {
      res.status(401).json({ error: 'Invalid 2FA code' });
      return;
    }
  }

  const token = signToken({ sub: 'owner', role: 'owner' }, '24h');
  res.json({ token });
});

// GET /api/auth/owner/2fa-setup
router.get('/owner/2fa-setup', async (req, res) => {
  // Only accessible locally — no auth required (owner sets this up before deployment)
  if (!env.OWNER_2FA_SECRET) {
    res.status(400).json({ error: 'OWNER_2FA_SECRET not configured' });
    return;
  }
  const otpauth = authenticator.keyuri('owner', 'CMS-AI', env.OWNER_2FA_SECRET);
  const qr = await QRCode.toDataURL(otpauth);
  res.json({ otpauth, qr });
});

// POST /api/auth/client
router.post('/client', clientLimiter, async (req, res) => {
  const { siteId, password } = req.body as { siteId?: string; password?: string };

  if (!siteId || !password) {
    res.status(400).json({ error: 'siteId and password required' });
    return;
  }

  const storage = await getStorage();
  const site = await storage.getSite(siteId);
  if (!site || site.status !== 'active') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, site.clientPasswordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ sub: `client:${siteId}`, role: 'client', siteId }, '8h');
  res.json({ token });
});

// POST /api/auth/editor-link  — owner generates a pre-signed shareable editor URL
router.post('/editor-link', async (req, res) => {
  // Validate owner inline (avoid circular dep with middleware)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as JwtPayload;
    if (payload.role !== 'owner') { res.status(403).json({ error: 'Forbidden' }); return; }
  } catch {
    res.status(401).json({ error: 'Invalid token' }); return;
  }

  const { siteId } = req.body as { siteId?: string };
  if (!siteId) { res.status(400).json({ error: 'siteId required' }); return; }

  // Issue a short-lived (8h) client-scoped token without a password check
  // (owner is vouching for the client by generating this link)
  const token = signToken({ sub: `editor-link:${siteId}`, role: 'client', siteId }, '8h');
  const editorUrl = `${env.EDITOR_ORIGIN}/editor/${siteId}?token=${token}`;
  res.json({ token, editorUrl });
});

export default router;
