'use client';

import type { DesignTokens, SpacingPreset } from '@castor/types';

interface ActiveTokens {
  colorIdx: number;
  spacing: SpacingPreset;
  fontIdx: number;
}

interface Props {
  tokens: DesignTokens;
  active: ActiveTokens;
  onChange: (t: ActiveTokens) => void;
}

const SPACING: Record<SpacingPreset, { label: string; sub: string }> = {
  Compact: { label: 'Compact',  sub: 'Tight spacing'    },
  Normal:  { label: 'Normal',   sub: 'Balanced spacing'  },
  Airy:    { label: 'Airy',     sub: 'Generous spacing'  },
};

export function DesignTokenPanel({ tokens, active, onChange }: Props) {
  return (
    <aside className="w-60 flex flex-col shrink-0 overflow-y-auto"
      style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>

      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Design Tokens</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Applied to preview in real time</p>
      </div>

      <div className="px-4 py-4 space-y-6">

        {/* Colors */}
        <section>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>Colors</p>
          {tokens.colors.length === 0
            ? <p className="text-xs" style={{ color: 'var(--text-3)' }}>No colors defined.</p>
            : (
              <div className="flex flex-wrap gap-2">
                {tokens.colors.map((color, i) => {
                  const isActive = active.colorIdx === i;
                  return (
                    <button key={i} title={color}
                      onClick={() => onChange({ ...active, colorIdx: i })}
                      className="w-9 h-9 rounded-lg transition-all duration-150"
                      style={{
                        backgroundColor: color,
                        boxShadow: isActive ? `0 0 0 2px var(--bg), 0 0 0 4px ${color}` : 'none',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  );
                })}
              </div>
            )
          }
          {tokens.colors[active.colorIdx] && (
            <p className="text-xs font-mono mt-2" style={{ color: 'var(--text-3)' }}>
              {tokens.colors[active.colorIdx]}
            </p>
          )}
        </section>

        {/* Spacing */}
        <section>
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>Spacing</p>
          <div className="space-y-1.5">
            {tokens.spacingPresets.map(preset => {
              const isActive = active.spacing === preset;
              return (
                <button key={preset}
                  onClick={() => onChange({ ...active, spacing: preset })}
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150"
                  style={{
                    background: isActive ? 'var(--accent-dim)' : 'var(--surface-2)',
                    border: `1px solid ${isActive ? 'rgba(232,168,40,0.25)' : 'var(--border-2)'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-2)',
                  }}>
                  <p className="text-xs font-medium">{SPACING[preset].label}</p>
                  <p className="text-xs mt-0.5" style={{ color: isActive ? 'rgba(232,168,40,0.6)' : 'var(--text-3)' }}>
                    {SPACING[preset].sub}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Fonts */}
        {tokens.fonts.length > 0 && (
          <section>
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-3)' }}>Fonts</p>
            <div className="space-y-1.5">
              {tokens.fonts.map((font, i) => {
                const isActive = active.fontIdx === i;
                return (
                  <button key={i}
                    onClick={() => onChange({ ...active, fontIdx: i })}
                    className="w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150"
                    style={{
                      fontFamily: font,
                      background: isActive ? 'var(--accent-dim)' : 'var(--surface-2)',
                      border: `1px solid ${isActive ? 'rgba(232,168,40,0.25)' : 'var(--border-2)'}`,
                      color: isActive ? 'var(--accent)' : 'var(--text-2)',
                      fontSize: '0.8rem',
                    }}>
                    {font}
                  </button>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </aside>
  );
}
