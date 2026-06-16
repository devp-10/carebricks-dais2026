import { TRUST_HEX, TRUST_COPY, type TrustTier } from '../../lib/labels';

export function Legend({ showFacilities }: { showFacilities: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-x-5 gap-y-2 rounded-[var(--radius)] border border-line bg-surface/90 px-3.5 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-sm">
      {/* risk = hue */}
      <div>
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">
          Gap risk
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-28 rounded-full"
            style={{
              background: 'linear-gradient(90deg,#5B6472,#E6A23C,#D2693F,#B23B3B)',
            }}
          />
          <span className="text-[10px] text-faint">low → high</span>
        </div>
      </div>

      {/* confidence = texture */}
      <div>
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">
          Confidence
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="hatch size-3 rounded-[3px] border border-line" style={{ background: '#9AA1AB' }} />
            data-poor
          </span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-[3px] border border-line" style={{ background: '#ECEAE3' }} />
            no data
          </span>
        </div>
      </div>

      {/* facility trust tiers */}
      {showFacilities && (
        <div>
          <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">
            Facility trust
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
