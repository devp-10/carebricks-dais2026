import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { DistrictScore } from '../../types';
import { districtKey } from '../../types';
import { groupByVerdict } from '../../lib/group';
import { VERDICT } from '../../lib/labels';
import type { VerdictLabel } from '../../types';
import { cn } from '../../lib/utils';
import { EmptyState, Skeleton } from '../common/States';
import { DistrictRow } from './DistrictRow';

export function DistrictList({
  rows,
  loading,
  selectedKey,
  flagged,
  onSelect,
  onToggleFlag,
}: {
  rows: DistrictScore[];
  loading: boolean;
  selectedKey: string | null;
  flagged: Set<string>;
  onSelect: (row: DistrictScore) => void;
  onToggleFlag: (row: DistrictScore) => void;
}) {
  const [collapsed, setCollapsed] = useState<Partial<Record<VerdictLabel, boolean>>>({});

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2 p-3">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((k) => (
          <Skeleton key={k} className="h-[58px] w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No districts match this view"
        hint="Try a different capability or region."
      />
    );
  }

  const groups = groupByVerdict(rows);

  return (
    <div>
      {groups.map((g, index) => {
        const open = !(collapsed[g.verdict] ?? index !== 0);
        return (
        <section key={g.verdict}>
          <header className="sticky top-0 z-10 border-y border-line bg-bg-sunken/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [g.verdict]: open }))}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-4 py-1.5 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronRight
                  className={cn('size-3.5 shrink-0 text-faint transition-transform', open && 'rotate-90')}
                />
                <span className="truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
                  {VERDICT[g.verdict].copy}
                </span>
              </span>
              <span className="mono shrink-0 text-[11px] text-faint">{g.districts.length}</span>
            </button>
          </header>
          {open &&
            g.districts.map((row) => {
              const key = districtKey(row.state, row.district_name, row.specialty);
              return (
                <DistrictRow
                  key={key}
                  row={row}
                  selected={selectedKey === key}
                  flagged={flagged.has(key)}
                  onSelect={() => onSelect(row)}
                  onToggleFlag={() => onToggleFlag(row)}
                />
              );
            })}
        </section>
        );
      })}
    </div>
  );
}
