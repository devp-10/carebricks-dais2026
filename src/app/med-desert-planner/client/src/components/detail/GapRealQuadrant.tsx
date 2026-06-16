import type { DistrictScore } from '../../types';
import { quadrant, QUADRANT_COPY, QUADRANT_BLURB, type Quadrant } from '../../lib/stats';
import { isDataPoor } from '../../lib/labels';
import { cn } from '../../lib/utils';

const CELLS: Array<{ q: Quadrant; gridArea: string }> = [
  { q: 'collect_data', gridArea: '1 / 1' }, // high gap, low confidence
  { q: 'act_now', gridArea: '1 / 2' }, // high gap, high confidence
  { q: 'lower_priority', gridArea: '2 / 1' }, // low gap, low confidence
  { q: 'covered', gridArea: '2 / 2' }, // low gap, high confidence
];

export function GapRealQuadrant({ row }: { row: DistrictScore }) {
  const confident = !isDataPoor(row.confidence_label, row.verdict_label);
  const active = quadrant(row.gap_score, confident);

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-3.5">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
        Is this gap real?
      </p>
      <div className="flex gap-3">
        <div className="relative pl-6">
          {/* axes */}
          <span className="absolute left-0 top-[56px] -translate-y-1/2 -rotate-90 text-[8.5px] uppercase tracking-wide text-faint">
            gap →
          </span>
          <div
            className="grid h-[112px] w-[112px] gap-1"
            style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}
          >
            {CELLS.map(({ q, gridArea }) => (
              <div
                key={q}
                style={{ gridArea }}
                className={cn(
                  'flex items-center justify-center rounded-[6px] border px-1 text-center text-[9px] font-medium leading-tight',
                  q === active
                    ? 'border-accent bg-accent text-white shadow-[var(--shadow-card)]'
                    : 'border-line bg-bg-sunken text-faint',
                )}
              >
                {QUADRANT_COPY[q]}
              </div>
            ))}
          </div>
          <div className="mt-1 text-center text-[8.5px] uppercase tracking-wide text-faint">
            confidence →
          </div>
        </div>

        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink">{QUADRANT_COPY[active]}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">{QUADRANT_BLURB[active]}</p>
        </div>
      </div>
    </div>
  );
}
