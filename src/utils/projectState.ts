/**
 * projectState.ts — FAZA 7 (P0)
 *
 * Združuje celotno stanje projekta (meritve, načrti, predračun, nastavitve) v en
 * objekt, ki se shrani v IndexedDB skupaj s projektom. Brez tega so se ob
 * osvežitvi strani izgubile vse meritve, načrti in predračun.
 *
 * Modul je namenoma brez React odvisnosti, da ga je mogoče neposredno testirati.
 */

import type {
  Project,
  ProjectSettings,
  Measurement,
  FencePlan,
  BoardFencePlan,
  StairsPlan,
  CostEstimate,
  FenceConfig,
  StairsConfig,
  MaterialPrices,
} from '../types';

export interface ProjectStateSnapshot {
  measurements: Measurement[];
  fencePlan: FencePlan | null;
  /** FAZA 11: načrt deskne ograje. */
  boardPlan: BoardFencePlan | null;
  stairsPlan: StairsPlan | null;
  estimate: CostEstimate | null;
  settings: ProjectSettings;
}

export const DEFAULT_FENCE_CONFIG: FenceConfig = {
  panelWidth: 1.8,
  panelHeight: 1.5,
  postWidth: 0.06,
  maxGap: 0.12,
  mountingStyle: 'stepped',
  slopeThreshold: 5,
};

export const DEFAULT_STAIRS_CONFIG: StairsConfig = {
  numSteps: 5,
  totalRise: 1.2,
  totalRun: 2.5,
  handrailHeight: 0.9,
};

export const DEFAULT_MATERIAL_PRICES: MaterialPrices = {
  panelPricePerM2: 85,
  postPriceEach: 45,
  railPricePerM: 12,
  fastenerPriceEach: 0.5,
  endCapPriceEach: 8,
  boardPricePerM: 35,
  aluTubePricePerM: 8,
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  pixelToMeter: null,
  fenceConfig: DEFAULT_FENCE_CONFIG,
  stairsConfig: DEFAULT_STAIRS_CONFIG,
  laborRate: 35,
  laborHours: 8,
  taxRate: 22,
  capturedSteps: [],
  fenceSegments: [],
  materialPrices: DEFAULT_MATERIAL_PRICES,
};

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const positive = (value: unknown, fallback: number): number => {
  const n = num(value, fallback);
  return n > 0 ? n : fallback;
};

/** Dovoli 0 (npr. 0 ur dela), zavrne negativne in nekončne vrednosti. */
const nonNegative = (value: unknown, fallback: number): number => {
  const n = num(value, fallback);
  return n >= 0 ? n : fallback;
};

/** Varno razčleni (tudi stare ali poškodovane) shranjene nastavitve. */
export function normalizeSettings(raw?: Partial<ProjectSettings> | null): ProjectSettings {
  const fence = (raw?.fenceConfig ?? {}) as Partial<FenceConfig>;
  const stairs = (raw?.stairsConfig ?? {}) as Partial<StairsConfig>;

  const mountingStyle =
    fence.mountingStyle === 'level' || fence.mountingStyle === 'stepped' || fence.mountingStyle === 'mixed'
      ? fence.mountingStyle
      : DEFAULT_FENCE_CONFIG.mountingStyle;

  const pixelToMeterRaw = raw?.pixelToMeter;
  const pixelToMeter =
    typeof pixelToMeterRaw === 'number' && Number.isFinite(pixelToMeterRaw) && pixelToMeterRaw > 0
      ? pixelToMeterRaw
      : null;

  const maxGap = num(fence.maxGap, DEFAULT_FENCE_CONFIG.maxGap);

  return {
    pixelToMeter,
    fenceConfig: {
      panelWidth: positive(fence.panelWidth, DEFAULT_FENCE_CONFIG.panelWidth),
      panelHeight: positive(fence.panelHeight, DEFAULT_FENCE_CONFIG.panelHeight),
      postWidth: positive(fence.postWidth, DEFAULT_FENCE_CONFIG.postWidth),
      maxGap: maxGap >= 0 ? maxGap : DEFAULT_FENCE_CONFIG.maxGap,
      mountingStyle,
      slopeThreshold: num(fence.slopeThreshold, DEFAULT_FENCE_CONFIG.slopeThreshold),
      ...(typeof fence.profileId === 'string' && fence.profileId ? { profileId: fence.profileId } : {}),
      ...(fence.constructionType === 'board' || fence.constructionType === 'panel'
        ? { constructionType: fence.constructionType }
        : {}),
      ...(isFinite(fence.boardSpacing as number) && (fence.boardSpacing as number) > 0
        ? { boardSpacing: fence.boardSpacing as number }
        : {}),
    },
    stairsConfig: {
      numSteps: Math.max(1, Math.round(positive(stairs.numSteps, DEFAULT_STAIRS_CONFIG.numSteps))),
      totalRise: positive(stairs.totalRise, DEFAULT_STAIRS_CONFIG.totalRise),
      totalRun: positive(stairs.totalRun, DEFAULT_STAIRS_CONFIG.totalRun),
      handrailHeight: positive(stairs.handrailHeight, DEFAULT_STAIRS_CONFIG.handrailHeight),
    },
    laborRate: nonNegative(raw?.laborRate, DEFAULT_SETTINGS.laborRate),
    laborHours: nonNegative(raw?.laborHours, DEFAULT_SETTINGS.laborHours),
    taxRate: nonNegative(raw?.taxRate, DEFAULT_SETTINGS.taxRate),
    capturedSteps: Array.isArray(raw?.capturedSteps)
      ? raw!.capturedSteps!.filter((s): s is string => typeof s === 'string')
      : [],
    fenceSegments: Array.isArray(raw?.fenceSegments)
      ? raw!.fenceSegments!
          .filter(s => s && typeof s.id === 'string' && isFinite(s.length) && s.length > 0)
          .map(s => ({
            id: s.id,
            length: s.length,
            bearingDeg: isFinite(s.bearingDeg as number) ? (s.bearingDeg as number) : 0,
            heightChange: isFinite(s.heightChange as number) ? (s.heightChange as number) : 0,
          }))
      : [],
    materialPrices: {
      panelPricePerM2: nonNegative(raw?.materialPrices?.panelPricePerM2, DEFAULT_MATERIAL_PRICES.panelPricePerM2),
      postPriceEach: nonNegative(raw?.materialPrices?.postPriceEach, DEFAULT_MATERIAL_PRICES.postPriceEach),
      railPricePerM: nonNegative(raw?.materialPrices?.railPricePerM, DEFAULT_MATERIAL_PRICES.railPricePerM),
      fastenerPriceEach: nonNegative(raw?.materialPrices?.fastenerPriceEach, DEFAULT_MATERIAL_PRICES.fastenerPriceEach),
      endCapPriceEach: nonNegative(raw?.materialPrices?.endCapPriceEach, DEFAULT_MATERIAL_PRICES.endCapPriceEach),
      boardPricePerM: nonNegative(raw?.materialPrices?.boardPricePerM, DEFAULT_MATERIAL_PRICES.boardPricePerM),
      aluTubePricePerM: nonNegative(raw?.materialPrices?.aluTubePricePerM, DEFAULT_MATERIAL_PRICES.aluTubePricePerM),
    },
  };
}

/** Preberi celotno shranjeno stanje iz projekta (s privzetiki za stare zapise). */
export function snapshotProjectState(project: Project): ProjectStateSnapshot {
  return {
    measurements: Array.isArray(project.measurements) ? project.measurements : [],
    fencePlan: project.fencePlan ?? null,
    boardPlan: project.boardPlan ?? null,
    stairsPlan: project.stairsPlan ?? null,
    estimate: project.estimate ?? null,
    settings: normalizeSettings(project.settings),
  };
}

/** Zapiši stanje nazaj v projekt (brez spreminjanja fotografij in metapodatkov). */
export function applySnapshotToProject(project: Project, snapshot: ProjectStateSnapshot): Project {
  return {
    ...project,
    measurements: snapshot.measurements,
    fencePlan: snapshot.fencePlan ?? undefined,
    boardPlan: snapshot.boardPlan ?? undefined,
    stairsPlan: snapshot.stairsPlan ?? undefined,
    estimate: snapshot.estimate ?? undefined,
    settings: snapshot.settings,
    updatedAt: new Date(),
  };
}

/** Stabilen podpis stanja — za zaznavanje sprememb brez pisanja v IndexedDB. */
export function stateSignature(snapshot: ProjectStateSnapshot): string {
  return JSON.stringify({
    measurements: snapshot.measurements,
    fencePlan: snapshot.fencePlan,
    stairsPlan: snapshot.stairsPlan,
    estimate: snapshot.estimate,
    settings: snapshot.settings,
  });
}

/** Prazen (privzet) snapshot za nov projekt. */
export function emptySnapshot(): ProjectStateSnapshot {
  return {
    measurements: [],
    fencePlan: null,
    boardPlan: null,
    stairsPlan: null,
    estimate: null,
    settings: normalizeSettings(DEFAULT_SETTINGS),
  };
}
