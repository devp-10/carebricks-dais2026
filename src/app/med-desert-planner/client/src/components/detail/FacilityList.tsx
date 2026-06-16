import { useMemo } from 'react';
import type { EvidenceRow } from '../../types';
import { groupEvidence } from '../../lib/group';
import { EmptyState, Skeleton } from '../common/States';
import { FacilityCard } from './FacilityCard';

type ReviewStatus = 'verified' | 'unclear' | 'disputed';

export function FacilityList({
  evidence,
  loading,
  pingedFacility,
  onShortlist,
  onReview,
}: {
  evidence: EvidenceRow[];
  loading: boolean;
  pingedFacility: string | null;
  onShortlist: (facilityId: string) => void;
  onReview: (claim: EvidenceRow, status: ReviewStatus) => Promise<void> | void;
}) {
  const facilities = useMemo(() => groupEvidence(evidence), [evidence]);

  if (loading && facilities.length === 0) {
    return (
      <div className="space-y-2">
        {['a', 'b', 'c', 'd'].map((k) => (
          <Skeleton key={k} className="h-[52px] w-full rounded-[var(--radius)]" />
        ))}
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <EmptyState
        title="No cited facility records"
        hint="No facilities documented this capability in this district. That is a data gap, not proof of absence."
      />
    );
  }

  return (
    <div className="space-y-2">
      {facilities.map((f) => (
        <FacilityCard
          key={f.facility_id}
          facility={f}
          pinged={pingedFacility === f.facility_id}
          onShortlist={onShortlist}
          onReview={onReview}
        />
      ))}
    </div>
  );
}
