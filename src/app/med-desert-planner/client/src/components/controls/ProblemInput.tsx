import { useState } from 'react';
import { AlertCircle, Loader2, Search, Sparkles } from 'lucide-react';
import { mapProblemToCapabilities } from '../../api/persistence';
import { cn } from '../../lib/utils';
import { FieldLabel } from './CapabilitySelect';

export function ProblemInput({
  value,
  onChange,
  onGenieResult,
  disabled,
}: {
  value: string;
  onChange: (query: string) => void;
  onGenieResult: (specialties: string[]) => number;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; copy: string } | null>(null);

  const handleSearch = async () => {
    const problem = value.trim();
    if (!problem || loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const data = await mapProblemToCapabilities(problem);
      if (!data.specialties.length) {
        setMessage({ type: 'error', copy: 'No matching capabilities returned' });
        return;
      }

      const appliedCount = onGenieResult(data.specialties);
      if (appliedCount === 0) {
        setMessage({ type: 'error', copy: 'Genie returned capabilities outside this planner vocabulary' });
        return;
      }
      onChange('');
      setMessage({
        type: 'success',
        copy: appliedCount === 1 ? 'Applied 1 capability' : `Applied ${appliedCount} matches`,
      });
    } catch (err) {
      setMessage({ type: 'error', copy: err instanceof Error ? err.message : 'Genie query failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSearch();
    }
  };

  return (
    <div className="relative min-w-[280px] flex-1 lg:max-w-[520px]">
      <FieldLabel>AI filter assistant</FieldLabel>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              if (message) setMessage(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe a care gap to auto-apply capabilities"
            disabled={disabled || loading}
            aria-label="AI filter assistant"
            className={cn(
              'h-8 w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2.5 pl-8 text-[12px] font-medium text-ink shadow-[0_1px_0_rgba(28,26,22,0.03)] outline-none transition-colors placeholder:text-faint hover:border-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-60',
              message?.type === 'error' && 'border-bad'
            )}
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="size-3 animate-spin text-accent" />
            ) : message?.type === 'error' ? (
              <AlertCircle className="size-3 text-bad" />
            ) : (
              <Sparkles className="size-3 text-accent" />
            )}
          </span>
        </div>
        <div className="relative shrink-0">
          {message && (
            <p
              className={cn(
                'absolute bottom-[calc(100%+5px)] right-0 z-20 whitespace-nowrap text-[11px] font-medium',
                message.type === 'error' ? 'text-bad' : 'text-accent'
              )}
            >
              {message.copy}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={!value.trim() || loading || disabled}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-accent bg-accent px-3 text-[12px] font-semibold text-white shadow-[0_1px_0_rgba(28,26,22,0.08)] transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-50"
            title="Use AI to apply matching capability filters"
          >
            {loading ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
