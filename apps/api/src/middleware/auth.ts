import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '@castor/types';

export interface AuthRequest extends Request {
  auth?: JwtPayload;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  // Also allow cookie (editor uses httpOnly cookie)
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.['cms_token'];
  if (cookie) return cookie;
  return null;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'owner') { res.status(403).json({ error: 'Forbidden' }); return; }
  req.auth = payload;
  next();
}

export function requireClientOrOwner(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }

  if (payload.role === 'owner') {
    req.auth = payload;
    next();
    return;
  }

  if (payload.role === 'client') {
    const siteId = req.params['siteId'] ?? req.params['site_id'];
    if (payload.siteId !== siteId) {
      res.status(403).json({ error: 'Forbidden: wrong site' });
      return;
    }
    req.auth = payload;
    next();
    return;
  }

  res.status(403).json({ error: 'Forbidden' });
}
