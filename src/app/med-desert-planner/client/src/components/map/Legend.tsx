import { DATA_POOR_HEX, NO_DATA_HEX, RISK_STOPS } from '../../lib/labels';

export function Legend() {
  const riskGradient = `linear-gradient(90deg,${RISK_STOPS.map(([, hex]) => hex).join(',')})`;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-x-7 gap-y-3 rounded-[var(--radius)] border border-line bg-surface/92 px-3.5 py-2.5 shadow-[var(--shadow-card)] backdrop-blur-sm">
      <div className="min-w-[240px]">
        <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-muted">District gap risk</p>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <span className="text-[10px] text-faint">low</span>
          <span className="h-2.5 min-w-32 rounded-full" style={{ background: riskGradient }} />
          <span className="text-[10px] text-faint">high</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pb-0.5 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-[3px] border border-line-strong hatch"
            style={{ backgroundColor: DATA_POOR_HEX }}
          />
          Data poor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-line-strong" style={{ backgroundColor: NO_DATA_HEX }} />
          No data
        </span>
      </div>
    </div>
  );
}
