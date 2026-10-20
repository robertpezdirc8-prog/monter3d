/**
 * FAZA 32 — samostojen dokument za deljenje dokumentacije (brez strežnika).
 */
import { describe, it, expect } from 'vitest';
import { buildShareDocument, escapeHtml, estimateShareSizeMB } from '../utils/shareExport';
import type { Measurement, Photo, Project } from '../types';

const project: Project = {
  id: 'p1',
  name: 'Ograja <script>alert(1)</script>',
  objectType: 'fence',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  photos: [],
  measurements: [],
  materials: {
    productLine: 'Roksal', color: 'Antracit', finish: 'Prašno barvan',
    panelMaterial: 'Aluminij', postMaterial: 'Aluminij', fastenerType: 'A2 inox',
  },
  status: 'capture',
};

const photo: Photo = {
  id: 'ph1',
  dataUrl: 'data:image/png;base64,AAAA',
  timestamp: new Date('2026-01-02T10:00:00Z'),
  quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0, glareDetected: false, overallScore: 0.8 },
  coverage: 0,
  status: 'analyzed',
  width: 800,
  height: 600,
};

const measurement: Measurement = {
  id: 'm1', type: 'length', value: 6.5, unit: 'm', source: 'manual', scaleSource: 'manual_reference',
  status: 'verified', uncertainty: 2, confidence: 0.9, photoIds: ['ph1'], algorithm: 'manual_entry',
  createdAt: new Date('2026-01-02T10:00:00Z'),
};

describe('escapeHtml', () => {
  it('nevarno vsebino spremeni v besedilo', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a & b "c" \'d\'')).toBe('a &amp; b &quot;c&quot; &#39;d&#39;');
  });
});

describe('buildShareDocument', () => {
  it('vsebuje projekt, meritve, fotografije in predračun', () => {
    const html = buildShareDocument({
      project,
      photos: [photo],
      measurements: [measurement],
      fencePlan: null,
      boardPlan: null,
      estimate: {
        materials: [], labor: { hours: 8, rate: 35, total: 280 },
        subtotal: 280, tax: 61.6, taxRate: 0.22, total: 341.6,
        wastePercent: 7, validMeasurements: 1, invalidMeasurements: 0, warningMeasurements: 0,
      },
      lengthUnit: 'm',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).toContain('341.60 €');
    expect(html).toContain('6.500 m');
    // Nevarno ime projekta je escaped, ne izvedeno.
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('meritve prikaže v izbrani enoti', () => {
    const html = buildShareDocument({
      project,
      photos: [],
      measurements: [measurement],
      lengthUnit: 'cm',
    });
    expect(html).toContain('650.0 cm');
  });

  it('opomba uporabnika je escaped', () => {
    const html = buildShareDocument({
      project,
      photos: [],
      measurements: [],
      note: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('ocena velikosti upošteva fotografije', () => {
    const velike = [{ ...photo, dataUrl: 'x'.repeat(2 * 1024 * 1024) }];
    expect(estimateShareSizeMB(velike)).toBeGreaterThan(1);
    expect(estimateShareSizeMB([])).toBe(0);
  });
});
