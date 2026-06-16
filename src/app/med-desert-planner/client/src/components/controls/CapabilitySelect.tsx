import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Stethoscope } from 'lucide-react';
import type { SpecialtyRow } from '../../types';
import { displaySpecialty, compactNumber } from '../../lib/format';
import { cn } from '../../lib/utils';

export function CapabilitySelect({
  rows,
  value,
  onChange,
  loading,
}: {
  rows: SpecialtyRow[];
  value: string[];
  onChange: (specialty: string[]) => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        displaySpecialty(r.specialty, r.display_name).toLowerCase().includes(needle) ||
        r.specialty.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const displayText = useMemo(() => {
    if (loading) return 'Loading…';
    if (value.length === 0) return 'All Capabilities';
    if (value.length === 1) {
      const current = rows.find((r) => r.specialty === value[0]);
      return current ? displaySpecialty(current.specialty, current.display_name) : value[0];
    }
    return `${value.length} capabilities`;
  }, [loading, rows, value]);

  const toggleSpecialty = (specialty: string) => {
    onChange(value.includes(specialty) ? value.filter((item) => item !== specialty) : [...value, specialty]);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <FieldLabel>Capability</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full min-w-[170px] items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2.5 text-left text-[12px] shadow-[0_1px_0_rgba(28,26,22,0.03)] hover:border-accent"
      >
        <Stethoscope className="size-3 shrink-0 text-accent" />
        <span className="truncate font-medium text-ink">{displayText}</span>
        <ChevronDown className="ml-auto size-3 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(320px,90vw)] overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2">
            <Search className="size-3 text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search capabilities"
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-faint"
            />
          </div>
          <ul className="max-h-[240px] overflow-auto py-0.5">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setQ('');
                }}
                className={cn(
                  'flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[12px] hover:bg-bg',
                  value.length === 0 && 'bg-accent-soft'
                )}
              >
                <span
                  className={cn(
                    'grid size-3.5 shrink-0 place-items-center rounded-[3px] border',
                    value.length === 0 ? 'border-accent bg-accent' : 'border-line-strong bg-surface'
                  )}
                >
                  {value.length === 0 && <Check className="size-2.5 text-white" />}
                </span>
                <span className="truncate text-ink">All Capabilities</span>
              </button>
            </li>
            {filtered.map((r) => {
              const selected = value.includes(r.specialty);
              return (
                <li key={r.specialty}>
                  <button
                    type="button"
                    onClick={() => toggleSpecialty(r.specialty)}
                    className={cn(
                      'flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-[12px] hover:bg-bg',
                      selected && 'bg-accent-soft'
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-3.5 shrink-0 place-items-center rounded-[3px] border',
                        selected ? 'border-accent bg-accent' : 'border-line-strong bg-surface'
                      )}
                    >
                      {selected && <Check className="size-2.5 text-white" />}
                    </span>
                    <span className="truncate text-ink">{displaySpecialty(r.specialty, r.display_name)}</span>
                    <span className="mono ml-auto shrink-0 text-[9.5px] text-faint">
                      {compactNumber(r.facility_count)}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-3 py-3 text-center text-[12px] text-muted">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</span>
  );
}
