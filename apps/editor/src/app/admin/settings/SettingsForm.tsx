'use client';

import { useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Settings {
  aiProvider: string;
  hasAnthropicKey: boolean;
  hasOpenrouterKey: boolean;
  deployAdapter: string;
  vercelScope: string;
  alertWebhookUrl: string;
  slotVerifyIntervalMinutes: number;
  hasCustomPassword: boolean;
}

interface Props { initial: Settings; token: string; }
type Status = 'idle' | 'saving' | 'saved' | 'error';

const baseInpStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border-2)',
  borderRadius: 8, padding: '0.6rem 0.875rem', color: 'var(--text)',
  fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif', outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={baseInpStyle}
    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.boxShadow = 'none'; }} />;
}

function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...baseInpStyle, cursor: 'pointer' }}
    onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.boxShadow = 'none'; }} />;
}

function Lbl({ text, hint }: { text: string; hint?: string }) {
  return <div className="mb-1.5">
    <p className="text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>{text}</p>
    {hint && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', opacity: 0.6 }}>{hint}</p>}
  </div>;
}

function SaveBtn({ st }: { st: Status }) {
  return <button type="submit" disabled={st === 'saving'}
    className="text-sm px-5 py-2 rounded-lg font-medium transition-all duration-200"
    style={{
      background: st === 'saved' ? 'var(--green-dim)' : 'var(--accent)',
      color: st === 'saved' ? 'var(--green)' : '#0A0808',
      border: st === 'saved' ? '1px solid rgba(82,200,120,0.2)' : '1px solid transparent',
      opacity: st === 'saving' ? 0.6 : 1,
    }}>
    {st === 'saving' ? 'Saving…' : st === 'saved' ? '✓ Saved' : 'Save changes'}
  </button>;
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
    <div className="px-6 py-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{title}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
    <div className="px-6 py-5 space-y-4" style={{ background: 'var(--surface-2)' }}>{children}</div>
  </div>;
}

export function SettingsForm({ initial, token }: Props) {
  const [s, setS] = useState(initial);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [sts, setSts] = useState<Record<string, Status>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function save(id: string, body: Record<string, unknown>) {
    setSts(p => ({ ...p, [id]: 'saving' })); setErrs(p => ({ ...p, [id]: '' }));
    try {
      const r = await fetch(`${API}/api/admin/settings`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok) throw new Error(d.error ?? 'Failed');
      setSts(p => ({ ...p, [id]: 'saved' }));
      setTimeout(() => setSts(p => ({ ...p, [id]: 'idle' })), 2500);
    } catch (e) {
      setErrs(p => ({ ...p, [id]: e instanceof Error ? e.message : String(e) }));
      setSts(p => ({ ...p, [id]: 'error' }));
    }
  }

  const row = 'flex items-center gap-3 pt-1';
  const err = (id: string) => errs[id] ? <p className="text-xs" style={{ color: 'var(--red)' }}>{errs[id]}</p> : null;

  return (
    <div className="space-y-4 animate-fade-up">

      <Card title="AI Chat" sub="Language model for content suggestions">
        <form onSubmit={e => { e.preventDefault(); save('ai', { aiProvider: s.aiProvider, ...(anthropicKey && { anthropicApiKey: anthropicKey }), ...(openrouterKey && { openrouterApiKey: openrouterKey }) }); }} className="space-y-4">
          <div><Lbl text="PROVIDER" />
            <Sel value={s.aiProvider} onChange={e => setS({ ...s, aiProvider: e.target.value })}>
              <option value="anthropic">Anthropic — Claude</option>
              <option value="openrouter">OpenRouter</option>
            </Sel>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Lbl text="ANTHROPIC KEY" hint={s.hasAnthropicKey ? '● Saved' : undefined} />
              <Input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder={s.hasAnthropicKey ? '••••••••• (replace)' : 'sk-ant-…'} autoComplete="off" /></div>
            <div><Lbl text="OPENROUTER KEY" hint={s.hasOpenrouterKey ? '● Saved' : undefined} />
              <Input type="password" value={openrouterKey} onChange={e => setOpenrouterKey(e.target.value)} placeholder={s.hasOpenrouterKey ? '••••••••• (replace)' : 'sk-or-…'} autoComplete="off" /></div>
          </div>
          <div className={row}><SaveBtn st={sts['ai'] ?? 'idle'} />{err('ai')}</div>
        </form>
      </Card>

      <Card title="Deployment" sub="Where published static pages are sent">
        <form onSubmit={e => { e.preventDefault(); save('deploy', { deployAdapter: s.deployAdapter, vercelScope: s.vercelScope }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Lbl text="TARGET" />
              <Sel value={s.deployAdapter} onChange={e => setS({ ...s, deployAdapter: e.target.value })}>
                <option value="vercel">Vercel</option>
                <option value="render">Render</option>
              </Sel>
            </div>
            <div><Lbl text="VERCEL SCOPE" hint="Team or personal slug" />
              <Input type="text" value={s.vercelScope} onChange={e => setS({ ...s, vercelScope: e.target.value })} placeholder="my-team" /></div>
          </div>
          <div className={row}><SaveBtn st={sts['deploy'] ?? 'idle'} />{err('deploy')}</div>
        </form>
      </Card>

      <Card title="Monitoring" sub="Alerts when content slots become undetectable">
        <form onSubmit={e => { e.preventDefault(); save('alerts', { alertWebhookUrl: s.alertWebhookUrl, slotVerifyIntervalMinutes: s.slotVerifyIntervalMinutes }); }} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><Lbl text="WEBHOOK URL" />
              <Input type="url" value={s.alertWebhookUrl} onChange={e => setS({ ...s, alertWebhookUrl: e.target.value })} placeholder="https://hooks.example.com/…" /></div>
            <div><Lbl text="INTERVAL (MIN)" />
              <Input type="number" min={1} max={60} value={s.slotVerifyIntervalMinutes} onChange={e => setS({ ...s, slotVerifyIntervalMinutes: Number(e.target.value) })} /></div>
          </div>
          <div className={row}><SaveBtn st={sts['alerts'] ?? 'idle'} />{err('alerts')}</div>
        </form>
      </Card>

      <Card title="Owner Password" sub={s.hasCustomPassword ? '● Custom password active' : 'Using password from .env'}>
        <form onSubmit={e => {
          e.preventDefault();
          if (newPwd !== confirmPwd) { setErrs(p => ({ ...p, password: 'Passwords do not match.' })); return; }
          if (newPwd.length < 6) { setErrs(p => ({ ...p, password: 'Must be at least 6 characters.' })); return; }
          save('password', { newPassword: newPwd });
          setNewPwd(''); setConfirmPwd('');
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Lbl text="NEW PASSWORD" />
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters" autoComplete="new-password" /></div>
            <div><Lbl text="CONFIRM" />
              <Input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repeat" autoComplete="new-password" /></div>
          </div>
          <div className={row}><SaveBtn st={sts['password'] ?? 'idle'} />{err('password')}</div>
        </form>
      </Card>

    </div>
  );
}
