// Run manually: VERCEL_SCOPE=... pnpm --filter api exec tsx src/publish/__tests__/adapter-live.ts
import { getDeployAdapter } from '../adapters.js';

const html = `<!DOCTYPE html><html><head><title>CMS-AI Live</title></head>
<body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px;text-align:center">
<h1>CMS-AI Adapter Test</h1><p>Deploy successful at ${new Date().toISOString()}</p>
</body></html>`;

const adapter = getDeployAdapter('vercel');
console.log('Deploying…');
adapter.deploy('live-test', 'home', html)
  .then((r) => console.log('✓ Deploy URL:', r.deployUrl))
  .catch((e: Error) => { console.error('✗ Failed:', e.message); process.exit(1); });
