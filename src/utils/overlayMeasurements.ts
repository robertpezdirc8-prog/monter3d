/**
 * Pretvorba meritev naprednega merilnika (MeasurementOverlay) v model projekta.
 *
 * Merilnik pošlje segmente, ki še niso zapisani v projekt. Tu jih pretvorimo
 * v običajne meritve in jih varno združimo z obstoječimi meritvami, ne da bi
 * prepisali meritve iz drugih korakov.
 */

import type { Measurement, MeasurementStatus } from '../types';

export const OVERLAY_ALGORITHM = 'measurement_overlay';

/** Minimalna oblika segmenta, ki jo potrebujemo iz merilnika. */
export interface OverlayMeasurementSegment {
  id: string;
  realDistance: number | null;
  reliability: number;
  warnings: string[];
}

function overlayMeasurementId(segmentId: string): string {
  return `overlay-${segmentId}`;
}

function uncertaintyForReliability(reliability: number): number {
  if (reliability >= 0.85) return 3;
  if (reliability >= 0.7) return 5;
  if (reliability >= 0.5) return 10;
  return 20;
}

function statusForReliability(
  reliability: number,
  warnings: string[]
): MeasurementStatus {
  if (reliability >= 0.7 && warnings.length === 0) return 'verified';
  if (reliability >= 0.4) return 'warning';
  return 'invalid';
}

function createOverlayMeasurement(
  segment: OverlayMeasurementSegment,
  photoId?: string
): Measurement | null {
  if (segment.realDistance === null) return null;

  const status = statusForReliability(segment.reliability, segment.warnings);
  const createdAt = new Date();

  return {
    id: overlayMeasurementId(segment.id),
    type: 'length',
    value: segment.realDistance,
    unit: 'm',
    source: 'reference_scale',
    scaleSource: 'manual_reference',
    status,
    uncertainty: uncertaintyForReliability(segment.reliability),
    confidence: segment.reliability,
    photoIds: photoId ? [photoId] : [],
    algorithm: OVERLAY_ALGORITHM,
    notes: segment.warnings.length > 0 ? segment.warnings.join('; ') : undefined,
    createdAt,
    verifiedAt: status === 'verified' ? createdAt : undefined
  };
}

/**
 * Združi meritve merilnika z obstoječimi meritvami.
 *
 * - meritve drugih korakov ostanejo nedotaknjene,
 * - meritve merilnika se posodobijo/dodajo po stabilnem id,
 * - prazen seznam segmentov počisti samo meritve merilnika (gumb »Počisti«).
 */
export function mergeOverlayMeasurements(
  existing: Measurement[],
  segments: OverlayMeasurementSegment[],
  photoId?: string
): Measurement[] {
  const otherMeasurements = existing.filter(
    measurement => measurement.algorithm !== OVERLAY_ALGORITHM
  );

  if (segments.length === 0) return otherMeasurements;

  const byId = new Map<string, Measurement>();
  for (const measurement of existing) {
    if (measurement.algorithm === OVERLAY_ALGORITHM) {
      byId.set(measurement.id, measurement);
    }
  }

  for (const segment of segments) {
    const measurement = createOverlayMeasurement(segment, photoId);
    if (!measurement) continue;
    if (!byId.has(measurement.id)) {
      byId.set(measurement.id, measurement);
    }
  }

  return [...otherMeasurements, ...byId.values()];
}
