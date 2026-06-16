import { useMemo } from 'react';
import { AlertTriangle, HelpCircle, Layers, Activity } from 'lucide-react';
import type { DistrictScore } from '../../types';
import { numberValue, pct } from '../../lib/format';

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

export function KpiStrip({ rows }: { rows: DistrictScore[] }) {
  const stats = useMemo(() => {
    const count = (v: string) => rows.filter((r) => r.verdict_label === v).length;
    const supplyRates = rows
      .map((r) => numberValue(r.documented_supply_rate))
      .filter((v): v is number => v !== null);
    const avgSupply = supplyRates.length
      ? supplyRates.reduce((s, v) => s + v, 0) / supplyRates.length
      : null;
    return {
      realGaps: count('likely_real_gap'),
      dataPoor: count('data_poor_high_need'),
      inView: rows.length,
      avgSupply,
    };
  }, [rows]);

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Kpi
        icon={<AlertTriangle className="size-[18px]" />}
        value={String(stats.realGaps)}
        label="Likely real gaps"
        tone="#b23b3b"
      />
      <Kpi
        icon={<HelpCircle className="size-[18px]" />}
        value={String(stats.dataPoor)}
        label="Data-poor high need"
        tone="#c98a2e"
      />
      <Kpi
        icon={<Layers className="size-[18px]" />}
        value={String(stats.inView)}
        label="Districts in view"
        tone="#2f6bff"
      />
      <Kpi
        icon={<Activity className="size-[18px]" />}
        value={pct(stats.avgSupply)}
        label="Avg documented supply"
        tone="#2e8b6f"
      />
    </div>
  );
}
