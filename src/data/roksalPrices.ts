/**
 * Roksal — cenik in poslovni parametri
 *
 * Cene določata monter oziroma vodstvo podjetja samostojno prek urejevalnika
 * cen v aplikaciji (gumb »💶 Cene«). Privzete vrednosti spodaj so DEMO in se
 * uporabijo samo, dokler uporabnik ne shrani svojega cenika.
 *
 * Shranjeni cenik velja za posamezno napravo (localStorage) in se uporabi pri
 * vseh novo izdanih ponudbah. Cene so v EUR brez DDV.
 */

export const PRICE_LIST_STORAGE_KEY = 'roksal-price-list-v1';

export interface RoksalPriceList {
  version: string;
  /** Naziv cenika, npr. »Cenik 2026« — prikazan na ponudbi in v pregledih. */
  label?: string;
  validFrom: string;
  /** ISO datum zadnje spremembe; nastavi ga shramba ob shranjevanju. */
  updatedAt?: string;
  currency: 'EUR';
  isDemo: boolean;
  /** EUR na m² profila (deske). */
  profilePricePerM2: number;
  /** EUR na kos stebra. */
  postPriceEach: number;
  /** EUR na tekoči meter nosilca/letve. */
  beamPricePerM: number;
  /** EUR na tekoči meter aluminijaste cevi. */
  aluTubePricePerM: number;
  /** EUR na kos kotnika. */
  bracketPriceEach: number;
  /** EUR na kos vijaka/pritrdila. */
  screwPriceEach: number;
  /** EUR na kos zaključnega pokrova. */
  endCapPriceEach: number;
  /** EUR na uro montaže. */
  laborRatePerHour: number;
  /** DDV kot decimalno število (0.22 = 22 %). */
  taxRate: number;
  /** Dodatek za razrez/odpad, npr. 0.07 = 7 %. */
  wastePercent: number;
  notes: string[];
}

export const DEFAULT_ROKSAL_PRICE_LIST: RoksalPriceList = {
  version: 'demo-2026.1',
  label: 'Privzeti DEMO cenik',
  validFrom: '2026-01-01',
  currency: 'EUR',
  isDemo: true,
  profilePricePerM2: 85,
  postPriceEach: 45,
  beamPricePerM: 12,
  aluTubePricePerM: 9,
  bracketPriceEach: 4.5,
  screwPriceEach: 0.5,
  endCapPriceEach: 8,
  laborRatePerHour: 35,
  taxRate: 0.22,
  wastePercent: 0.07,
  notes: [
    'DEMO cene — monter oziroma vodstvo naj vnese svoj cenik (💶 Cene).',
    'Cene so v EUR brez DDV.'
  ]
};

export function isPriceListValid(priceList: RoksalPriceList): boolean {
  return [
    priceList.profilePricePerM2,
    priceList.postPriceEach,
    priceList.beamPricePerM,
    priceList.aluTubePricePerM,
    priceList.bracketPriceEach,
    priceList.screwPriceEach,
    priceList.endCapPriceEach,
    priceList.laborRatePerHour
  ].every(v => isFinite(v) && v >= 0) &&
    isFinite(priceList.taxRate) && priceList.taxRate >= 0 &&
    isFinite(priceList.wastePercent) && priceList.wastePercent >= 0;
}

/** Vrne localStorage, če je na voljo (brskalnik); sicer null (npr. v testih). */
function getStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage as Storage | undefined;
    return storage && typeof storage.getItem === 'function' ? storage : null;
  } catch {
    return null;
  }
}

/**
 * Vrne shranjeni uporabniški cenik, če obstaja in je veljaven.
 * Sicer vrne privzeti DEMO cenik.
 */
export function loadRoksalPriceList(): RoksalPriceList {
  const storage = getStorage();
  if (!storage) return DEFAULT_ROKSAL_PRICE_LIST;
  try {
    const raw = storage.getItem(PRICE_LIST_STORAGE_KEY);
    if (!raw) return DEFAULT_ROKSAL_PRICE_LIST;
    const parsed = JSON.parse(raw) as Partial<RoksalPriceList>;
    const merged: RoksalPriceList = {
      ...DEFAULT_ROKSAL_PRICE_LIST,
      ...parsed,
      currency: 'EUR',
      // shranjena različica je vedno uporabniška (ni DEMO)
      isDemo: false,
      notes: Array.isArray(parsed.notes) ? parsed.notes : DEFAULT_ROKSAL_PRICE_LIST.notes
    };
    return isPriceListValid(merged) ? merged : DEFAULT_ROKSAL_PRICE_LIST;
  } catch {
    return DEFAULT_ROKSAL_PRICE_LIST;
  }
}

/**
 * Shrani uporabniški cenik. Ob uspehu vrne true in zapiše updatedAt.
 * isDemo se vedno nastavi na false — s tem so nove ponudbe označene kot
 * izračunane z uporabniškimi (ne DEMO) cenami.
 */
export function saveRoksalPriceList(priceList: RoksalPriceList): boolean {
  const storage = getStorage();
  if (!storage) return false;
  const clean: RoksalPriceList = {
    ...priceList,
    currency: 'EUR',
    isDemo: false,
    updatedAt: new Date().toISOString()
  };
  if (!isPriceListValid(clean)) return false;
  try {
    storage.setItem(PRICE_LIST_STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

/** Povrne privzeti DEMO cenik (izbriše shranjene uporabniške cene). */
export function resetRoksalPriceList(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(PRICE_LIST_STORAGE_KEY);
  } catch {
    // ignoriraj — shramba ni na voljo
  }
}
