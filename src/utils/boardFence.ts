/**
 * boardFence.ts — FAZA 11 (P2)
 *
 * Deskna ograja: izdelava iz profilov kataloga (deske + stebri + letve + ALU cev).
 *
 * Do sedaj je bila deskna konstrukcija izolirana v `fenceConstruction.ts` in
 * uporabljena le v konfiguratorju — izračun ni nikdar prišel v predračun.
 * Panelna ograja (`geometry.ts`) je bila edina, ki je šla v predračun. Ta modul
 * oba modela povezuje: isti katalogovni profil, ista pravila, ista cena.
 *
 * Enote: modul deluje v milimetrih (kot katalog), a rezultate vrne v metrih,
 * da se ujemajo s panelnim modelom in meritvami uporabnika.
 */

import type { RoksalProfile } from '../data/roksalCatalog';
import { calculateFenceConstruction } from './fenceConstruction';
import type { MaterialItem, MaterialPrices, BoardFencePlan } from '../types';

/** Segment deskne ograje (dolžina v metrih). */
export interface BoardFenceSegmentInput {
  id: string;
  length: number;
  bearingDeg?: number;
  heightChange?: number;
}

export interface BoardFenceInput {
  profile: RoksalProfile;
  segments: BoardFenceSegmentInput[];
  /** Višina ograje (m). */
  fenceHeight: number;
  /** Razmik med deskami (mm) — privzeto priporočen razmik profila. */
  boardSpacing?: number;
  /** Delež odpada za deske (privzeto 5 %). */
  wastePercent?: number;
}

/**
 * Sestavi načrt deskne ograje iz katalogovnega profila in segmentov.
 * Uporablja `calculateFenceConstruction` (vir pravil), da je logika na enem mestu.
 */
export function buildBoardFencePlan(input: BoardFenceInput): BoardFencePlan {
  const { profile, segments, fenceHeight } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  const valid = segments.filter(s => isFinite(s.length) && s.length > 0);
  const prazno = (): BoardFencePlan => ({
    constructionType: 'board',
    profileId: profile.id,
    profileName: profile.name,
    totalLength: 0,
    fenceHeight,
    boards: 0, posts: 0, beams: 0,
    boardLength: 0, postSpacing: 0, beamSpacing: 0,
    requiresAluminumTube: profile.requiresAluminumTube,
    aluminumTubeLength: 0,
    errors: ['Ni veljavnih segmentov — prazna ograja.'],
    warnings,
  });

  if (valid.length === 0) return prazno();
  if (!isFinite(fenceHeight) || fenceHeight <= 0) {
    errors.push(`Neveljavna višina ograje: ${fenceHeight} m.`);
  }

  const totalLength = valid.reduce((sum, s) => sum + s.length, 0);
  const heightMm = fenceHeight * 1000;
  const boardSpacing = input.boardSpacing ?? profile.recommendedBoardSpacing;

  let boards = 0;
  let posts = 0;
  let beams = 0;
  let boardLength = 0;
  let postSpacing = 0;
  let beamSpacing = 0;
  let aluminumTubeLength = 0;

  for (const seg of valid) {
    const result = calculateFenceConstruction({
      profile,
      orientation: profile.orientation === 'horizontal' ? 'horizontal' : 'vertical',
      fenceHeight: heightMm,
      fenceLength: seg.length * 1000,
      boardSpacing,
    });

    if (!result.valid) {
      errors.push(...result.errors.map(e => `Segment ${seg.id}: ${e}`));
      continue;
    }
    warnings.push(...result.warnings.map(w => `Segment ${seg.id}: ${w}`));

    boards += result.totalBoardLength / profile.width;   // število desk
    boardLength += result.totalBoardLength / 1000;      // m desk
    posts += result.numberOfPosts;
    beams += result.numberOfBeams;
    postSpacing = result.actualPostSpacing / 1000;
    beamSpacing = result.beamSpacing / 1000;
    if (result.requiresAluminumTube) {
      aluminumTubeLength += seg.length;
    }
  }

  boards = Math.ceil(boards);
  // Vagalni stebri se med segmenti delijo — odštejemo vse razen enega.
  posts = Math.max(1, posts - (valid.length - 1));

  const waste = (input.wastePercent ?? 5) / 100;
  const boardsWithWaste = Math.ceil(boards * (1 + waste));
  const boardLengthWithWaste = boardLength * (1 + waste);

  return {
    constructionType: 'board',
    profileId: profile.id,
    profileName: profile.name,
    totalLength,
    fenceHeight,
    boards: boardsWithWaste,
    posts,
    beams,
    boardLength: boardLengthWithWaste,
    postSpacing,
    beamSpacing,
    requiresAluminumTube: profile.requiresAluminumTube,
    aluminumTubeLength,
    errors,
    warnings,
  };
}

/**
 * Materialna lista za deskno ograjo (EUR) — iste cene uporablja panelna konstrukcija.
 */
export function estimateBoardMaterials(
  plan: BoardFencePlan,
  profile: RoksalProfile,
  prices: MaterialPrices
): MaterialItem[] {
  if (plan.errors.length > 0) return [];

  const items: MaterialItem[] = [];
  const profileLengthM = profile.length / 1000;

  // Deske: prodajajo se v profilih dolžine `profile.length`.
  const profilesNeeded = profileLengthM > 0 ? Math.ceil(plan.boardLength / profileLengthM) : 0;
  items.push({
    id: 'mat-boards',
    name: `Deske ${profile.name}`,
    category: 'boards',
    quantity: profilesNeeded,
    unit: 'kos',
    unitPrice: profileLengthM * prices.boardPricePerM,
    totalPrice: profilesNeeded * profileLengthM * prices.boardPricePerM,
    notes: `${plan.boards} desk, dolžina materiala ${plan.boardLength.toFixed(2)} m`,
  });

  // Stebri
  items.push({
    id: 'mat-board-posts',
    name: 'Stebri',
    category: 'posts',
    quantity: plan.posts,
    unit: 'kos',
    unitPrice: prices.postPriceEach,
    totalPrice: plan.posts * prices.postPriceEach,
    notes: `Razmik ${(plan.postSpacing * 1000).toFixed(0)} mm`,
  });

  // Vodoravni nosilci (letve)
  const beamMeters = Math.max(0, Math.ceil(plan.beamSpacing * plan.beams * 100) / 100);
  items.push({
    id: 'mat-board-beams',
    name: 'Letve (vodoravni nosilci)',
    category: 'rails',
    quantity: beamMeters,
    unit: 'm',
    unitPrice: prices.railPricePerM,
    totalPrice: beamMeters * prices.railPricePerM,
    notes: `${plan.beams} nosilcev, razmik ${(plan.beamSpacing * 1000).toFixed(0)} mm`,
  });

  // ALU cev (če jo profil zahteva)
  if (plan.requiresAluminumTube && plan.aluminumTubeLength > 0) {
    const tubeMeters = Math.ceil(plan.aluminumTubeLength * 10) / 10;
    items.push({
      id: 'mat-alu-tube',
      name: 'Aluminijasta cev',
      category: 'tube',
      quantity: tubeMeters,
      unit: 'm',
      unitPrice: prices.aluTubePricePerM,
      totalPrice: tubeMeters * prices.aluTubePricePerM,
      notes: `Profil ${profile.name} zahteva ALU cev`,
    });
  }

  // Pritrdilni elementi
  const fasteners = Math.ceil(plan.boards * 2 + plan.posts * 4);
  items.push({
    id: 'mat-board-fasteners',
    name: 'Pritrdilni elementi',
    category: 'fasteners',
    quantity: fasteners,
    unit: 'kos',
    unitPrice: prices.fastenerPriceEach,
    totalPrice: fasteners * prices.fastenerPriceEach,
    notes: 'Vijaki in nosilci',
  });

  return items;
}
