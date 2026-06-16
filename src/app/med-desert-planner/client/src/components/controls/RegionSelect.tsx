import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import type { StateRow } from '../../types';
import { FieldLabel } from './CapabilitySelect';
import { cn } from '../../lib/utils';

export function RegionSelect({
  rows,
  value,
  onChange,
}: {
  rows: StateRow[];
  /** '' = All — India */
  value: string;
  onChange: (state: string) => void;
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

  const options = useMemo(
    () => rows.filter((r) => r.state && r.state !== 'Unresolved').map((r) => r.state),
    [rows],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((state) => state.toLowerCase().includes(needle));
  }, [options, q]);

  const select = (state: string) => {
    onChange(state);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="relative" ref={wrapRef}>
      <FieldLabel>Region</FieldLabel>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full min-w-[160px] items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2.5 text-left text-[11px] hover:border-faint"
      >
        <MapPin className="size-3.5 shrink-0 text-accent" />
        <span className="truncate font-medium text-ink">{value || 'All India'}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(300px,88vw)] overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-2 border-b border-line px-2.5 py-1.5">
            <Search className="size-3.5 text-faint" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search regions"
              className="w-full bg-transparent text-[11px] outline-none placeholder:text-faint"
            />
          </div>
          <ul className="max-h-[280px] overflow-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => select('')}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-bg',
                  value === '' && 'bg-accent-soft',
                )}
              >
                <Check
                  className={cn('size-3.5 shrink-0', value === '' ? 'text-accent' : 'text-transparent')}
                />
                <span className="truncate text-ink">All India</span>
              </button>
            </li>
            {filtered.map((state) => (
              <li key={state}>
                <button
                  type="button"
                  onClick={() => select(state)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-bg',
                    state === value && 'bg-accent-soft',
                  )}
                >
                  <Check
                    className={cn('size-3.5 shrink-0', state === value ? 'text-accent' : 'text-transparent')}
                  />
                  <span className="truncate text-ink">{state}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted">No matches</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
