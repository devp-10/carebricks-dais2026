import { ArrowLeft, Flag } from 'lucide-react';
import type { DemandDetail, DistrictScore, EvidenceRow } from '../../types';
import { VERDICT, isDataPoor } from '../../lib/labels';
import { ErrorState } from '../common/States';
import { cn } from '../../lib/utils';
import { DemandContext } from './DemandContext';
import { SupplyBand } from './SupplyBand';
import { GapRealQuadrant } from './GapRealQuadrant';
import { FacilityList } from './FacilityList';

type ReviewStatus = 'verified' | 'unclear' | 'disputed';

function VerdictBadge({ row }: { row: DistrictScore }) {
  const dp = isDataPoor(row.confidence_label, row.verdict_label);
  const tone = dp ? '#c98a2e' : row.verdict_label === 'likely_real_gap' ? '#b23b3b' : '#5b6472';
  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ borderColor: `${tone}55`, background: `${tone}12`, color: tone }}
    >
      {VERDICT[row.verdict_label].copy}
    </span>
  );
}

export function DistrictDetail({
  row,
  demand,
  evidence,
  loading,
  error,
  flagged,
  pingedFacility,
  onClose,
  onToggleFlag,
  onShortlist,
  onReview,
}: {
  row: DistrictScore;
  demand: DemandDetail | null;
  evidence: EvidenceRow[];
  loading: boolean;
  error?: string | null;
  flagged: boolean;
  pingedFacility: string | null;
  onClose: () => void;
  onToggleFlag: () => void;
  onShortlist: (facilityId: string) => void;
  onReview: (claim: EvidenceRow, status: ReviewStatus) => Promise<void> | void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-bg">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line text-muted hover:border-faint hover:text-ink"
          title="Back to ranked list"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-ink">{row.district_name}</h2>
          <p className="truncate text-[11px] text-muted">{row.state}</p>
        </div>
        <VerdictBadge row={row} />
        <button
          type="button"
          onClick={onToggleFlag}
          title={flagged ? 'Unflag' : 'Flag for scenario'}
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] border transition-colors',
            flagged ? 'border-accent bg-accent text-white' : 'border-line text-muted hover:text-ink',
          )}
        >
          <Flag className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
        <DemandContext demand={demand} loading={loading} />
        <SupplyBand row={row} />
        <GapRealQuadrant row={row} />

        <div className="pt-1">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold text-ink">Source records</h3>
            <span className="text-[11px] text-muted">from original sources</span>
          </div>
          {error ? (
            <ErrorState message={error} />
          ) : (
            <FacilityList
              evidence={evidence}
              loading={loading}
              pingedFacility={pingedFacility}
              onShortlist={onShortlist}
              onReview={onReview}
            />
          )}
        </div>
      </div>
    </div>
  );
}
