import { useState } from 'react';
import { Check, CircleHelp, X } from 'lucide-react';
import type { EvidenceRow } from '../../types';
import { trustTier, TRUST_HEX, TRUST_COPY } from '../../lib/labels';
import { cn } from '../../lib/utils';

type ReviewStatus = 'verified' | 'unclear' | 'disputed';

export function ClaimEvidence({
  claim,
  onReview,
}: {
  claim: EvidenceRow;
  onReview: (claim: EvidenceRow, status: ReviewStatus) => Promise<void> | void;
}) {
  const tier = trustTier(claim.source_field);
  const [marked, setMarked] = useState<ReviewStatus | null>(null);

  const review = async (status: ReviewStatus) => {
    setMarked(status);
    try {
      await onReview(claim, status);
    } catch {
      setMarked(null);
    }
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface-2 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="size-2 rounded-full ring-1 ring-white"
          style={{ background: TRUST_HEX[tier] }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TRUST_HEX[tier] }}>
          {TRUST_COPY[tier]}
        </span>
        <span className="mono rounded bg-bg-sunken px-1.5 py-0.5 text-[10px] text-muted">
          {claim.source_field}
        </span>
      </div>

      {/* verbatim — never paraphrased */}
      <blockquote className="border-l-2 border-accent/40 pl-2.5 text-[12.5px] leading-relaxed text-ink">
        {claim.claim_text}
      </blockquote>

      <div className="mt-2.5 flex items-center gap-1.5">
        <ReviewBtn label="Verified" icon={<Check className="size-3.5" />} active={marked === 'verified'} tone="#2e8b6f" onClick={() => void review('verified')} />
        <ReviewBtn label="Unclear" icon={<CircleHelp className="size-3.5" />} active={marked === 'unclear'} tone="#c98a2e" onClick={() => void review('unclear')} />
        <ReviewBtn label="Disputed" icon={<X className="size-3.5" />} active={marked === 'disputed'} tone="#b23b3b" onClick={() => void review('disputed')} />
      </div>
    </div>
  );
}

function ReviewBtn({
  label,
  icon,
  active,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 text-[11px] font-medium transition-colors',
        active ? 'text-white' : 'border-line text-muted hover:text-ink',
      )}
      style={active ? { background: tone, borderColor: tone } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
