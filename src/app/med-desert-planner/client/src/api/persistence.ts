async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Request failed');
  }
  return payload;
}

export function saveScenario(b: {
  name: string;
  specialty: string;
  notes: string;
  geoFilter: unknown;
}): Promise<{ scenario_id: string }> {
  return postJson('/api/scenarios', b) as Promise<{ scenario_id: string }>;
}

export function shortlistFacility(b: {
  scenario_id: string;
  facility_id: string;
  note: string;
}): Promise<unknown> {
  return postJson('/api/shortlist', b);
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
