// Keyed by `${normalizedState}::${normalizedDistrict}` from the data → normalized geojson name.
// Seeded with common NFHS-5 ↔ boundary-source mismatches; extend as Task 8 surfaces more.
export const DISTRICT_ALIASES: Record<string, string> = {
  'bihar::pashchim champaran': 'west champaran',
  'bihar::purba champaran': 'east champaran',
  'bihar::kaimur bhabua': 'kaimur',
  'bihar::purnia': 'purnea',
};
