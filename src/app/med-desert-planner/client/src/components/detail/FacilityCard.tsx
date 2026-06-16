import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { EvidenceRow } from '../../types';
import type { FacilityEvidence } from '../../lib/group';
import { cn } from '../../lib/utils';
import { ClaimEvidence } from './ClaimEvidence';

type ReviewStatus = 'verified' | 'unclear' | 'disputed';

export function FacilityCard({
  facility,
  pinged,
  onReview,
}: {
  facility: FacilityEvidence;
  pinged: boolean;
  onReview: (claim: EvidenceRow, status: ReviewStatus) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const meta = [facility.facility_type, facility.city, facility.pin_code].filter(Boolean).join(' · ');

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius)] border bg-surface shadow-[0_1px_0_rgba(28,26,22,0.03)] transition-shadow',
        pinged ? 'border-accent shadow-[0_0_0_2px_var(--color-accent-soft)]' : 'border-line'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronRight className={cn('size-4 shrink-0 text-faint transition-transform', open && 'rotate-90')} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-ink">{facility.facility_name}</span>
            {meta && <span className="block truncate text-[11px] text-muted">{meta}</span>}
          </span>
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-line bg-surface-2 p-3">
          {facility.claims.map((claim) => (
            <ClaimEvidence key={claim.claim_id} claim={claim} onReview={onReview} />
          ))}
        </div>
      )}
    </div>
  );
}
