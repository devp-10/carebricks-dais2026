import { Flag } from 'lucide-react';
import type { DistrictScore } from '../../types';
import { riskHex, isDataPoor } from '../../lib/labels';
import { displaySpecialty, score } from '../../lib/format';
import { cn } from '../../lib/utils';

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
        'group relative flex items-stretch gap-3 border-b border-line pr-2.5 transition-colors',
        selected ? 'bg-accent-soft/60' : 'hover:bg-bg',
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
          <span className="block truncate text-[13.5px] font-semibold text-ink">
            {row.district_name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">
            {row.state} · {displaySpecialty(row.specialty)}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="mono block text-[17px] font-semibold leading-none" style={{ color: hue }}>
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
            : 'border-transparent text-faint opacity-0 hover:border-line hover:text-ink group-hover:opacity-100',
        )}
      >
        <Flag className="size-3.5" />
      </button>
    </div>
  );
}
