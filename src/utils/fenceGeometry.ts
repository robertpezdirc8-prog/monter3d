/**
 * fenceGeometry.ts — FAZA 8 (P1)
 *
 * Sestava segmentov ograje iz posameznih dolžinskih meritev.
 *
 * Prej so se vse meritve preprosto zlepile v eno premico (heightChange = 0),
 * zato je bilo mogoče narisati samo ravno ograjo — L-oblike, kote in višinske
 * razlike ne. Zdaj vsaka meritev nosi svoj SMER (azimut) in morebitno višinsko
 * razliko, od tod pa se sestavijo povezani segmenti.
 *
 * Modul je čist (brez React), zato ga je mogoče neposredno testirati.
 */

import type { FenceSegmentInput } from '../types';

export interface FenceSegmentGeometry {
  id: string;
  startPoint: [number, number];
  endPoint: [number, number];
  heightChange: number;
  /** Dolžina vodoravne projekcije. */
  horizontalLength: number;
  /** Fizična dolžina (vključno z dvigom). */
  length: number;
  /** Naklon v stopinjah. */
  slope: number;
  bearingDeg: number;
}

export interface FenceGeometryResult {
  segments: FenceSegmentGeometry[];
  /** Skupna vodoravna dolžina (m). */
  totalHorizontalLength: number;
  /** Skupna fizična dolžina po terenu (m). */
  totalLength: number;
  /** Neto višinska razlika (m). */
  totalHeightChange: number;
  /** Opozorila (npr. sklenjena ograja, prekoračeni kot). */
  warnings: string[];
  /** Napake (npr. neveljavna dolžina). */
  errors: string[];
}

const DEG2RAD = Math.PI / 180;

/** Normalizira azimut na interval [0, 360). */
export function normalizeBearing(deg: number): number {
  if (!isFinite(deg)) return 0;
  return ((deg % 360) + 360) % 360;
}

/**
 * Sestavi povezane segmente iz dolžinskih meritev.
 *
 * @param inputs meritve z dolžino in (neobveznim) azimutom
 * @param options.startPoint začetna točka (privzeto [0, 0])
 * @param options.startHeight začetna višina (m)
 * @param options.closeTolerance tolerance za zaznavo sklenjene ograje (m)
 */
export function buildFenceGeometry(
  inputs: FenceSegmentInput[],
  options: { startPoint?: [number, number]; startHeight?: number; closeTolerance?: number } = {}
): FenceGeometryResult {
  const startPoint = options.startPoint ?? [0, 0];
  const startHeight = options.startHeight ?? 0;
  const closeTolerance = options.closeTolerance ?? 0.25;

  const segments: FenceSegmentGeometry[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  let cx = startPoint[0];
  let cy = startPoint[1];
  let ch = startHeight;
  let totalHorizontalLength = 0;
  let totalLength = 0;
  let totalHeightChange = 0;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (!input || !isFinite(input.length) || input.length <= 0) {
      errors.push(`Segment ${i + 1}: neveljavna dolžina (${String(input?.length)}).`);
      continue;
    }

    const bearing = normalizeBearing(input.bearingDeg ?? 0);
    const heightChange = isFinite(input.heightChange ?? 0) ? (input.heightChange ?? 0) : 0;
    const rad = bearing * DEG2RAD;
    const dx = Math.cos(rad) * input.length;
    const dy = Math.sin(rad) * input.length;

    const start: [number, number] = [cx, cy];
    const end: [number, number] = [cx + dx, cy + dy];
    const physicalLength = Math.sqrt(input.length * input.length + heightChange * heightChange);
    const slope = Math.atan2(heightChange, input.length) * 180 / Math.PI;

    segments.push({
      id: input.id,
      startPoint: start,
      endPoint: end,
      heightChange,
      horizontalLength: input.length,
      length: physicalLength,
      slope,
      bearingDeg: bearing,
    });

    cx = end[0];
    cy = end[1];
    ch += heightChange;
    totalHorizontalLength += input.length;
    totalLength += physicalLength;
    totalHeightChange += heightChange;
  }

  // Sklenjena ograja: začetna in končna točka sta skoraj enaki.
  if (segments.length > 2) {
    const first = segments[0].startPoint;
    const last = segments[segments.length - 1].endPoint;
    const dist = Math.hypot(last[0] - first[0], last[1] - first[1]);
    if (dist <= closeTolerance) {
      warnings.push(`Ograja je sklenjena (odklon konca od začetka ${dist.toFixed(2)} m).`);
    }
  }

  if (Math.abs(ch) > 0.01) {
    warnings.push(`Končna višina se od začetne razlikuje za ${ch.toFixed(2)} m.`);
  }

  return {
    segments,
    totalHorizontalLength,
    totalLength,
    totalHeightChange,
    warnings,
    errors,
  };
}

/**
 * Privzeto zaporedje azimutov: ravna ograja (vsi azimuti 0°).
 * Uporablja se, ko uporabnik še ni določil smeri posameznih segmentov.
 */
export function straightBearings(count: number): number[] {
  return new Array(Math.max(0, count)).fill(0);
}
