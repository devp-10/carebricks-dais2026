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
      className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-line bg-surface-2 px-6 py-3"
    >
      <CapabilitySelect rows={specialties} value={specialty} onChange={onSpecialty} loading={specialtiesLoading} />
      <RegionSelect rows={states} value={region} onChange={onRegion} />
      <div className="ml-auto hidden pb-1 text-[12px] text-muted lg:block">
        Burden: <span className="font-medium text-ink">NFHS-5 (2019-21)</span> · supply:{' '}
        <span className="font-medium text-ink">facility records</span>
      </div>
    </div>
  );
}
