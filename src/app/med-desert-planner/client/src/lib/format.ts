export function numberValue(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function pct(v: number | string | null | undefined): string {
  const n = numberValue(v);
  if (n === null) return '—';
  return `${Math.round(n * 100)}%`;
}

export function score(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return Math.round(v).toString();
}

export function displaySpecialty(machine: string, displayName?: string): string {
  if (displayName && displayName.trim()) return displayName.trim();
  return machine
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, '&');
}

export function compactNumber(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}
