/**
 * Roksal - cenik in poslovni parametri
 *
 * POMEMBNO: vrednosti spodaj so DEMO vrednosti, povzete po dosedanjih
 * privzetih vrednostih v aplikaciji. Niso uradni Roksal cenik.
 * Pred uporabo v produkciji jih zamenjajte z veljavnim cenikom Roksal Kranj
 * in nastavite isDemo: false.
 *
 * Cene so v EUR brez DDV.
 */

export interface RoksalPriceList {
  version: string;
  validFrom: string;
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
    'DEMO cene - niso uradni Roksal cenik.',
    'Cene so v EUR brez DDV.',
    'Pred produkcijsko uporabo jih zamenjajte z veljavnim cenikom.'
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
