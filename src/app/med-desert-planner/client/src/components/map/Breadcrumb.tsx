import { ChevronRight } from 'lucide-react';
import type { ViewState } from '../../types';
import { cn } from '../../lib/utils';

export function Breadcrumb({
  view,
  onNational,
  onState,
}: {
  view: ViewState;
  onNational: () => void;
  onState: () => void;
}) {
  const crumb = (label: string, active: boolean, onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'rounded px-0.5 text-[8.5px] transition-colors',
        active ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
        !onClick && 'cursor-default',
      )}
    >
      {label}
    </button>
  );

  return (
    <nav className="flex items-center gap-0.5" aria-label="Map location">
      {crumb('India', view.level === 'national', view.level === 'national' ? undefined : onNational)}
      {view.state && (
        <>
          <ChevronRight className="size-2.5 text-line-strong" />
          {crumb(view.state, view.level === 'state', view.level === 'state' ? undefined : onState)}
        </>
      )}
      {view.district && (
        <>
          <ChevronRight className="size-2.5 text-line-strong" />
          {crumb(view.district, true)}
        </>
      )}
    </nav>
  );
}
