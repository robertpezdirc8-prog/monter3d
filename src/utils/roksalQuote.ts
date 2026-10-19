/**
 * Mera3D Pro / Roksal Teren - kosovnica in ponudba
 *
 * Iz ene Roksal konfiguracije zgradi:
 *  - kosovnico (BOM) z realnimi količinami (profili, stebri, nosilci, ALU cev,
 *    kotniki, vijaki, pokrovi),
 *  - ponudbo s številko, veljavnostjo, stranko in izračunanimi skupnimi zneski.
 *
 * Cene se preberejo iz RoksalPriceList; privzeti cenik je DEMO in to tudi
 * označi na ponudbi (isDemoPrices).
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Customer,
  QuoteItem,
  RoksalConfiguration,
  RoksalQuote
} from '../types';
import type { RoksalColor } from '../data/roksalCatalog';
import { loadRoksalPriceList, type RoksalPriceList } from '../data/roksalPrices';
import type { ConstructionResult, FenceConfiguration } from './fenceConstruction';

export interface BuildRoksalBomInput {
  configuration: FenceConfiguration;
  construction: ConstructionResult;
  color: RoksalColor;
  priceList: RoksalPriceList;
}

export interface CreateRoksalQuoteInput {
  customer: Customer;
  configuration: FenceConfiguration;
  construction: ConstructionResult;
  color: RoksalColor;
  priceList?: RoksalPriceList;
  quoteNumber?: string;
  laborHours?: number;
  discountPercent?: number;
  notes?: string;
  terms?: string;
  now?: Date;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Sestavi kosovnico iz izračuna konstrukcije. Količine so zaokrožene navzgor
 * pri kosih (nikoli ne naročimo premalo) in na 0,1 m pri tekočih metrih.
 */
export function buildRoksalBom(input: BuildRoksalBomInput): QuoteItem[] {
  const { configuration, construction, color, priceList } = input;
  const { profile, orientation, fenceLength } = configuration;
  const items: QuoteItem[] = [];

  // 1) Profili (deske) - cena po m² profila
  const profileAreaM2 = (profile.length / 1000) * (construction.effectiveWidth / 1000);
  const profileUnitPrice = round2(profileAreaM2 * priceList.profilePricePerM2);
  items.push({
    id: uuidv4(),
    name: `Profil ${profile.name} (${color.name})`,
    category: 'profili',
    quantity: construction.numberOfProfilePieces,
    unit: 'kos',
    unitPrice: profileUnitPrice,
    totalPrice: round2(profileUnitPrice * construction.numberOfProfilePieces),
    notes: `Dolžina profila ${profile.length} mm, vidna širina ${construction.effectiveWidth} mm. Odpad pri razrezu je upoštevan v potrebnem številu profilov.`
  });

  // 2) Stebri
  if (construction.numberOfPosts > 0) {
    items.push({
      id: uuidv4(),
      name: 'Stebrički',
      category: 'stebri',
      quantity: construction.numberOfPosts,
      unit: 'kos',
      unitPrice: priceList.postPriceEach,
      totalPrice: round2(priceList.postPriceEach * construction.numberOfPosts),
      notes: `Enakomerni razmak ${construction.actualPostSpacing} mm.`
    });
  }

  // 3) Nosilci (samo pri pokončni ograji - pri prečni so nosilci stebrički)
  if (orientation === 'vertical' && construction.numberOfBeams > 0) {
    const beamMeters = round1((construction.numberOfBeams * fenceLength) / 1000);
    items.push({
      id: uuidv4(),
      name: 'Vodoravni nosilci',
      category: 'nosilci',
      quantity: beamMeters,
      unit: 'm',
      unitPrice: priceList.beamPricePerM,
      totalPrice: round2(priceList.beamPricePerM * beamMeters),
      notes: `${construction.numberOfBeams} nosilcev, razmak ${construction.beamSpacing} mm.`
    });
  }

  // 4) Aluminijasta cev (ROMB in KUBO)
  if (construction.requiresAluminumTube && construction.aluminumTubeLengthM > 0) {
    items.push({
      id: uuidv4(),
      name: 'Aluminijasta cev',
      category: 'alu',
      quantity: construction.aluminumTubeLengthM,
      unit: 'm',
      unitPrice: priceList.aluTubePricePerM,
      totalPrice: round2(priceList.aluTubePricePerM * construction.aluminumTubeLengthM),
      notes: 'Obvezna za izbrani profil - montaža brez nje ni mogoča.'
    });
  }

  // 5) Kotniki
  if (construction.numberOfBrackets > 0) {
    items.push({
      id: uuidv4(),
      name: 'Kotniki levo/desno',
      category: 'kotniki',
      quantity: construction.numberOfBrackets,
      unit: 'kos',
      unitPrice: priceList.bracketPriceEach,
      totalPrice: round2(priceList.bracketPriceEach * construction.numberOfBrackets),
      notes: '2 kotnika na stebriček.'
    });
  }

  // 6) Vijaki / pritrdila
  if (construction.numberOfScrews > 0) {
    items.push({
      id: uuidv4(),
      name: 'Vijaki / pritrdila',
      category: 'vijaki',
      quantity: construction.numberOfScrews,
      unit: 'kos',
      unitPrice: priceList.screwPriceEach,
      totalPrice: round2(priceList.screwPriceEach * construction.numberOfScrews),
      notes: 'Izračun vključuje 5 % rezerve.'
    });
  }

  // 7) Zaključni pokrovi stebričkov
  if (construction.numberOfEndCaps > 0) {
    items.push({
      id: uuidv4(),
      name: 'Zaključni pokrovi (stebri)',
      category: 'pokrovi',
      quantity: construction.numberOfEndCaps,
      unit: 'kos',
      unitPrice: priceList.endCapPriceEach,
      totalPrice: round2(priceList.endCapPriceEach * construction.numberOfEndCaps),
      notes: '2 pokrova na stebriček.'
    });
  }

  return items;
}

const LS_QUOTE_COUNTER = 'roksal-quote-counter';

/**
 * Zaporedna številka ponudbe v obliki P-LLLL-NNN. Števec je shranjen v
 * localStorage in se samodejno resetira z novim letom. Ob napaki (npr. v
 * testnem okolju brez localStorage) vrne številko z časovnim žigom.
 */
export function nextQuoteNumber(now: Date = new Date()): string {
  const year = now.getFullYear();
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LS_QUOTE_COUNTER);
      let counter = 1;
      if (raw) {
        const parsed = JSON.parse(raw) as { year?: number; value?: number };
        if (parsed.year === year && typeof parsed.value === 'number' && parsed.value > 0) {
          counter = parsed.value + 1;
        }
      }
      localStorage.setItem(LS_QUOTE_COUNTER, JSON.stringify({ year, value: counter }));
      return `P-${year}-${String(counter).padStart(3, '0')}`;
    }
  } catch {
    // prezri - uporabi rezervno številko
  }
  return `P-${year}-${String(now.getTime()).slice(-5)}`;
}

export const DEFAULT_QUOTE_TERMS = [
  'Cene so v EUR brez DDV.',
  'Ponudba velja 14 dni od datuma izdaje.',
  'Rok dobave in montaže: po dogovoru.',
  'Plačilni pogoji: 50 % avans, 50 % ob prevzemu.',
  'Montaža se izvede v skladu z navodili proizvajalca Roksal.'
].join('\n');

export function createRoksalQuote(input: CreateRoksalQuoteInput): RoksalQuote {
  const priceList = input.priceList ?? loadRoksalPriceList();
  const { configuration, construction, color } = input;
  const now = input.now ?? new Date();
  const validUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const roksalConfiguration: RoksalConfiguration = {
    profileId: configuration.profile.id,
    profileName: configuration.profile.name,
    colorId: color.id,
    colorName: color.name,
    colorHex: color.hex,
    orientation: configuration.orientation,
    fenceHeightMm: configuration.fenceHeight,
    fenceLengthMm: configuration.fenceLength,
    boardSpacingMm: configuration.boardSpacing,
    postSpacingMm: configuration.postSpacing,
    visibleWidthMm: configuration.visibleWidth
  };

  const items = buildRoksalBom({
    configuration,
    construction,
    color,
    priceList
  });

  const materialsSubtotal = round2(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const hours = clamp(input.laborHours ?? 0, 0, 1000);
  const labor = hours > 0
    ? {
        hours,
        rate: priceList.laborRatePerHour,
        total: round2(hours * priceList.laborRatePerHour)
      }
    : undefined;
  const laborTotal = labor?.total ?? 0;
  const subtotal = round2(materialsSubtotal + laborTotal);
  const discountPercent = clamp(input.discountPercent ?? 0, 0, 100);
  const discount = round2(subtotal * (discountPercent / 100));
  const taxable = round2(subtotal - discount);
  const taxRate = priceList.taxRate;
  const tax = round2(taxable * taxRate);
  const total = round2(taxable + tax);

  const warnings = [...construction.warnings];
  if (priceList.isDemo) {
    warnings.push('Ponudba uporablja privzete DEMO cene - nastavite svoj cenik (💶 Cene).');
  }
  if (!input.customer?.name?.trim()) {
    warnings.push('Stranka ni vnesena - ponudba je brez podatkov o naročniku.');
  }

  const valid = construction.valid && items.length > 0;

  return {
    id: uuidv4(),
    number: input.quoteNumber ?? nextQuoteNumber(now),
    createdAt: now,
    validUntil,
    status: 'draft',
    customer: {
      name: input.customer?.name?.trim() || 'Stranka',
      address: input.customer?.address,
      postalCode: input.customer?.postalCode,
      city: input.customer?.city,
      phone: input.customer?.phone,
      email: input.customer?.email,
      taxNumber: input.customer?.taxNumber
    },
    configuration: roksalConfiguration,
    items,
    labor,
    materialsSubtotal,
    laborTotal,
    subtotal,
    discountPercent,
    discount,
    taxRate,
    tax,
    total,
    valid,
    errors: [...construction.errors],
    warnings,
    isDemoPrices: priceList.isDemo,
    notes: input.notes,
    terms: input.terms ?? DEFAULT_QUOTE_TERMS
  };
}
