/**
 * FAZA 26 — enoten izračun ograje (panelna in deskna konstrukcija).
 */
import { describe, it, expect } from 'vitest';
import { calculateFenceCalculation } from '../utils/fenceCalculation';
import { getProfileById } from '../data/roksalCatalog';
import { DEFAULT_MATERIAL_PRICES } from '../utils/projectState';
import type { FenceConfig } from '../types';

const CONFIG: FenceConfig = {
  panelWidth: 1.8,
  panelHeight: 1.5,
  postWidth: 0.06,
  maxGap: 0.12,
  mountingStyle: 'level',
  slopeThreshold: 5,
};

const segments = [
  { id: 's1', length: 5, bearingDeg: 0, heightChange: 0 },
  { id: 's2', length: 3, bearingDeg: 90, heightChange: 0 },
];

describe('calculateFenceCalculation', () => {
  it('panelna konstrukcija: načrt, materiali in dolžina', () => {
    const result = calculateFenceCalculation({
      segments,
      config: CONFIG,
      prices: DEFAULT_MATERIAL_PRICES,
    });

    expect(result.constructionType).toBe('panel');
    expect(result.plan).not.toBeNull();
    expect(result.boardPlan).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.totalLength).toBeCloseTo(8, 6);
    expect(result.materials.length).toBeGreaterThan(0);
    // Oba segmenta sta v načrtu (skupaj 8 m).
    expect(result.plan!.segments.length).toBe(2);
  });

  it('deskna konstrukcija: uporabi katalog in da deske/stebre', () => {
    const profile = getProfileById('polna-deska-57-32')!;
    const result = calculateFenceCalculation({
      segments,
      config: { ...CONFIG, constructionType: 'board', profileId: profile.id },
      profile,
      prices: DEFAULT_MATERIAL_PRICES,
    });

    expect(result.constructionType).toBe('board');
    expect(result.boardPlan).not.toBeNull();
    expect(result.plan).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.boardPlan!.boards).toBeGreaterThan(0);
    expect(result.boardPlan!.posts).toBeGreaterThan(0);
    expect(result.totalLength).toBeCloseTo(8, 6);
    // Materialna lista vsebuje deske in stebre.
    const ids = result.materials.map(m => m.id);
    expect(ids).toContain('mat-boards');
    expect(ids).toContain('mat-board-posts');
  });

  it('deskna konstrukcija brez profila je napaka (ne tiho prazno)', () => {
    const result = calculateFenceCalculation({
      segments,
      config: { ...CONFIG, constructionType: 'board' },
      prices: DEFAULT_MATERIAL_PRICES,
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.materials).toEqual([]);
  });

  it('neveljavni segment (dolžina 0) je napaka', () => {
    const result = calculateFenceCalculation({
      segments: [{ id: 'x', length: 0 }],
      config: CONFIG,
      prices: DEFAULT_MATERIAL_PRICES,
    });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.materials).toEqual([]);
  });

  it('kršitev tehnicnih pravil profila prekine predračun', () => {
    const profile = getProfileById('polna-deska-57-32')!;
    // Panel 1,8 m -> razmak stebrov 1860 mm, limit profila pa je 1500 mm.
    const result = calculateFenceCalculation({
      segments: [{ id: 's1', length: 3.78 }],
      config: { ...CONFIG, profileId: profile.id },
      profile,
      prices: DEFAULT_MATERIAL_PRICES,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.materials).toEqual([]);
  });
});
