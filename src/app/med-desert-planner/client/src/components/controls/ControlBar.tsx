import type { SpecialtyRow, StateRow } from '../../types';
import { CapabilitySelect } from './CapabilitySelect';
import { ProblemInput } from './ProblemInput';
import { RegionSelect } from './RegionSelect';

export function ControlBar({
  specialties,
  specialtiesLoading,
  specialty,
  onSpecialty,
  problemQuery,
  onProblemQuery,
  onGenieResult,
  states,
  region,
  onRegion,
}: {
  specialties: SpecialtyRow[];
  specialtiesLoading: boolean;
  specialty: string[];
  onSpecialty: (s: string[]) => void;
  problemQuery: string;
  onProblemQuery: (q: string) => void;
  onGenieResult: (specialties: string[]) => number;
  states: StateRow[];
  region: string;
  onRegion: (s: string) => void;
}) {
  return (
    <div
      aria-label="Planner filters"
      className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-6 py-3"
    >
      <CapabilitySelect rows={specialties} value={specialty} onChange={onSpecialty} loading={specialtiesLoading} />
      <RegionSelect rows={states} value={region} onChange={onRegion} />
      <ProblemInput
        value={problemQuery}
        onChange={onProblemQuery}
        onGenieResult={onGenieResult}
        disabled={specialtiesLoading}
      />
    </div>
  );
}
