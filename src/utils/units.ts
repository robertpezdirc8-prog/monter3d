/**
 * units.ts — FAZA 31
 *
 * Enote dolžine. Aplikacija računa vedno v **metrih**, uporabnik pa vpisuje in
 * odčuje v enoti, ki mu najbolj ustreza (monterski običajno merijo v cm ali mm).
 *
 * Pretvorbe so centralizirane, da se vnos, prikaz in dokumenti vedno ujemajo.
 */

export type LengthUnit = 'm' | 'cm' | 'mm';

export const LENGTH_UNITS: { id: LengthUnit; label: string; short: string }[] = [
  { id: 'm', label: 'Metri', short: 'm' },
  { id: 'cm', label: 'Centimetri', short: 'cm' },
  { id: 'mm', label: 'Milimetri', short: 'mm' },
];

/** Koliko izbrane enote je v enem metru. */
export const UNIT_TO_METRES: Record<LengthUnit, number> = {
  m: 1,
  cm: 100,
  mm: 1000,
};

/** Pretvori dolžino iz metrov v izbrano enoto. */
export function toUnit(metres: number, unit: LengthUnit): number {
  return metres * UNIT_TO_METRES[unit];
}

/** Pretvori vrednost iz izbrane enote v metre. */
export function fromUnit(value: number, unit: LengthUnit): number {
  return value / UNIT_TO_METRES[unit];
}

/** Kratka oznaka enote (m / cm / mm). */
export function unitLabel(unit: LengthUnit): string {
  return LENGTH_UNITS.find(u => u.id === unit)?.short ?? 'm';
}

/** Normalizira vneseno enoto (neznana -> 'm'). */
export function normalizeUnit(unit: unknown): LengthUnit {
  return unit === 'cm' || unit === 'mm' || unit === 'm' ? unit : 'm';
}

/**
 * Formatira dolžino (v metrih) v izbrani enoti, npr. `6,50 m ±2,0 %`
 * ali `650 cm ±2,0 %`. Negotovost je odstotek in se ne pretvarja.
 */
export function formatLength(
  metres: number,
  unit: LengthUnit,
  uncertaintyPercent = 0
): string {
  const value = toUnit(metres, unit);
  const decimals = unit === 'mm' ? 0 : unit === 'cm' ? 1 : 3;
  const text = value.toFixed(decimals);
  return uncertaintyPercent > 0
    ? `${text} ${unitLabel(unit)} ±${uncertaintyPercent.toFixed(1)}%`
    : `${text} ${unitLabel(unit)}`;
}
