async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof payload.details === 'string'
        ? payload.details
        : typeof payload.error === 'string'
          ? payload.error
          : 'Request failed';
    throw new Error(message);
  }
  return payload;
}

export async function generatePlan(b: {
  name: string;
  notes: string;
  flaggedDistricts: unknown[];
}): Promise<void> {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(b),
  });
  if (!res.ok) {
    const payload = (await res.json()) as Record<string, unknown>;
    const message =
      typeof payload.details === 'string'
        ? payload.details
        : typeof payload.error === 'string'
          ? payload.error
          : 'Plan generation failed';
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `care-plan-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function saveScenario(b: {
  name: string;
  specialty: string;
  notes: string;
  geoFilter: unknown;
}): Promise<{ scenario_id: string }> {
  return postJson('/api/scenarios', b) as Promise<{ scenario_id: string }>;
}

export function shortlistFacility(b: { scenario_id: string; facility_id: string; note: string }): Promise<unknown> {
  return postJson('/api/shortlist', b);
}

export function mapProblemToCapabilities(problem: string): Promise<{ specialties: string[]; rawResponse?: string }> {
  return postJson('/api/genie/map-problem', { problem }) as Promise<{ specialties: string[]; rawResponse?: string }>;
}

export function reviewClaim(b: {
  scenario_id: string;
  claim_id: string;
  facility_id: string;
  review_status: string;
  note: string;
}): Promise<unknown> {
  return postJson('/api/claim-reviews', b);
}
