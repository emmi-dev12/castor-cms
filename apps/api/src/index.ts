import { env } from './config/env.js';
import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { getStorage } from './storage/index.js';
import authRouter from './routes/auth.js';
import sitesRouter from './routes/sites.js';
import pagesRouter from './routes/pages.js';
import ingestRouter from './routes/ingest.js';
import aiRouter from './routes/ai.js';
import publishRouter from './routes/publish.js';
import adminSettingsRouter from './routes/admin-settings.js';

const app: Application = express();

app.use(pinoHttp({ level: process.env['NODE_ENV'] === 'test' ? 'silent' : 'info' }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
const allowedOrigins = env.EDITOR_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/sites/:siteId/pages', pagesRouter);
app.use('/api/sites/:siteId/ingest', ingestRouter);
app.use('/api/sites/:siteId/pages', aiRouter);
app.use('/api/sites/:siteId/pages', publishRouter);
app.use('/api/admin/settings', adminSettingsRouter);

// Centralised error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await getStorage();
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

export default app;
