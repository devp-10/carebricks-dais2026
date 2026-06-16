import { cn } from '../lib/utils';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DOT: Record<SaveState, string> = {
  idle: 'bg-faint',
  saving: 'bg-warn',
  saved: 'bg-ok',
  error: 'bg-bad',
};

export function AppBar({ saveState, saveMessage }: { saveState: SaveState; saveMessage: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface-2 px-6 py-3.5">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-[21px] font-extrabold leading-none text-accent">CareBricks</h1>
        <span className="hidden text-[12px] text-muted sm:inline">
          Medical Desert Planner · Virtue Foundation · India facility evidence
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
        <span className={cn('size-2 rounded-full', DOT[saveState])} />
        <span className="text-[12px] text-muted">{saveMessage || 'No scenario saved'}</span>
      </div>
    </header>
  );
}
