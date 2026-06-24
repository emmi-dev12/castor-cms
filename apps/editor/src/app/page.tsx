import Link from 'next/link';
import { CastorLogo } from '@/components/CastorLogo';

const EMAIL = 'matthew.hapnicks@outlook.com';

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <CastorLogo size={28} />
        <a href={`mailto:${EMAIL}`}
          className="text-sm px-5 py-2 rounded-lg font-medium transition-all hover-accent"
          style={{ background: 'var(--accent)', color: '#0A0808' }}>
          Get in touch
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-28 text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-8"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(232,168,40,0.2)' }}>
          <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
          AI-powered content management
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-medium leading-[1.08] mb-6"
          style={{ letterSpacing: '-0.02em' }}>
          Your website,<br />
          <span style={{ color: 'var(--accent)' }}>your words.</span>
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: 'var(--text-2)' }}>
          I build your site. You get a beautiful, simple editor to update every word,
          image, and link — no code, no agency, no waiting.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href={`mailto:${EMAIL}?subject=I want a website with Castor&body=Hi Matthew,%0A%0AI'm interested in having a website built with Castor CMS. Here's a bit about what I need:%0A%0A`}
            className="text-base px-7 py-3.5 rounded-xl font-medium transition-all hover-accent"
            style={{ background: 'var(--accent)', color: '#0A0808' }}>
            Start a project →
          </a>
          <a href="#how-it-works"
            className="text-base px-7 py-3.5 rounded-xl font-medium transition-all"
            style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            See how it works
          </a>
        </div>
      </section>

      {/* Editor preview mockup */}
      <section className="max-w-5xl mx-auto px-8 pb-24 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          {/* Fake window bar */}
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--red-dim)', border: '1px solid rgba(240,112,112,0.3)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(232,168,40,0.3)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--green-dim)', border: '1px solid rgba(82,200,120,0.3)' }} />
            <div className="flex-1 mx-4 h-5 rounded-md" style={{ background: 'var(--bg)', maxWidth: 280, margin: '0 auto' }} />
          </div>
          {/* Fake editor layout */}
          <div className="flex h-64 md:h-96">
            {/* Sidebar */}
            <div className="w-56 shrink-0 p-4 space-y-2" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div className="h-5 rounded-md w-3/4" style={{ background: 'var(--border-2)' }} />
              <div className="h-16 rounded-lg mt-3" style={{ background: 'var(--bg)', border: '1px solid rgba(232,168,40,0.25)' }}>
                <div className="px-3 pt-2 pb-1">
                  <div className="h-2 rounded w-1/2 mb-1.5" style={{ background: 'var(--accent-dim)' }} />
                  <div className="h-2 rounded w-3/4" style={{ background: 'var(--border-2)' }} />
                </div>
              </div>
              <div className="h-12 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
              <div className="h-12 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
              <div className="h-12 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }} />
            </div>
            {/* Preview */}
            <div className="flex-1 p-6 md:p-10" style={{ background: 'var(--bg)' }}>
              <div className="h-4 rounded-full w-1/3 mb-4" style={{ background: 'var(--surface-2)' }} />
              <div className="h-8 rounded-full w-3/4 mb-3" style={{ background: 'var(--surface)' }} />
              <div className="h-4 rounded-full w-full mb-2" style={{ background: 'var(--surface-2)' }} />
              <div className="h-4 rounded-full w-5/6 mb-2" style={{ background: 'var(--surface-2)' }} />
              <div className="h-4 rounded-full w-2/3 mb-6" style={{ background: 'var(--surface-2)' }} />
              <div className="h-32 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-8 py-24 animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <p className="text-xs tracking-widest uppercase text-center mb-4" style={{ color: 'var(--text-3)' }}>How it works</p>
        <h2 className="font-display text-4xl font-medium text-center mb-16" style={{ letterSpacing: '-0.01em' }}>
          Three steps to owning your content
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: '01',
              title: 'You brief me',
              body: 'Tell me what your site needs — your industry, goals, brand, and who you\'re speaking to. We get it right before a single line of code is written.',
            },
            {
              n: '02',
              title: 'I build it',
              body: 'I design and build your website, then lock every structural element. Only the content you should change is made editable.',
            },
            {
              n: '03',
              title: 'You edit freely',
              body: 'You get a private link to Castor. Update any text, image, or link instantly. An AI assistant suggests copy if you\'re stuck.',
            },
          ].map(step => (
            <div key={step.n} className="rounded-2xl p-7"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="font-display text-5xl font-medium mb-4" style={{ color: 'var(--accent)', opacity: 0.4 }}>{step.n}</p>
              <p className="font-medium text-base mb-2">{step.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 py-16 animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '⚡', title: 'Instant publishing', body: 'Hit publish and your site updates in seconds. No FTP, no deploys, no waiting on a developer.' },
            { icon: '🛡', title: 'Guardian validation', body: 'Every edit is checked before it saves. You can\'t accidentally break the layout or introduce bad content.' },
            { icon: '🤖', title: 'AI writing assistant', body: 'Stuck on wording? Ask the built-in AI to draft, rewrite, or improve any piece of copy on your page.' },
            { icon: '🕓', title: 'Full version history', body: 'Every save is versioned. Made a mistake? Roll back to any previous state in one click.' },
          ].map(f => (
            <div key={f.title} className="flex gap-5 rounded-2xl p-6"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="font-medium mb-1.5">{f.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-8 py-28 text-center animate-fade-up" style={{ animationDelay: '0.25s' }}>
        <CastorLogo size={44} variant="mark" className="mx-auto mb-8" />
        <h2 className="font-display text-4xl md:text-5xl font-medium mb-5" style={{ letterSpacing: '-0.01em' }}>
          Ready to own your website?
        </h2>
        <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Send me an email and we'll figure out what you need. No obligation, no sales call.
          Just a conversation.
        </p>
        <a href={`mailto:${EMAIL}?subject=I want a website with Castor`}
          className="inline-block text-base px-8 py-4 rounded-xl font-medium transition-all hover-accent"
          style={{ background: 'var(--accent)', color: '#0A0808' }}>
          {EMAIL}
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t px-8 py-8 max-w-6xl mx-auto flex items-center justify-between"
        style={{ borderColor: 'var(--border)' }}>
        <CastorLogo size={20} />
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Built with Castor · {new Date().getFullYear()}
        </p>
        <Link href="/login" className="text-xs transition-colors"
          style={{ color: 'var(--text-3)' }}>
          Client sign in →
        </Link>
      </footer>

    </main>
  );
}
