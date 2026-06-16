import { Save, X, Clock } from 'lucide-react';
import type { DistrictScore, ScenarioRow } from '../../types';
import { districtKey } from '../../types';
import type { SaveState } from '../AppBar';
import { riskHex, isDataPoor } from '../../lib/labels';
import { displaySpecialty } from '../../lib/format';
import { cn } from '../../lib/utils';

export function ScenarioDrawer({
  open,
  onClose,
  name,
  onName,
  notes,
  onNotes,
  flaggedRows,
  onUnflag,
  onSave,
  onClear,
  saveState,
  activeScenarioId,
  scenarios,
  onLoadScenario,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  onName: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  flaggedRows: DistrictScore[];
  onUnflag: (key: string) => void;
  onSave: () => void;
  onClear: () => void;
  saveState: SaveState;
  activeScenarioId: string;
  scenarios: ScenarioRow[];
  onLoadScenario: (s: ScenarioRow) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close scenario"
        onClick={onClose}
        className="absolute inset-0 bg-ink/20 backdrop-blur-[1px]"
      />
      <aside className="animate-rise relative flex h-full w-[min(420px,92vw)] flex-col border-l border-line bg-bg shadow-[var(--shadow-pop)]">
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Planning scenario</h2>
            <p className="text-[11px] text-muted">Flag districts, add notes, save the trail</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-[var(--radius-sm)] border border-line text-muted hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
              Scenario name
            </label>
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3 text-[13px] outline-none focus:border-accent"
            />
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
              Flagged districts ({flaggedRows.length})
            </p>
            {flaggedRows.length === 0 ? (
              <p className="rounded-[var(--radius-sm)] border border-dashed border-line px-3 py-3 text-[12px] italic text-faint">
                No districts flagged yet. Use the flag icon on a district.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {flaggedRows.map((r) => {
                  const key = districtKey(r.state, r.district_name, r.specialty);
                  const dp = isDataPoor(r.confidence_label, r.verdict_label);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-2 pr-1 text-[12px]"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ background: dp ? '#9aa1ab' : riskHex(r.gap_score) }}
                      />
                      {r.district_name}
                      <button
                        type="button"
                        onClick={() => onUnflag(key)}
                        className="grid size-4 place-items-center rounded-full text-faint hover:bg-bg hover:text-ink"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
              Planner notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
              placeholder="What should the field team verify next?"
              className="min-h-[96px] w-full resize-y rounded-[var(--radius-sm)] border border-line-strong bg-surface p-3 text-[13px] leading-relaxed outline-none focus:border-accent"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saveState === 'saving'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-accent-ink disabled:opacity-60"
            >
              <Save className="size-4" />
              {saveState === 'saving' ? 'Saving…' : 'Save scenario'}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-[var(--radius-sm)] border border-line px-3 py-2.5 text-[13px] text-muted hover:text-ink"
            >
              Clear
            </button>
          </div>
          {activeScenarioId && (
            <p className="text-[11px] text-muted">Active scenario — flagged districts and claim reviews attach here.</p>
          )}

          {scenarios.length > 0 && (
            <div className="border-t border-line pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">Recent scenarios</p>
              <div className="space-y-1.5">
                {scenarios.slice(0, 6).map((s) => (
                  <button
                    key={s.scenario_id}
                    type="button"
                    onClick={() => onLoadScenario(s)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left',
                      s.scenario_id === activeScenarioId
                        ? 'border-accent bg-accent-soft'
                        : 'border-line bg-surface hover:bg-bg'
                    )}
                  >
                    <Clock className="size-3.5 shrink-0 text-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{s.name}</span>
                      <span className="block truncate text-[10.5px] text-muted">{displaySpecialty(s.specialty)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
