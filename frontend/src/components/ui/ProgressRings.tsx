type Ring = { value: number; color: string };

/** Concentric progress rings (profile card in the reference design). */
export function ProgressRings({ rings, size = 120 }: { rings: Ring[]; size?: number }) {
  const center = size / 2;
  const stroke = 9;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {rings.map((ring, i) => {
        const r = center - stroke / 2 - i * (stroke + 5);
        const circumference = 2 * Math.PI * r;
        const value = Math.max(0, Math.min(100, ring.value));
        return (
          <g key={i} transform={`rotate(-90 ${center} ${center})`}>
            <circle cx={center} cy={center} r={r} fill="none" stroke="#eeedf6" strokeWidth={stroke} />
            <circle
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
              style={{ transition: 'stroke-dasharray 600ms ease' }}
            />
          </g>
        );
      })}
    </svg>
  );
}
