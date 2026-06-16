import type { DemandDetail } from '../../types';
import { score, compactNumber } from '../../lib/format';
import { Skeleton } from '../common/States';
import { cn } from '../../lib/utils';

function QualityChip({ n, label, tone }: { n: number; label: string; tone: string }) {
  if (!n) return null;
  return (
    <span
      className={cn('rounded-full border px-2 py-0.5 text-[10.5px] font-medium')}
      style={{ borderColor: `${tone}55`, background: `${tone}10`, color: tone }}
    >
      {n} {label}
    </span>
  );
}

export function DemandContext({
  demand,
  loading,
}: {
  demand: DemandDetail | null;
  loading: boolean;
}) {
  if (loading && !demand) return <Skeleton className="h-[92px] w-full rounded-[var(--radius)]" />;
  if (!demand) return null;

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
            Demand context · NFHS-5
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="mono text-[22px] font-semibold leading-none text-ink">
              {score(demand.demand_score)}
            </span>
            <span className="text-[11px] text-muted">demand score</span>
          </div>
        </div>
        {demand.population != null && (
          <div className="text-right">
            <span className="mono block text-[15px] font-semibold text-ink">
              {compactNumber(demand.population)}
            </span>
            <span className="text-[10.5px] text-muted">population</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <QualityChip n={demand.usable_indicator_count} label="usable" tone="#2e8b6f" />
        <QualityChip n={demand.low_sample_indicator_count} label="low-sample" tone="#c98a2e" />
        <QualityChip n={demand.suppressed_indicator_count} label="suppressed" tone="#b23b3b" />
      </div>
    </div>
  );
}
