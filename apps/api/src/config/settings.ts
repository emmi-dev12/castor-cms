import fs from 'fs';
import path from 'path';

function settingsPath(): string {
  return path.resolve(process.env['CMS_DATA_ROOT'] ?? process.cwd(), 'data', 'settings.json');
}

export interface RuntimeSettings {
  ownerPasswordHash?: string;   // bcrypt hash; if set, overrides OWNER_MASTER_KEY plain-text compare
  aiProvider?: 'anthropic' | 'openrouter';
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  deployAdapter?: 'vercel' | 'render';
  vercelScope?: string;
  alertWebhookUrl?: string;
  slotVerifyIntervalMinutes?: number;
}

let _cache: RuntimeSettings | null = null;

export function loadSettings(): RuntimeSettings {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    _cache = JSON.parse(raw) as RuntimeSettings;
  } catch {
    _cache = {};
  }
  return _cache;
}

export function saveSettings(patch: Partial<RuntimeSettings>): void {
  const current = loadSettings();
  const next = { ...current, ...patch };
  _cache = next;
  const dir = path.dirname(settingsPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
}

/** Get effective value: runtime settings take priority over env. */
export function getSetting<K extends keyof RuntimeSettings>(
  key: K,
  envFallback: string,
): string {
  const s = loadSettings();
  return (s[key] as string | undefined) || envFallback;
}
