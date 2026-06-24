import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { env } from '../config/env.js';

function getVercelScope(): string {
  // Read scope from env, or auto-detect from vercel auth config
  if (env.VERCEL_SCOPE) return env.VERCEL_SCOPE;
  try {
    const authPath = path.join(os.homedir(), '.local/share/com.vercel.cli/auth.json');
    const alt = path.join(os.homedir(), '.vercel/auth.json');
    const file = fs.existsSync(authPath) ? authPath : alt;
    if (!fs.existsSync(file)) return '';
    const auth = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      token?: string;
      teams?: Array<{ slug: string }>;
    };
    return auth.teams?.[0]?.slug ?? '';
  } catch {
    return '';
  }
}

export interface DeployResult {
  deployUrl: string;
  adapterType: 'vercel' | 'render';
}

export interface DeployAdapter {
  deploy(siteId: string, pageId: string, htmlBundle: string): Promise<DeployResult>;
}

// ─── Vercel CLI adapter ────────────────────────────────────────────────────

class VercelAdapter implements DeployAdapter {
  async deploy(siteId: string, pageId: string, htmlBundle: string): Promise<DeployResult> {
    // Write HTML to a temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `cms-vercel-${siteId}-`));

    try {
      // Write the page HTML as index.html (root) and also by pageId
      fs.writeFileSync(path.join(tmpDir, 'index.html'), htmlBundle, 'utf8');
      fs.writeFileSync(path.join(tmpDir, `${pageId}.html`), htmlBundle, 'utf8');

      // Write a minimal vercel.json for static deployment (no name — use --name flag)
      fs.writeFileSync(path.join(tmpDir, 'vercel.json'), JSON.stringify({
        version: 2,
        builds: [{ src: '*.html', use: '@vercel/static' }],
      }), 'utf8');

      // Build the CLI command
      const tokenFlag = env.VERCEL_TOKEN ? `--token ${env.VERCEL_TOKEN}` : '';
      const scope = getVercelScope();
      const scopeFlag = scope ? `--scope ${scope}` : '';
      const projectName = `castor-${siteId.slice(0, 20)}`;
      const cmd = `vercel ${tmpDir} --yes --name ${projectName} ${tokenFlag} ${scopeFlag} 2>&1`;

      const output = execSync(cmd, { encoding: 'utf8', timeout: 120_000 });

      // Extract the deploy URL from vercel output (last https:// line)
      const urls = output.match(/https:\/\/[^\s]+\.vercel\.app/g) ?? [];
      const deployUrl = urls[urls.length - 1];

      if (!deployUrl) {
        throw new Error(`Could not parse deploy URL from vercel output:\n${output}`);
      }

      return { deployUrl, adapterType: 'vercel' };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

// ─── Render adapter ────────────────────────────────────────────────────────

class RenderAdapter implements DeployAdapter {
  async deploy(siteId: string, pageId: string, htmlBundle: string): Promise<DeployResult> {
    if (!env.RENDER_API_KEY) throw new Error('RENDER_API_KEY not configured');

    // Render Static Sites: upload via their Deploy Hook URL stored in deployConfig
    // For now, persist HTML locally and return a placeholder — Render setup requires
    // a Git repo or deploy hook configured per-site in the admin.
    const deployUrl = `https://castor-${siteId}.onrender.com/${pageId}.html`;
    console.log(`[render] Stub deploy for ${siteId}/${pageId} → ${deployUrl}`);
    return { deployUrl, adapterType: 'render' };
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function getDeployAdapter(type?: 'vercel' | 'render'): DeployAdapter {
  const adapterType = type ?? env.DEPLOY_ADAPTER;
  if (adapterType === 'render') return new RenderAdapter();
  return new VercelAdapter();
}
