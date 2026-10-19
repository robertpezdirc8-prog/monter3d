/**
 * FAZA 8 (P1) — regresijski testi geometrije ograje.
 *
 * Prej so se vse meritve zlepile v eno premico (heightChange = 0), zato je bilo
 * mogoče narisati samo ravno ograjo. Zdaj vsak segment nosi smer (azimut) in
 * morebitni dvig.
 */
import { describe, it, expect } from 'vitest';
import { buildFenceGeometry, normalizeBearing } from '../utils/fenceGeometry';
import { calculateFencePlan } from '../utils/geometry';

const CONFIG = {
  panelWidth: 1.8,
  panelHeight: 1.5,
  postWidth: 0.06,
  maxGap: 0.15,
  mountingStyle: 'level' as const,
  slopeThreshold: 5,
};

describe('normalizeBearing', () => {
  it('azimut vedno v [0, 360)', () => {
    expect(normalizeBearing(0)).toBe(0);
    expect(normalizeBearing(90)).toBe(90);
    expect(normalizeBearing(-90)).toBe(270);
    expect(normalizeBearing(450)).toBe(90);
    expect(normalizeBearing(360)).toBe(0);
    expect(normalizeBearing(NaN)).toBe(0);
  });
});

describe('buildFenceGeometry', () => {
  it('ravna ograja: segmenti se stekajo v premico', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5 },
      { id: 'b', length: 3 },
    ]);

    expect(g.segments.length).toBe(2);
    expect(g.totalHorizontalLength).toBeCloseTo(8, 10);
    expect(g.segments[0].startPoint[0]).toBeCloseTo(0, 10);
    expect(g.segments[1].startPoint[0]).toBeCloseTo(5, 10);
    expect(g.segments[1].endPoint[0]).toBeCloseTo(8, 10);
    expect(g.errors).toEqual([]);
  });

  it('kot 90°: L-oblik (prej ni bilo mogoče)', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5, bearingDeg: 0 },
      { id: 'b', length: 3, bearingDeg: 90 },
    ]);

    expect(g.segments[1].endPoint[0]).toBeCloseTo(5, 10);
    expect(g.segments[1].endPoint[1]).toBeCloseTo(3, 10);
    expect(g.totalHorizontalLength).toBeCloseTo(8, 10);
  });

  it('dvig segmenta: fizična dolžina in naklon', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5, heightChange: 1.5 },
    ]);

    expect(g.segments[0].length).toBeCloseTo(Math.sqrt(5 * 5 + 1.5 * 1.5), 10);
    expect(g.segments[0].slope).toBeCloseTo(Math.atan2(1.5, 5) * 180 / Math.PI, 10);
    expect(g.totalHeightChange).toBeCloseTo(1.5, 10);
    expect(g.totalLength).toBeCloseTo(Math.sqrt(5 * 5 + 1.5 * 1.5), 10);
  });

  it('sklenjena ograja se opozori', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 4, bearingDeg: 0 },
      { id: 'b', length: 4, bearingDeg: 90 },
      { id: 'c', length: 4, bearingDeg: 180 },
      { id: 'd', length: 4, bearingDeg: 270 },
    ]);

    expect(g.warnings.some(w => /sklenjena/i.test(w))).toBe(true);
  });

  it('različna končna višina se opozori', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5, heightChange: 0.4 },
    ]);
    expect(g.warnings.some(w => /višina/i.test(w))).toBe(true);
  });

  it('neveljavna dolžina je napaka (ne tiho izpuščena)', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5 },
      { id: 'b', length: 0 },
      { id: 'c', length: NaN },
    ]);

    expect(g.errors.length).toBe(2);
    expect(g.segments.length).toBe(1);
  });
});

describe('buildFenceGeometry + calculateFencePlan (celotna pot)', () => {
  it('L-oblik da načrt z dvema segmentoma in pravilno skupno dolžino', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5, bearingDeg: 0 },
      { id: 'b', length: 3, bearingDeg: 90 },
    ]);

    const plan = calculateFencePlan(
      g.segments.map(s => ({ startPoint: s.startPoint, endPoint: s.endPoint, heightChange: s.heightChange })),
      CONFIG
    );

    expect(plan.errors).toBeUndefined();
    expect(plan.segments.length).toBe(2);
    expect(plan.totalLength).toBeCloseTo(8, 10);
  });

  it('dvig segmenta vpliva na dolžino letev (fizična dolžina po terenu)', () => {
    const g = buildFenceGeometry([
      { id: 'a', length: 5, heightChange: 1.5 },
    ]);
    const plan = calculateFencePlan(
      g.segments.map(s => ({ startPoint: s.startPoint, endPoint: s.endPoint, heightChange: s.heightChange })),
      CONFIG
    );

    expect(plan.segments[0].length).toBeCloseTo(Math.sqrt(5 * 5 + 1.5 * 1.5), 10);
    expect(plan.totalHeightChange).toBeCloseTo(1.5, 10);
  });
});
