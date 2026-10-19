/**
 * Testi pretvorbe in združevanja meritev naprednega merilnika.
 */

import { describe, expect, it } from 'vitest';
import type { Measurement } from '../types';
import {
  OVERLAY_ALGORITHM,
  mergeOverlayMeasurements,
  type OverlayMeasurementSegment
} from '../utils/overlayMeasurements';

const existingMeasurement: Measurement = {
  id: 'manual-1',
  type: 'length',
  value: 4.2,
  unit: 'm',
  source: 'manual',
  scaleSource: 'manual_reference',
  status: 'verified',
  uncertainty: 3,
  confidence: 0.9,
  photoIds: ['photo-1'],
  algorithm: 'pixel_distance',
  createdAt: new Date('2026-10-19T10:00:00Z')
};

const segment: OverlayMeasurementSegment = {
  id: 'seg-1',
  realDistance: 1.8,
  reliability: 0.9,
  warnings: []
};

describe('mergeOverlayMeasurements', () => {
  it('doda meritev z vsemi podatki in ohrani obstoječe meritve', () => {
    const merged = mergeOverlayMeasurements([existingMeasurement], [segment], 'photo-1');

    expect(merged).toHaveLength(2);
    const overlay = merged.find(m => m.algorithm === OVERLAY_ALGORITHM);
    expect(overlay).toMatchObject({
      id: 'overlay-seg-1',
      type: 'length',
      value: 1.8,
      unit: 'm',
      source: 'reference_scale',
      scaleSource: 'manual_reference',
      status: 'verified',
      uncertainty: 3,
      confidence: 0.9,
      photoIds: ['photo-1'],
      algorithm: OVERLAY_ALGORITHM
    });
    expect(overlay?.createdAt).toBeInstanceOf(Date);
    expect(overlay?.verifiedAt).toBeInstanceOf(Date);
  });

  it('ne podvoji iste meritve ob ponovnem dogodku', () => {
    const first = mergeOverlayMeasurements([], [segment], 'photo-1');
    const second = mergeOverlayMeasurements(first, [segment], 'photo-1');

    expect(second).toHaveLength(1);
    expect(second[0].id).toBe('overlay-seg-1');
  });

  it('ob novem segmentu ohrani prejšnje meritve merilnika', () => {
    const first = mergeOverlayMeasurements([], [segment], 'photo-1');
    const second = mergeOverlayMeasurements(
      first,
      [{ ...segment, id: 'seg-2', realDistance: 2.4 }],
      'photo-1'
    );

    expect(second).toHaveLength(2);
    expect(second.map(m => m.value).sort()).toEqual([1.8, 2.4]);
  });

  it('izpusti segmente brez realne razdalje', () => {
    const merged = mergeOverlayMeasurements(
      [existingMeasurement],
      [{ ...segment, realDistance: null }],
      'photo-1'
    );

    expect(merged).toEqual([existingMeasurement]);
  });

  it('označi meritve z opozorili kot warning in brez opozoril z nizko zanesljivostjo kot invalid', () => {
    const withWarning = mergeOverlayMeasurements(
      [],
      [{ ...segment, reliability: 0.8, warnings: ['Referenca je kratka'] }],
      'photo-1'
    )[0];
    expect(withWarning.status).toBe('warning');
    expect(withWarning.uncertainty).toBe(5);
    expect(withWarning.notes).toBe('Referenca je kratka');

    const invalid = mergeOverlayMeasurements(
      [],
      [{ ...segment, reliability: 0.3, warnings: [] }],
      'photo-1'
    )[0];
    expect(invalid.status).toBe('invalid');
    expect(invalid.uncertainty).toBe(20);
    expect(invalid.verifiedAt).toBeUndefined();
  });

  it('ob praznem seznamu počisti samo meritve merilnika', () => {
    const merged = mergeOverlayMeasurements(
      [existingMeasurement],
      [segment],
      'photo-1'
    );
    const cleared = mergeOverlayMeasurements(merged, [], 'photo-1');

    expect(cleared).toEqual([existingMeasurement]);
  });

  it('brez fotografije shrani meritve brez photoIds', () => {
    const merged = mergeOverlayMeasurements([], [segment]);
    expect(merged[0].photoIds).toEqual([]);
  });
});
