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
    <header className="flex items-center justify-between gap-4 border-b border-line bg-surface/80 px-5 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <img src="/assets/carebricks-logo.png" alt="" className="size-7 shrink-0" />
        <h1
          className="text-[22px] font-black leading-none text-accent"
          style={{ fontFamily: '"Avenir Next", "Trebuchet MS", ui-sans-serif, system-ui, sans-serif' }}
        >
          CareBricks
        </h1>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5">
        <span className={cn('size-2 rounded-full', DOT[saveState])} />
        <span className="text-[12px] text-muted">{saveMessage || 'No scenario saved'}</span>
      </div>
    </header>
  );
}
