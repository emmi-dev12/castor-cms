import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:         'var(--bg)',
        surface:    'var(--surface)',
        surface2:   'var(--surface-2)',
        border:     'var(--border)',
        border2:    'var(--border-2)',
        tx:         'var(--text)',
        tx2:        'var(--text-2)',
        tx3:        'var(--text-3)',
        accent:     'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        green:      'var(--green)',
        'green-dim': 'var(--green-dim)',
        red:        'var(--red)',
        'red-dim':  'var(--red-dim)',
        blue:       'var(--blue)',
        'blue-dim': 'var(--blue-dim)',
        purple:     'var(--purple)',
        'purple-dim': 'var(--purple-dim)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};

export default config;
