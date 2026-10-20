/**
 * FAZA 10 (P2) — voden zajem po obrti: kakovost, projekt in shranjevanje.
 */
import { describe, it, expect } from 'vitest';
import {
  frameStatsToImageQuality,
  photoStatusForQuality,
  createTradeProject,
  resolveTradeProject,
} from '../utils/tradeCapture';
import type { FrameStats } from '../utils/cameraSDK';
import type { Project } from '../types';

function stats(overrides: Partial<FrameStats> = {}): FrameStats {
  return {
    width: 2048,
    height: 1536,
    sharpness: 120,
    meanBrightness: 128,
    darkRatio: 0.1,
    quality: 'good',
    ...overrides,
  };
}

function project(id: string, name = `P ${id}`): Project {
  return {
    id,
    name,
    objectType: 'fence',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    photos: [],
    measurements: [],
    materials: {
      productLine: 'Roksal Standard', color: 'Antracit', finish: 'Prašno barvan',
      panelMaterial: 'Aluminij', postMaterial: 'Aluminij', fastenerType: 'A2 inox',
    },
    status: 'capture',
  };
}

describe('frameStatsToImageQuality', () => {
  it('dobra slika ima visoko oceno in ni zavrnjena', () => {
    const q = frameStatsToImageQuality(stats());
    expect(q.overallScore).toBeGreaterThan(0.7);
    expect(q.blurScore).toBe(0);
    expect(q.glareDetected).toBe(false);
    expect(photoStatusForQuality(q)).toBe('analyzed');
  });

  it('zamegljena slika je označena in zavrnjena', () => {
    const q = frameStatsToImageQuality(stats({ sharpness: 20, quality: 'blurry' }));
    expect(q.blurScore).toBe(1);
    expect(q.overallScore).toBeLessThanOrEqual(0.4);
    expect(photoStatusForQuality(q)).toBe('rejected');
  });

  it('pretemenjena in presvetla slika sta zavrnjeni', () => {
    expect(photoStatusForQuality(frameStatsToImageQuality(stats({ quality: 'too_dark' })))).toBe('rejected');
    const bright = frameStatsToImageQuality(stats({ quality: 'too_bright' }));
    expect(bright.glareDetected).toBe(true);
    expect(photoStatusForQuality(bright)).toBe('rejected');
  });

  it('vrednosti so vedno v intervalu 0..1', () => {
    const q = frameStatsToImageQuality(stats({ sharpness: 9999, meanBrightness: 400, darkRatio: 3 }));
    expect(q.sharpness).toBeLessThanOrEqual(1);
    expect(q.brightness).toBeLessThanOrEqual(1);
    expect(q.contrast).toBeGreaterThanOrEqual(0);
  });
});

describe('resolveTradeProject', () => {
  it('nadaljuje v aktivnem projektu', () => {
    const p = project('a');
    const r = resolveTradeProject([p, project('b')], 'a', 'ograje', 'Balkonske ograje');
    expect(r.project.id).toBe('a');
    expect(r.isNew).toBe(false);
  });

  it('če ni aktivnega projekta, uporabi prvega obstoječega', () => {
    const r = resolveTradeProject([project('b')], null, 'ograje', 'Balkonsne ograje');
    expect(r.project.id).toBe('b');
    expect(r.isNew).toBe(false);
  });

  it('brez projektov ustvari nov projekt za obrt', () => {
    const r = resolveTradeProject([], null, 'krovstvo', 'Krovci');
    expect(r.isNew).toBe(true);
    expect(r.project.name).toMatch(/Krovci/);
    expect(r.project.id).toBeTruthy();
  });

  it('neveljaven aktiven ID ne povzroči napake', () => {
    const r = resolveTradeProject([project('a')], 'ne-obstaja', 'ograje', 'Balkonske ograje');
    expect(r.project.id).toBe('a');
  });
});

describe('createTradeProject', () => {
  it('projekt ima ime z obrtjo in datumom ter je pripravljen za zajem', () => {
    const p = createTradeProject('keramika', 'Keramika / ploščice');
    expect(p.objectType).toBe('fence');
    expect(p.status).toBe('capture');
    expect(p.photos).toEqual([]);
    expect(p.measurements).toEqual([]);
    expect(p.materials.panelMaterial).toBe('Aluminij');
  });
});
