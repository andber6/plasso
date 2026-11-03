export const SPACE_TYPES: { id: string; label: string }[] = [
  { id: 'kontor', label: 'Kontor' },
  { id: 'lager', label: 'Lager' },
  { id: 'butikk', label: 'Butikk' },
  { id: 'kontorhotell', label: 'Kontorhotell' },
  { id: 'verksted', label: 'Verksted' },
  { id: 'servering', label: 'Servering' },
];

export const CITIES = ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Kristiansand', 'Tromsø', 'Drammen', 'Fredrikstad', 'Lillestrøm', 'Sandnes'];

export const FACILITIES = [
  'parkering',
  'møterom',
  'resepsjon',
  'heis',
  'kantine',
  'kjøkken',
  'fiber',
  'sykkelparkering',
  'lasterampe',
  'port',
  'høy takhøyde',
  'butikkvindu',
  'uteservering',
  'lager',
];

export const SIZE_RANGES: { id: string; label: string; range: [number, number] }[] = [
  { id: '0-100', label: 'Under 100 m²', range: [0, 100] },
  { id: '100-300', label: '100–300 m²', range: [100, 300] },
  { id: '300-600', label: '300–600 m²', range: [300, 600] },
  { id: '600-', label: 'Over 600 m²', range: [600, 100000] },
];

export const PRICE_LIMITS = [15000, 30000, 50000, 100000];

export const LEASE_OPTIONS = [6, 12, 36, 60];

export const PHOTO_KEYS = ['office-1', 'office-2', 'office-3', 'office-4', 'coworking-1', 'warehouse-1', 'workshop-1', 'retail-1', 'restaurant-1'];

export const DEFAULT_PHOTO: Record<string, string> = {
  kontor: 'office-1',
  lager: 'warehouse-1',
  butikk: 'retail-1',
  kontorhotell: 'coworking-1',
  verksted: 'workshop-1',
  servering: 'restaurant-1',
};

/** A post's image is either a bundled photo key or an uploaded URL. */
export function photoUrl(image: string | null, spaceType?: string): string {
  const key = image ?? (spaceType ? DEFAULT_PHOTO[spaceType] : null) ?? 'office-1';
  return key.startsWith('/') || key.startsWith('http') ? key : `/photos/${key}.jpg`;
}

export function spaceTypeLabel(id: string): string {
  return SPACE_TYPES.find((t) => t.id === id)?.label ?? id;
}

export const ROLES = [
  { id: 'leietaker', label: 'Leietaker' },
  { id: 'utleier', label: 'Utleier' },
  { id: 'megler', label: 'Megler' },
];
