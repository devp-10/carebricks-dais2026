import type { EvidenceRow } from '../../types';
import { trustTier, TRUST_HEX, TRUST_COPY } from '../../lib/labels';

type ReviewStatus = 'verified' | 'unclear' | 'disputed';

export function ClaimEvidence(props: {
  claim: EvidenceRow;
  onReview: (claim: EvidenceRow, status: ReviewStatus) => Promise<void> | void;
}) {
  const { claim } = props;
  const tier = trustTier(claim.source_field);

  return (
    <div className="rounded-[var(--radius-sm)] border border-line bg-surface p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="size-2 rounded-full ring-1 ring-white" style={{ background: TRUST_HEX[tier] }} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TRUST_HEX[tier] }}>
          {TRUST_COPY[tier]}
        </span>
        <span className="mono rounded bg-bg-sunken px-1.5 py-0.5 text-[10px] text-muted">{claim.source_field}</span>
      </div>

      {/* verbatim — never paraphrased */}
      <blockquote className="border-l-2 border-accent/40 pl-2.5 text-[12.5px] leading-relaxed text-ink">
        {claim.claim_text}
      </blockquote>
    </div>
  );
}
