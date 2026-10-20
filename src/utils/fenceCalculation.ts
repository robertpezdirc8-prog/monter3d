/**
 * fenceCalculation.ts — FAZA 26
 *
 * **Enoten izračun ograje** za obe konstrukciji:
 *  - `panel` — panelna ograja (paneli + stebri, model rezanja na mero),
 *  - `board` — deskna ograja (deske iz kataloga Roksal + stebri + nosilci).
 *
 * Do sedaj je vsaka pot imela svojo vejo v `App.tsx` (podvojena geometrija, podvojen
 * predračun, različni pogoji za napake). Zdaj je en cev: App pokliče
 * `calculateFenceCalculation()` in dobi enoten rezultat — načrt, materiale, napake in
 * opozorila — ne glede na izbrano konstrukcijo.
 */

import type { FenceConfig, FencePlan, BoardFencePlan, MaterialItem, MaterialPrices } from '../types';
import type { RoksalProfile } from '../data/roksalCatalog';
import { calculateFencePlan, estimateFenceMaterials } from './geometry';
import { buildFenceGeometry } from './fenceGeometry';
import type { FenceSegmentInput } from '../types';
import { buildBoardFencePlan, estimateBoardMaterials } from './boardFence';
import { validateFencePlanAgainstProfile } from './roksalRules';

export interface FenceCalculationInput {
  /** Segmenti ograje (dolžina, azimut, dvig). */
  segments: FenceSegmentInput[];
  /** Konfiguracija (panelne mere, profil, način konstrukcije). */
  config: FenceConfig;
  /** Katalogovni profil (obvezen za deskno konstrukcijo). */
  profile?: RoksalProfile;
  /** Cene materialov. */
  prices: MaterialPrices;
}

export interface FenceCalculationResult {
  constructionType: 'panel' | 'board';
  /** Načrt panelne ograje (null pri deskne). */
  plan: FencePlan | null;
  /** Načrt deskne ograje (null pri panelne). */
  boardPlan: BoardFencePlan | null;
  /** Materialna lista za predračun. */
  materials: MaterialItem[];
  /** Skupna dolžina ograje (m). */
  totalLength: number;
  /** Napake — če niso prazne, predračuna ni. */
  errors: string[];
  /** Opozorila (vidna uporabniku). */
  warnings: string[];
}

/**
 * Izračuna ograjo in materialno listo za izbrano konstrukcijo.
 */
export function calculateFenceCalculation(input: FenceCalculationInput): FenceCalculationResult {
  const { segments, config, profile, prices } = input;
  const constructionType: 'panel' | 'board' = config.constructionType === 'board' ? 'board' : 'panel';

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1) Geometrija (koti, dvigi, povezani segmenti) — skupna za obe konstrukciji.
  const geometry = buildFenceGeometry(segments);
  errors.push(...geometry.errors);
  warnings.push(...geometry.warnings);

  if (errors.length > 0) {
    return {
      constructionType,
      plan: null,
      boardPlan: null,
      materials: [],
      totalLength: 0,
      errors,
      warnings,
    };
  }

  // 2) Deskna konstrukcija — pravila kataloga (deske, stebri, nosilci, ALU cev).
  if (constructionType === 'board') {
    if (!profile) {
      return {
        constructionType,
        plan: null,
        boardPlan: null,
        materials: [],
        totalLength: geometry.totalHorizontalLength,
        errors: ['Za deskno konstrukcijo je treba izbrati Roksal profil.'],
        warnings,
      };
    }

    const board = buildBoardFencePlan({
      profile,
      segments,
      fenceHeight: config.panelHeight,
      boardSpacing: config.boardSpacing,
      orientation: config.orientation,
    });

    errors.push(...board.errors);
    warnings.push(...board.warnings);

    if (errors.length > 0) {
      return {
        constructionType,
        plan: null,
        boardPlan: board,
        materials: [],
        totalLength: board.totalLength,
        errors,
        warnings,
      };
    }

    return {
      constructionType,
      plan: null,
      boardPlan: board,
      materials: estimateBoardMaterials(board, profile, prices),
      totalLength: board.totalLength,
      errors,
      warnings,
    };
  }

  // 3) Panelna konstrukcija — model rezanja panelov na mero.
  const plan = calculateFencePlan(
    geometry.segments.map(s => ({
      startPoint: s.startPoint,
      endPoint: s.endPoint,
      heightChange: s.heightChange,
    })),
    config
  );

  errors.push(...(plan.errors ?? []));
  warnings.push(...(plan.warnings ?? []));

  // 4) Preverjanje proti tehničnim pravilom kataloga (razmak stebrov).
  const ruleCheck = validateFencePlanAgainstProfile(plan, profile, { fenceHeightM: config.panelHeight });
  errors.push(...ruleCheck.errors);
  warnings.push(...ruleCheck.warnings, ...ruleCheck.notes);

  if (errors.length > 0) {
    return {
      constructionType,
      plan: { ...plan, errors, warnings },
      boardPlan: null,
      materials: [],
      totalLength: plan.totalLength,
      errors,
      warnings,
    };
  }

  return {
    constructionType,
    plan: { ...plan, errors, warnings },
    boardPlan: null,
    materials: estimateFenceMaterials(plan, prices),
    totalLength: plan.totalLength,
    errors,
    warnings,
  };
}
