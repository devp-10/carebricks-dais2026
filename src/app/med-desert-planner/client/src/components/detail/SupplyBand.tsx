import type { DistrictScore } from '../../types';
import { bandGeometry } from '../../lib/stats';
import { pct } from '../../lib/format';

export function SupplyBand({ row }: { row: DistrictScore }) {
  const g = bandGeometry(row.wilson_lo, row.wilson_hi, row.documented_supply_rate);

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-3.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          Supply
        </span>
        <span className="mono text-[13px] font-semibold text-ink">
          {pct(row.documented_supply_rate)}
        </span>
      </div>

      <div className="relative h-2.5 w-full rounded-full bg-bg-sunken">
        {/* Wilson 95% interval */}
        <div
          className="absolute top-0 h-full rounded-full bg-accent/25"
          style={{ left: `${g.loPct}%`, width: `${g.widthPct}%` }}
        />
        {/* point estimate */}
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-sm"
          style={{ left: `${g.pointPct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>
          <span className="mono text-ink">{row.k_facilities}</span> of{' '}
          <span className="mono text-ink">{row.n_facilities}</span> facilities on record
        </span>
        <span className="mono text-faint">
          95% CI {pct(row.wilson_lo)}–{pct(row.wilson_hi)}
        </span>
      </div>
    </div>
  );
}
