import type { CSSProperties } from 'react';
import { Flag } from 'lucide-react';
import type { DistrictScore } from '../../types';
import { riskHex, isDataPoor } from '../../lib/labels';
import { compactNumber, displaySpecialty, pct, score } from '../../lib/format';
import { cn } from '../../lib/utils';

function clampPct(value: number | null | undefined, scale = 100): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, (value / scale) * 100));
}

function MiniMeter({ label, value, fill, tone }: { label: string; value: string; fill: number; tone: string }) {
  return (
    <span className="w-[76px] shrink-0">
      <span className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-[9.5px] uppercase tracking-[0.04em] text-muted">{label}</span>
        <span className="mono text-[9.5px] text-ink">{value}</span>
      </span>
      <span className="block h-1.5 overflow-hidden rounded-full bg-bg-sunken">
        <span
          className="block h-full rounded-full bg-[var(--meter-tone)]"
          style={{ '--meter-tone': tone, width: `${fill}%` } as CSSProperties}
        />
      </span>
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="w-[76px] shrink-0">
      <span className="mb-1 block truncate text-[9.5px] uppercase tracking-[0.04em] text-muted">{label}</span>
      <span className="mono block truncate text-[13px] leading-none text-ink">{value}</span>
    </span>
  );
}

export function DistrictRow({
  row,
  selected,
  flagged,
  onSelect,
  onToggleFlag,
}: {
  row: DistrictScore;
  selected: boolean;
  flagged: boolean;
  onSelect: () => void;
  onToggleFlag: () => void;
}) {
  const dp = isDataPoor(row.confidence_label, row.verdict_label);
  const hue = dp ? '#9aa1ab' : riskHex(row.gap_score);

  return (
    <div
      className={cn(
        'group relative flex items-stretch gap-3 overflow-hidden rounded-[var(--radius)] border bg-surface pr-2.5 shadow-[0_1px_0_rgba(28,26,22,0.03)] transition-colors',
        selected ? 'border-line-strong shadow-[var(--shadow-card)]' : 'border-line hover:bg-surface-2'
      )}
    >
      {/* risk rail — hue = gap, hatch overlay = data-poor */}
      <span className="relative w-[5px] shrink-0" style={{ background: hue }}>
        {dp && <span className="hatch absolute inset-0" />}
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="flex flex-1 items-center gap-3 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ink">{row.district_name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">
            {row.state} · {displaySpecialty(row.specialty)}
          </span>
        </span>

        <span className="hidden items-center gap-3 xl:flex">
          <MiniMeter
            label="Demand"
            value={score(row.demand_score)}
            fill={clampPct(row.demand_score)}
            tone="var(--color-accent)"
          />
          <MiniMeter
            label="Supply"
            value={pct(row.documented_supply_rate)}
            fill={clampPct(row.documented_supply_rate, 1)}
            tone="var(--color-ok)"
          />
          <MiniStat label="Population" value={compactNumber(row.population)} />
        </span>

        <span className="shrink-0 text-right">
          <span className="mono block text-[17px] font-medium leading-none" style={{ color: hue }}>
            {dp ? '—' : score(row.gap_score)}
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-faint">gap</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleFlag}
        title={flagged ? 'Unflag district' : 'Flag for scenario'}
        className={cn(
          'my-2 grid w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border transition-colors',
          flagged
            ? 'border-accent bg-accent text-white'
            : 'border-transparent text-faint opacity-0 hover:border-line hover:text-ink group-hover:opacity-100'
        )}
      >
        <Flag className="size-3.5" />
      </button>
    </div>
  );
}
