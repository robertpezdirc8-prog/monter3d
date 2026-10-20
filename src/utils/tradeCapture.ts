/**
 * tradeCapture.ts — FAZA 10 (P2)
 *
 * Pomožne funkcije za voden zajem po obrti:
 *  - prevod kakovosti kadra v enotno oceno slike (ImageQuality),
 *  - priprava projekta, v katerega se shranijo posnetki,
 *  - odločitev, v kateri projekt se zajem nadaljuje.
 *
 * Do sedaj so bili posnetki samo v pomnilniku komponente — ob zaprtju zaslona
 * so bili izgubljeni. Zdaj se vsak posnetek shrani v shrambo fotografij projekta.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Project, Photo, ImageQuality, ObjectType } from '../types';
import type { FrameStats, TradeId } from './cameraSDK';

/** Pretvori statistiko kadra v enotno oceno kakovosti slike. */
export function frameStatsToImageQuality(stats: FrameStats): ImageQuality {
  const sharpness = Math.max(0, Math.min(1, stats.sharpness / 200));
  const brightness = Math.max(0, Math.min(1, stats.meanBrightness / 255));
  const contrast = Math.max(0, Math.min(1, 1 - stats.darkRatio));
  const blurScore = stats.sharpness < 60 ? 1 : 0;
  const glareDetected = stats.quality === 'too_bright';

  const overallScore =
    stats.quality === 'good' ? 0.9 :
    stats.quality === 'blurry' ? 0.35 :
    stats.quality === 'too_dark' ? 0.3 :
    0.4; // too_bright

  return {
    sharpness,
    brightness,
    contrast,
    blurScore,
    glareDetected,
    overallScore,
  };
}

/** Status posnetka glede na oceno kakovosti. */
export function photoStatusForQuality(quality: ImageQuality): Photo['status'] {
  if (quality.overallScore > 0.4) return 'analyzed';
  return 'rejected';
}

/** Naredi nov projekt za obrtni zajem (uporablja se, kadar ni aktivnega projekta). */
export function createTradeProject(trade: TradeId, tradeName: string, objectType: ObjectType = 'fence'): Project {
  const now = new Date();
  const datum = now.toLocaleDateString('sl-SI');
  return {
    id: uuidv4(),
    name: `${tradeName} – ${datum}`,
    objectType,
    createdAt: now,
    updatedAt: now,
    photos: [],
    measurements: [],
    materials: {
      productLine: 'Roksal Standard',
      color: 'Antracit RAL 7016',
      finish: 'Prašno barvan',
      panelMaterial: 'Aluminij',
      postMaterial: 'Aluminij',
      fastenerType: 'A2 inox',
    },
    status: 'capture',
  };
}

/**
 * Odloči, v kateri projekt se zajem nadaljuje:
 *  - obstoječ aktiven projekt (če je v seznamu),
 *  - sicer prvi projekt v seznamu,
 *  - sicer nov projekt za obrt.
 */
export function resolveTradeProject(
  projects: Project[],
  currentProjectId: string | null,
  trade: TradeId,
  tradeName: string
): { project: Project; isNew: boolean } {
  const current = currentProjectId ? projects.find(p => p.id === currentProjectId) : undefined;
  if (current) return { project: current, isNew: false };
  if (projects.length > 0) return { project: projects[0], isNew: false };
  return { project: createTradeProject(trade, tradeName), isNew: true };
}
