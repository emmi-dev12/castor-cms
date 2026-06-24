import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import express from 'express';
import type { SiteConfig } from '@castor/types';

const JWT_SECRET = 'jwt-secret-test-value-32-chars!!!';

const mockSite: SiteConfig = {
  siteId: 'site-1',
  name: 'Test',
  rootUrl: 'https://example.com',
  clientPasswordHash: bcrypt.hashSync('client-pass', 10),
  designTokens: { colors: [], spacingPresets: ['Normal'], fonts: [] },
  deployAdapter: 'vercel',
  deployConfig: {},
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock('../../storage/index.js', () => ({
  getStorage: async () => ({
    getSite: async (id: string) => (id === 'site-1' ? mockSite : null),
  }),
}));

// Fresh app + router per test to avoid rate-limiter state bleed
async function makeApp() {
  // Re-import router fresh each time using a dynamic import workaround:
  // vitest caches modules, so we build the app with the same cached router
  // but the rate-limiter is per-router-instance when we create a new one.
  // Simplest: just import once and accept shared limiter; test rate-limit separately.
  const { default: authRouter } = await import('../auth.js');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('POST /api/auth/owner', () => {
  it('returns JWT for valid master key', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/owner')
      .send({ masterKey: 'super-secret-master-key-32chars!!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const payload = jwt.verify(res.body.token, JWT_SECRET) as { role: string };
    expect(payload.role).toBe('owner');
  });

  it('rejects wrong master key', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/owner')
      .send({ masterKey: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/client', () => {
  it('returns scoped JWT for valid credentials', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/client')
      .send({ siteId: 'site-1', password: 'client-pass' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const payload = jwt.verify(res.body.token, JWT_SECRET) as {
      role: string;
      siteId: string;
    };
    expect(payload.role).toBe('client');
    expect(payload.siteId).toBe('site-1');
  });

  it('rejects wrong password', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/client')
      .send({ siteId: 'site-1', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown site', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/client')
      .send({ siteId: 'nope', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('requires both fields', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/client')
      .send({ siteId: 'site-1' });
    expect(res.status).toBe(400);
  });
});

describe('rate limiting', () => {
  it('rate limits owner login after 10 failed attempts', async () => {
    const app = await makeApp();
    // Burn through the window
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/owner').send({ masterKey: 'bad' });
    }
    const res = await request(app).post('/api/auth/owner').send({ masterKey: 'bad' });
    expect(res.status).toBe(429);
  });
});

describe('client JWT scope', () => {
  it('client token carries siteId and expires in 8h', async () => {
    const app = await makeApp();
    const res = await request(app)
      .post('/api/auth/client')
      .send({ siteId: 'site-1', password: 'client-pass' });
    expect(res.status).toBe(200);
    const payload = jwt.decode(res.body.token) as { siteId: string; exp: number; iat: number };
    expect(payload.siteId).toBe('site-1');
    // 8h ± 60s
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(8 * 3600 - 60);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(8 * 3600 + 60);
  });
});
