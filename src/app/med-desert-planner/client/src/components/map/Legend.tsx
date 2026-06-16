import {
  DATA_POOR_HEX,
  NO_DATA_HEX,
  RISK_STOPS,
  TRUST_COPY,
  TRUST_HEX,
  type TrustTier,
} from '../../lib/labels';

export function Legend({ showFacilities }: { showFacilities: boolean }) {
  const riskGradient = `linear-gradient(90deg,${RISK_STOPS.map(([, hex]) => hex).join(',')})`;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-x-7 gap-y-3 rounded-[var(--radius)] border border-line bg-surface/92 px-3.5 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-sm">
      {/* risk = hue */}
      <div className="min-w-[240px]">
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">
          District gap risk
        </p>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className="text-[10px] text-faint">low</span>
          <span className="h-2.5 min-w-32 rounded-full" style={{ background: riskGradient }} />
          <span className="text-[10px] text-faint">high</span>
        </div>
      </div>

      {/* confidence = texture */}
      <div>
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">
          Evidence quality
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="hatch size-3 rounded-[3px] border border-line" style={{ background: DATA_POOR_HEX }} />
            Low evidence
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-[3px] border border-line" style={{ background: NO_DATA_HEX }} />
            No matched data
          </span>
        </div>
      </div>

      {/* documented supply locations */}
      {showFacilities && (
        <div>
          <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">
            Documented supply
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted">
            {(Object.keys(TRUST_HEX) as TrustTier[])
              .filter((t) => t !== 'no_claim')
              .map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <span
                    className="size-2.5 rounded-full ring-1 ring-white"
                    style={{ background: TRUST_HEX[t] }}
                  />
                  {TRUST_COPY[t]}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
