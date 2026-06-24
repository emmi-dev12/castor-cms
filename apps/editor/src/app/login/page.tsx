import { ownerLoginAction, clientLoginAction } from './actions';
import { CastorLogo } from '@/components/CastorLogo';

interface Props {
  searchParams: Promise<{ error?: string; siteId?: string; expired?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, siteId, expired } = await searchParams;
  const isClient = !!siteId;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg)' }}>

      {/* Background geometry */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, var(--border-2), transparent)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, var(--border-2), transparent)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[400px] w-[1px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--border), transparent)', left: '15%' }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-[400px] w-[1px]"
          style={{ background: 'linear-gradient(180deg, transparent, var(--border), transparent)', right: '15%' }} />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-[380px] animate-fade-up">

        {/* Wordmark */}
        <div className="flex flex-col items-center mb-10">
          <CastorLogo size={48} variant="mark" className="mb-4" />
          <CastorLogo size={40} variant="word" />
          <p className="text-xs tracking-[0.25em] uppercase mt-2" style={{ color: 'var(--text-3)' }}>
            Content Studio
          </p>
        </div>

        {/* Alerts */}
        {expired && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in"
            style={{ background: 'var(--accent-dim)', border: '1px solid rgba(232,168,40,0.2)', color: 'var(--accent)' }}>
            Session expired — please sign in again.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm animate-fade-in"
            style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,112,112,0.2)', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        {/* Card */}
        <div className="rounded-xl p-7 space-y-5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
          }}>

          {isClient ? (
            <form action={clientLoginAction} className="space-y-4">
              <input type="hidden" name="siteId" value={siteId} />
              <div>
                <label className="block text-xs mb-2 tracking-wide" style={{ color: 'var(--text-3)' }}>
                  SITE PASSWORD
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  autoFocus
                  placeholder="Enter your password"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150 focus-accent"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-2)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <button type="submit" className="w-full rounded-lg py-3 font-medium text-sm transition-all duration-150 hover-accent"
                style={{ background: 'var(--accent)', color: '#0A0808' }}>
                Enter Editor
              </button>
            </form>
          ) : (
            <form action={ownerLoginAction} className="space-y-4">
              <div>
                <label className="block text-xs mb-2 tracking-wide" style={{ color: 'var(--text-3)' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  name="masterKey"
                  required
                  autoFocus
                  placeholder="Your master password"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150 focus-accent"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-2)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <button type="submit" className="w-full rounded-lg py-3 font-medium text-sm transition-all duration-150 hover-accent"
                style={{ background: 'var(--accent)', color: '#0A0808' }}>
                Sign In
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: 'var(--text-3)' }}>
          AI-native · Template-locked · Guardian-validated
        </p>
      </div>
    </main>
  );
}
