import type { DistrictScore } from '../../types';
import { ErrorState } from '../common/States';
import { KpiStrip } from '../kpi/KpiStrip';
import { DistrictList } from './DistrictList';

export function InsightRail({
  rows,
  loading,
  error,
  selectedKey,
  flagged,
  onSelect,
  onToggleFlag,
}: {
  rows: DistrictScore[];
  loading: boolean;
  error?: string | null;
  selectedKey: string | null;
  flagged: Set<string>;
  onSelect: (row: DistrictScore) => void;
  onToggleFlag: (row: DistrictScore) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line p-3">
        <KpiStrip rows={rows} />
      </div>
      <div className="flex items-baseline justify-between px-4 py-2.5">
        <h2 className="text-[13px] font-semibold text-ink">Ranked districts</h2>
        <span className="text-[11px] text-muted">highest-risk first</span>
      </div>
      {error ? (
        <ErrorState message={error} />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <DistrictList
            rows={rows}
            loading={loading}
            selectedKey={selectedKey}
            flagged={flagged}
            onSelect={onSelect}
            onToggleFlag={onToggleFlag}
          />
        </div>
      )}
    </div>
  );
}
