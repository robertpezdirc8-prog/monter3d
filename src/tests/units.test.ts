/**
 * FAZA 31 — enote dolžin (m / cm / mm).
 */
import { describe, it, expect } from 'vitest';
import {
  LENGTH_UNITS, UNIT_TO_METRES, formatLength, fromUnit, normalizeUnit, toUnit, unitLabel,
} from '../utils/units';

describe('pretvorbe enot', () => {
  it('toUnit pretvori metre v izbrano enoto', () => {
    expect(toUnit(6.5, 'm')).toBeCloseTo(6.5, 10);
    expect(toUnit(6.5, 'cm')).toBeCloseTo(650, 10);
    expect(toUnit(6.5, 'mm')).toBeCloseTo(6500, 10);
  });

  it('fromUnit je obratna pretvorba', () => {
    for (const unit of ['m', 'cm', 'mm'] as const) {
      expect(fromUnit(toUnit(3.25, unit), unit)).toBeCloseTo(3.25, 10);
    }
  });

  it('faktorji so točni', () => {
    expect(UNIT_TO_METRES.m).toBe(1);
    expect(UNIT_TO_METRES.cm).toBe(100);
    expect(UNIT_TO_METRES.mm).toBe(1000);
  });

  it('formatLength prikaže vrednost v izbrani enoti z negotovostjo', () => {
    expect(formatLength(6.5, 'm', 2)).toBe('6.500 m ±2.0%');
    expect(formatLength(6.5, 'cm', 2)).toBe('650.0 cm ±2.0%');
    expect(formatLength(6.5, 'mm', 2)).toBe('6500 mm ±2.0%');
  });

  it('brez negotovosti ni znaka ±', () => {
    expect(formatLength(2, 'm')).toBe('2.000 m');
  });

  it('normalizeUnit skoči neznane vrednosti na metre', () => {
    expect(normalizeUnit('cm')).toBe('cm');
    expect(normalizeUnit('mm')).toBe('mm');
    expect(normalizeUnit('palci')).toBe('m');
    expect(normalizeUnit(undefined)).toBe('m');
  });

  it('oznake enot so različne', () => {
    expect(unitLabel('m')).toBe('m');
    expect(unitLabel('cm')).toBe('cm');
    expect(unitLabel('mm')).toBe('mm');
    expect(LENGTH_UNITS.length).toBe(3);
  });
});
