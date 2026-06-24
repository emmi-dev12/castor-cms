'use client';

import { useRef, useEffect } from 'react';
import type { SlotDescriptor, SlotValue } from '@castor/types';

interface Props {
  descriptor: SlotDescriptor;
  isDirty: boolean;
  error?: string;
  aiHighlight: boolean;
  onChange: (value: SlotValue) => void;
}

export function SlotEditor({ descriptor, isDirty, error, aiHighlight, onChange }: Props) {
  const { type, currentValue, constraints, slotId } = descriptor;

  const borderColor = error ? 'var(--red)' : aiHighlight ? 'var(--purple)' : isDirty ? 'var(--accent)' : 'var(--border)';
  const bgColor = error ? 'var(--red-dim)' : aiHighlight ? 'var(--purple-dim)' : isDirty ? 'var(--accent-dim)' : 'var(--surface-2)';

  return (
    <div className="rounded-lg p-3 space-y-2 transition-all duration-150"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono truncate" style={{ color: 'var(--text-3)' }}>
          {slotId.slice(0, 14)}…
        </span>
        <div className="flex gap-1 shrink-0">
          {aiHighlight && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--purple-dim)', color: 'var(--purple)', fontSize: '0.65rem' }}>AI</span>}
          {isDirty && !aiHighlight && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: '0.65rem' }}>edited</span>}
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--text-3)', fontSize: '0.65rem' }}>{type}</span>
        </div>
      </div>

      {type === 'text' && currentValue.type === 'text' && (
        <TextEditor value={currentValue.value} maxLength={constraints.maxLength}
          onChange={v => onChange({ type: 'text', value: v })} />
      )}
      {type === 'image' && currentValue.type === 'image' && (
        <ImageEditor src={currentValue.src} alt={currentValue.alt}
          onChange={(src, alt) => onChange({ type: 'image', src, alt })} />
      )}
      {type === 'link' && currentValue.type === 'link' && (
        <LinkEditor href={currentValue.href} label={currentValue.label}
          onChange={(href, label) => onChange({ type: 'link', href, label })} />
      )}

      {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}

const inpStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border-2)',
  borderRadius: 6, padding: '0.4rem 0.6rem', color: 'var(--text)',
  fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif', outline: 'none',
  transition: 'border-color 0.1s',
};
const lbl = (text: string) => (
  <p className="text-xs mb-1" style={{ color: 'var(--text-3)', fontSize: '0.7rem', letterSpacing: '0.04em' }}>{text}</p>
);

function TextEditor({ value, maxLength, onChange }: { value: string; maxLength?: number; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.textContent !== value) ref.current.textContent = value; }, [value]);

  function onInput() {
    const text = ref.current?.textContent ?? '';
    if (maxLength && text.length > maxLength) {
      ref.current!.textContent = text.slice(0, maxLength);
      const sel = window.getSelection(); const range = document.createRange();
      range.selectNodeContents(ref.current!); range.collapse(false);
      sel?.removeAllRanges(); sel?.addRange(range);
      return;
    }
    onChange(text);
  }

  const len = value.length;
  const atLimit = maxLength !== undefined && len >= maxLength;

  return (
    <div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={onInput}
        className="rounded-md px-2.5 py-2 text-xs min-h-[2rem] whitespace-pre-wrap break-words outline-none transition-colors"
        style={{ ...inpStyle, minHeight: '2rem' }} />
      {maxLength && (
        <p className="text-right mt-0.5" style={{ fontSize: '0.65rem', color: atLimit ? 'var(--red)' : 'var(--text-3)' }}>
          {len}/{maxLength}
        </p>
      )}
    </div>
  );
}

function ImageEditor({ src, alt, onChange }: { src: string; alt: string; onChange: (s: string, a: string) => void }) {
  const valid = (v: string) => { try { new URL(v); return true; } catch { return false; } };
  return (
    <div className="space-y-1.5">
      <div>
        {lbl('IMAGE URL')}
        <input type="url" value={src} onChange={e => onChange(e.target.value, alt)} placeholder="https://…" style={{ ...inpStyle, borderColor: src && !valid(src) ? 'var(--red)' : 'var(--border-2)' }} />
      </div>
      <div>
        {lbl('ALT TEXT')}
        <input type="text" value={alt} onChange={e => onChange(src, e.target.value)} placeholder="Describe the image" style={inpStyle} />
      </div>
      {src && valid(src) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-16 object-cover rounded-md" style={{ border: '1px solid var(--border-2)' }} />
      )}
    </div>
  );
}

function LinkEditor({ href, label, onChange }: { href: string; label: string; onChange: (h: string, l: string) => void }) {
  const valid = (v: string) => { try { new URL(v); return true; } catch { return false; } };
  return (
    <div className="space-y-1.5">
      <div>
        {lbl('URL')}
        <input type="url" value={href} onChange={e => onChange(e.target.value, label)} placeholder="https://…" style={{ ...inpStyle, borderColor: href && !valid(href) ? 'var(--red)' : 'var(--border-2)' }} />
      </div>
      <div>
        {lbl('LABEL')}
        <input type="text" value={label} onChange={e => onChange(href, e.target.value)} placeholder="Link text" style={inpStyle} />
      </div>
    </div>
  );
}
