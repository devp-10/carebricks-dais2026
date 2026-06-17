export function AppBar() {
  return (
    <header className="flex items-center gap-4 border-b border-line bg-surface-2 px-6 py-3.5">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-[21px] font-extrabold leading-none text-accent">CareBricks</h1>
        <span className="hidden text-[12px] text-muted sm:inline">
          Medical Desert Planner · Virtue Foundation · India facility evidence
        </span>
      </div>
    </header>
  );
}
