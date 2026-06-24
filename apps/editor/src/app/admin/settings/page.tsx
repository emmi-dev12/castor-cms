import Link from 'next/link';
import { requireOwnerSession } from '@/lib/auth';
import { SettingsForm } from './SettingsForm';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

async function getSettings(token: string) {
  try {
    const res = await fetch(`${API}/api/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      aiProvider: string; hasAnthropicKey: boolean; hasOpenrouterKey: boolean;
      deployAdapter: string; vercelScope: string; alertWebhookUrl: string;
      slotVerifyIntervalMinutes: number; hasCustomPassword: boolean;
    }>;
  } catch { return null; }
}

export default async function SettingsPage() {
  const { token } = await requireOwnerSession();
  const settings = await getSettings(token);

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="border-b px-8 py-5 flex items-center gap-3 sticky top-0 z-10 backdrop-blur-sm"
        style={{ borderColor: 'var(--border)', background: 'rgba(9,8,10,0.85)' }}>
        <Link href="/admin" className="text-sm" style={{ color: 'var(--text-3)' }}>← Admin</Link>
        <span style={{ color: 'var(--border-2)' }}>/</span>
        <span className="text-sm font-medium">Settings</span>
      </header>
      <div className="max-w-2xl mx-auto px-8 py-10">
        <h1 className="font-display text-3xl font-medium mb-2">Settings</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>
          Configure AI providers, deployment, monitoring, and access.
        </p>
        {settings
          ? <SettingsForm initial={settings} token={token} />
          : <p className="text-sm" style={{ color: 'var(--text-3)' }}>Could not load settings — is the API running?</p>}
      </div>
    </main>
  );
}
