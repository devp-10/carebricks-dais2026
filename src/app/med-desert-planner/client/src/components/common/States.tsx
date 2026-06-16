import { cn } from '../../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-line/70', className)} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-[36ch] text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-[var(--radius-sm)] border border-bad/30 bg-bad/[0.06] px-4 py-3">
      <p className="text-sm font-medium text-bad">Something went wrong</p>
      <p className="mt-0.5 break-words text-xs text-muted">{message}</p>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span className="size-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-accent" />
      {label}
    </span>
  );
}
