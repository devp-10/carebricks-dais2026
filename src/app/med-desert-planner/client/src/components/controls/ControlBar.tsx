import type { SpecialtyRow, StateRow } from '../../types';
import { CapabilitySelect } from './CapabilitySelect';
import { RegionSelect } from './RegionSelect';

export function ControlBar({
  specialties,
  specialtiesLoading,
  specialty,
  onSpecialty,
  states,
  region,
  onRegion,
}: {
  specialties: SpecialtyRow[];
  specialtiesLoading: boolean;
  specialty: string;
  onSpecialty: (s: string) => void;
  states: StateRow[];
  region: string;
  onRegion: (s: string) => void;
}) {
  return (
    <div
      aria-label="Planner filters"
      className="flex flex-wrap items-end gap-x-3 gap-y-2 border-b border-line bg-surface-2 px-4 py-2"
    >
      <CapabilitySelect
        rows={specialties}
        value={specialty}
        onChange={onSpecialty}
        loading={specialtiesLoading}
      />
      <RegionSelect rows={states} value={region} onChange={onRegion} />
    </div>
  );
}
