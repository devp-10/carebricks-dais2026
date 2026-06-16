import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Users, Activity } from 'lucide-react';
import type { DistrictScore } from '../../types';
import { numberValue, pct, score } from '../../lib/format';

function Kpi({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)]" style={{ background: `${tone}14`, color: tone }}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="mono text-[20px] font-semibold leading-none text-ink">{value}</div>
        <div className="mt-1 text-[10.5px] leading-tight text-muted">{label}</div>
      </div>
    </div>
  );
}

function avg(vals: number[]): number | null {
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

export function KpiStrip({ rows }: { rows: DistrictScore[] }) {
  const stats = useMemo(() => {
    const confirmedGaps = rows.filter((r) => r.verdict_label === 'likely_real_gap').length;

    const gapScores = rows.map((r) => numberValue(r.gap_score)).filter((v): v is number => v !== null);
    const demandScores = rows.map((r) => numberValue(r.demand_score)).filter((v): v is number => v !== null);
    const supplyRates = rows.map((r) => numberValue(r.documented_supply_rate)).filter((v): v is number => v !== null);

    return {
      confirmedGaps,
      avgGap: avg(gapScores),
      avgDemand: avg(demandScores),
      avgSupply: avg(supplyRates),
    };
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Kpi
        icon={<AlertTriangle className="size-[18px]" />}
        value={String(stats.confirmedGaps)}
        label="Confirmed gaps"
        tone="#b23b3b"
      />
      <Kpi
        icon={<TrendingUp className="size-[18px]" />}
        value={score(stats.avgGap)}
        label="Avg. gap score"
        tone="#d96b3d"
      />
      <Kpi
        icon={<Users className="size-[18px]" />}
        value={score(stats.avgDemand)}
        label="Avg. demand score"
        tone="#2f6bff"
      />
      <Kpi
        icon={<Activity className="size-[18px]" />}
        value={pct(stats.avgSupply)}
        label="Avg. supply rate"
        tone="#2e8b6f"
      />
    </div>
  );
}
