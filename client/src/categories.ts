// Display names for every place type QLESS can discover.
export const CATEGORY_LABELS: Record<string, string> = {
  HEALTHCARE: 'Healthcare',
  RESTAURANT: 'Dining',
  RELIGIOUS: 'Temples',
  BANKING: 'Banks',
  SALON: 'Salons',
  PHARMACY: 'Pharmacies',
  EDUCATION: 'Colleges & Schools',
  GOVERNMENT: 'Government',
  SHOPPING: 'Shopping',
  TRANSPORT: 'Transport',
  ENTERTAINMENT: 'Entertainment',
  FUEL: 'Fuel',
  LODGING: 'Hotels',
  LEISURE: 'Parks & Gyms',
  ATTRACTION: 'Attractions',
  SERVICES: 'Other Places'
};

// The filter pills already built into the home screen.
const BUILT_IN = ['ALL', 'HEALTHCARE', 'RESTAURANT', 'RELIGIOUS', 'BANKING', 'SALON'];

/** Extra filter pills for place types that exist in the current list but have no built-in pill. */
export function extraCategories(locations: Array<{ category: string }>): Array<{ id: string; label: string }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; label: string }> = [];
  locations.forEach((l) => {
    if (!BUILT_IN.includes(l.category) && !seen.has(l.category)) {
      seen.add(l.category);
      out.push({ id: l.category, label: CATEGORY_LABELS[l.category] || l.category });
    }
  });
  return out;
}