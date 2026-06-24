interface Props {
  size?: number;
  /** 'full' = mark + wordmark, 'mark' = icon only, 'word' = wordmark only */
  variant?: 'full' | 'mark' | 'word';
  className?: string;
}

export function CastorLogo({ size = 32, variant = 'full', className = '' }: Props) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer ring — warm amber stroke */}
      <circle cx="16" cy="16" r="14.5" stroke="#E8A828" strokeWidth="1.5" />

      {/* Left bracket */}
      <path
        d="M13 9 L10 9 Q8.5 9 8.5 10.5 L8.5 21.5 Q8.5 23 10 23 L13 23"
        stroke="#E8A828"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Right bracket */}
      <path
        d="M19 9 L22 9 Q23.5 9 23.5 10.5 L23.5 21.5 Q23.5 23 22 23 L19 23"
        stroke="#E8A828"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Slot line — short center dash */}
      <line x1="13.5" y1="16" x2="18.5" y2="16" stroke="#E8A828" strokeWidth="1.5" strokeLinecap="round" />

      {/* Cursor dot */}
      <circle cx="20" cy="16" r="1.25" fill="#E8A828" />
    </svg>
  );

  const wordmark = (
    <span
      style={{
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: size * 0.62,
        fontWeight: 500,
        color: 'var(--text)',
        letterSpacing: '-0.01em',
        lineHeight: 1,
      }}
    >
      castor
    </span>
  );

  if (variant === 'mark') return <span className={className}>{mark}</span>;
  if (variant === 'word') return <span className={className}>{wordmark}</span>;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      {wordmark}
    </span>
  );
}
