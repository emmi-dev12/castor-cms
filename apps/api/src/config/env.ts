import 'dotenv/config';

function require(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  OWNER_MASTER_KEY: require('OWNER_MASTER_KEY'),
  JWT_SECRET: require('JWT_SECRET'),
  PORT: parseInt(optional('PORT', '3000'), 10),
  EDITOR_ORIGIN: optional('EDITOR_ORIGIN', 'http://localhost:3001,https://castor-cms.vercel.app'),
  MONGO_URI: optional('MONGO_URI'),
  ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY'),
  OPENROUTER_API_KEY: optional('OPENROUTER_API_KEY'),
  DEPLOY_ADAPTER: optional('DEPLOY_ADAPTER', 'vercel') as 'vercel' | 'render',
  VERCEL_TOKEN: optional('VERCEL_TOKEN'),
  VERCEL_SCOPE: optional('VERCEL_SCOPE'),
  RENDER_API_KEY: optional('RENDER_API_KEY'),
  OWNER_2FA_SECRET: optional('OWNER_2FA_SECRET'),
  SLOT_VERIFY_INTERVAL_MINUTES: parseInt(optional('SLOT_VERIFY_INTERVAL_MINUTES', '5'), 10),
  ALERT_WEBHOOK_URL: optional('ALERT_WEBHOOK_URL'),
} as const;
