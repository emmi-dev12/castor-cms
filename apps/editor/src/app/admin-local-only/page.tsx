import { CastorLogo } from '@/components/CastorLogo';

export default function AdminLocalOnlyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: 'var(--bg)' }}>
      <div className="max-w-md w-full text-center animate-fade-up">
        <CastorLogo size={48} variant="mark" className="mx-auto mb-8" />

        <div className="rounded-2xl px-8 py-10"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--text-3)' }}>
            Access Restricted
          </p>
          <h1 className="font-display text-2xl font-medium mb-4" style={{ color: 'var(--text)' }}>
            Admin panel is local only
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-2)' }}>
            The Castor admin panel can only be accessed from the machine it runs on.
            To manage your sites, open this URL on your admin computer.
          </p>
          <div className="rounded-lg px-4 py-3 font-mono text-sm"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-3)' }}>
            localhost:3001/admin
          </div>
        </div>

        <p className="text-xs mt-6" style={{ color: 'var(--text-3)' }}>
          Looking to edit content?{' '}
          <a href="/login" style={{ color: 'var(--accent)' }}>Sign in as a client →</a>
        </p>
      </div>
    </main>
  );
}
