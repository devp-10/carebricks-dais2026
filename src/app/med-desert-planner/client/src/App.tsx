import { useCallback, useMemo, useRef, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import type { DistrictScore, EvidenceRow, ScenarioRow, ViewState } from './types';
import { districtKey } from './types';
import { useReferenceData, useDistrictScores, useDistrictDetail } from './hooks/usePlannerData';
import { useGeoData } from './hooks/useGeoData';
import { saveScenario, shortlistFacility, reviewClaim } from './api/persistence';
import { AppBar, type SaveState } from './components/AppBar';
import { ControlBar } from './components/controls/ControlBar';
import { InsightRail } from './components/rail/InsightRail';
import { MapPanel } from './components/map/MapPanel';
import { DistrictDetail } from './components/detail/DistrictDetail';
import { ScenarioDrawer } from './components/scenario/ScenarioDrawer';

type ReviewStatus = 'verified' | 'unclear' | 'disputed';

export default function App() {
  const { specialties, states, scenarios, specialtiesLoading } = useReferenceData();

  const [specialty, setSpecialty] = useState('');
  const [region, setRegion] = useState('');
  const verdict = 'All verdicts';
  const [view, setView] = useState<ViewState>({ level: 'national', state: null, district: null });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pingedFacility, setPingedFacility] = useState<string | null>(null);

  const [flaggedRows, setFlaggedRows] = useState<Map<string, DistrictScore>>(new Map());
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('Priority outreach plan');
  const [scenarioNotes, setScenarioNotes] = useState('');
  const [activeScenarioId, setActiveScenarioId] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const effectiveSpecialty = specialty || 'All capabilities';

  const { rows, loading: scoresLoading, error: scoresError } = useDistrictScores({
    specialty: effectiveSpecialty,
    state: region,
    verdict,
  });

  const selectedRow = useMemo(
    () => rows.find((r) => districtKey(r.state, r.district_name, r.specialty) === selectedKey) ?? null,
    [rows, selectedKey],
  );

  const detail = useDistrictDetail({
    specialty: selectedRow?.specialty ?? (specialty || ''),
    state: selectedRow?.state ?? '',
    district: selectedRow?.district_name ?? '',
  });

  const { states: statesGeo, districts: districtsGeo, loadDistricts } = useGeoData();

  /* ---------- navigation ---------- */
  const goNational = useCallback(() => {
    setRegion('');
    setSelectedKey(null);
    setView({ level: 'national', state: null, district: null });
    void loadDistricts(null);
  }, [loadDistricts]);

  const goState = useCallback(
    (dataState: string) => {
      setRegion(dataState);
      setSelectedKey(null);
      setView({ level: 'state', state: dataState, district: null });
      void loadDistricts(dataState);
    },
    [loadDistricts],
  );

  const selectDistrict = useCallback(
    (row: DistrictScore) => {
      if (region !== row.state) {
        setRegion(row.state);
        void loadDistricts(row.state);
      }
      setSelectedKey(districtKey(row.state, row.district_name, row.specialty));
      setView({ level: 'district', state: row.state, district: row.district_name });
    },
    [region, loadDistricts],
  );

  const closeDetail = useCallback(() => {
    setSelectedKey(null);
    setView((v) => ({ level: v.state ? 'state' : 'national', state: v.state, district: null }));
  }, []);

  const pingTimer = useRef<number | null>(null);
  const pingFacility = useCallback((facilityId: string) => {
    setPingedFacility(facilityId);
    if (pingTimer.current) window.clearTimeout(pingTimer.current);
    pingTimer.current = window.setTimeout(() => setPingedFacility(null), 1800);
  }, []);

  /* ---------- flagging ---------- */
  const toggleFlag = useCallback((row: DistrictScore) => {
    const key = districtKey(row.state, row.district_name, row.specialty);
    setFlaggedRows((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, row);
      return next;
    });
  }, []);
  const unflag = useCallback((key: string) => {
    setFlaggedRows((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  /* ---------- persistence ---------- */
  const flash = (state: SaveState, message: string) => {
    setSaveState(state);
    setSaveMessage(message);
  };

  const handleSave = useCallback(async () => {
    if (!effectiveSpecialty) return;
    flash('saving', 'Saving scenario…');
    try {
      const res = await saveScenario({
        name: scenarioName,
        specialty: effectiveSpecialty,
        notes: scenarioNotes,
        geoFilter: { region, verdict, flagged: [...flaggedRows.keys()] },
      });
      setActiveScenarioId(res.scenario_id);
      flash('saved', 'Scenario saved');
    } catch (e) {
      flash('error', e instanceof Error ? e.message : 'Save failed');
    }
  }, [effectiveSpecialty, scenarioName, scenarioNotes, region, verdict, flaggedRows]);

  const handleShortlist = useCallback(
    async (facilityId: string) => {
      if (!activeScenarioId) {
        setScenarioOpen(true);
        flash('error', 'Save a scenario before shortlisting');
        return;
      }
      flash('saving', 'Adding to shortlist…');
      try {
        await shortlistFacility({
          scenario_id: activeScenarioId,
          facility_id: facilityId,
          note: `Shortlisted from ${selectedRow?.district_name ?? 'district'} review`,
        });
        flash('saved', 'Facility shortlisted');
      } catch (e) {
        flash('error', e instanceof Error ? e.message : 'Shortlist failed');
      }
    },
    [activeScenarioId, selectedRow],
  );

  const handleReview = useCallback(
    async (claim: EvidenceRow, status: ReviewStatus) => {
      if (!activeScenarioId) {
        setScenarioOpen(true);
        flash('error', 'Save a scenario before reviewing claims');
        throw new Error('no scenario');
      }
      flash('saving', 'Saving review…');
      try {
        await reviewClaim({
          scenario_id: activeScenarioId,
          claim_id: claim.claim_id,
          facility_id: claim.facility_id,
          review_status: status,
          note: `Marked ${status} in evidence drawer`,
        });
        flash('saved', `Claim marked ${status}`);
      } catch (e) {
        flash('error', e instanceof Error ? e.message : 'Review failed');
        throw e;
      }
    },
    [activeScenarioId],
  );

  const loadScenario = useCallback((s: ScenarioRow) => {
    setActiveScenarioId(s.scenario_id);
    setScenarioName(s.name);
    setScenarioNotes(s.notes ?? '');
    if (s.specialty) setSpecialty(s.specialty === 'All capabilities' ? '' : s.specialty);
    flash('saved', `Loaded "${s.name}"`);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppBar saveState={saveState} saveMessage={saveMessage} />
      <ControlBar
        specialties={specialties}
        specialtiesLoading={specialtiesLoading}
        specialty={specialty}
        onSpecialty={setSpecialty}
        states={states}
        region={region}
        onRegion={(s) => (s ? goState(s) : goNational())}
      />

      <main className="min-h-0 flex-1">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={42} minSize={28} maxSize={58} className="min-h-0 overflow-hidden">
            <section aria-label="Coverage map" className="relative h-full min-h-0 overflow-hidden">
              <MapPanel
                view={view}
                states={states}
                rows={rows}
                evidence={detail.evidence}
                statesGeo={statesGeo}
                districtsGeo={districtsGeo}
                onSelectState={goState}
                onSelectDistrict={selectDistrict}
                onNational={goNational}
                onBackToState={() => setView((v) => ({ ...v, level: 'state', district: null }))}
                onPingFacility={pingFacility}
              />
            </section>
          </Panel>

          <PanelResizeHandle className="group relative w-2 shrink-0 border-x border-line bg-surface-2 outline-none transition-colors hover:bg-accent-soft focus-visible:bg-accent-soft">
            <span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong transition-colors group-hover:bg-accent" />
          </PanelResizeHandle>

          <Panel defaultSize={58} minSize={42} className="min-h-0 overflow-hidden">
            <section aria-label="District ranking" className="h-full min-h-0 overflow-hidden">
              {selectedRow ? (
                <DistrictDetail
                  row={selectedRow}
                  demand={detail.demand}
                  evidence={detail.evidence}
                  loading={detail.loading}
                  error={detail.error}
                  flagged={flaggedRows.has(selectedKey ?? '')}
                  pingedFacility={pingedFacility}
                  onClose={closeDetail}
                  onToggleFlag={() => toggleFlag(selectedRow)}
                  onShortlist={(id) => void handleShortlist(id)}
                  onReview={handleReview}
                />
              ) : (
                <InsightRail
                  rows={rows}
                  loading={scoresLoading}
                  error={scoresError ? String(scoresError) : null}
                  selectedKey={selectedKey}
                  flagged={new Set(flaggedRows.keys())}
                  onSelect={selectDistrict}
                  onToggleFlag={toggleFlag}
                />
              )}
            </section>
          </Panel>
        </PanelGroup>
      </main>

      {/* scenario launcher */}
      <button
        type="button"
        onClick={() => setScenarioOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink shadow-[var(--shadow-pop)] hover:border-accent"
      >
        <ClipboardList className="size-4 text-accent" />
        Scenario
        {flaggedRows.size > 0 && (
          <span className="mono grid size-5 place-items-center rounded-full bg-accent text-[11px] text-white">
            {flaggedRows.size}
          </span>
        )}
      </button>

      <ScenarioDrawer
        open={scenarioOpen}
        onClose={() => setScenarioOpen(false)}
        name={scenarioName}
        onName={setScenarioName}
        notes={scenarioNotes}
        onNotes={setScenarioNotes}
        flaggedRows={[...flaggedRows.values()]}
        onUnflag={unflag}
        onSave={() => void handleSave()}
        onClear={() => {
          setFlaggedRows(new Map());
          setScenarioNotes('');
        }}
        saveState={saveState}
        activeScenarioId={activeScenarioId}
        scenarios={scenarios}
        onLoadScenario={loadScenario}
      />
    </div>
  );
}
