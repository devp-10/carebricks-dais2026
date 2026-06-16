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
  value: string;
  onChange: (specialty: string) => void;
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

  const current = rows.find((r) => r.specialty === value);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        displaySpecialty(r.specialty, r.display_name).toLowerCase().includes(needle) ||
        r.specialty.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  return (
    <div className="relative" ref={wrapRef}>
      <FieldLabel>Capability</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-full min-w-[160px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2 text-left text-[10px] hover:border-faint"
      >
        <Stethoscope className="size-3 shrink-0 text-accent" />
        <span className="truncate font-medium text-ink">
          {loading
            ? 'Loading…'
            : current
              ? displaySpecialty(current.specialty, current.display_name)
              : 'All Capabilities'}
        </span>
        <ChevronDown className="ml-auto size-3 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-[min(320px,90vw)] overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-1.5 border-b border-line px-2 py-1">
            <Search className="size-3 text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search capabilities"
              className="w-full bg-transparent text-[10px] outline-none placeholder:text-faint"
            />
          </div>
          <ul className="max-h-[240px] overflow-auto py-0.5">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setQ('');
                }}
                className={cn(
                  'flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] hover:bg-bg',
                  value === '' && 'bg-accent-soft',
                )}
              >
                <Check
                  className={cn('size-3 shrink-0', value === '' ? 'text-accent' : 'text-transparent')}
                />
                <span className="truncate text-ink">All Capabilities</span>
              </button>
            </li>
            {filtered.map((r) => (
              <li key={r.specialty}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r.specialty);
                    setOpen(false);
                    setQ('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-1.5 px-2 py-1 text-left text-[10px] hover:bg-bg',
                    r.specialty === value && 'bg-accent-soft',
                  )}
                >
                  <Check
                    className={cn(
                      'size-3 shrink-0',
                      r.specialty === value ? 'text-accent' : 'text-transparent',
                    )}
                  />
                  <span className="truncate text-ink">
                    {displaySpecialty(r.specialty, r.display_name)}
                  </span>
                  <span className="mono ml-auto shrink-0 text-[9.5px] text-faint">
                    {compactNumber(r.facility_count)}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-[10px] text-muted">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-0.5 block text-[8px] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </span>
  );
}
