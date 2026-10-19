/**
 * roksalRules.ts — FAZA 8 (P2)
 *
 * Povezuje NAČRT ograje s tehničnimi pravili kataloga Roksal.
 *
 * Do sedaj sta obstajala dva ločena modela: `geometry.calculateFencePlan`
 * (panelna ograja: paneli + stebri) in `fenceConstruction` (deskna ograja: deske
 * z razmakom). Uporabnik je lahko dobil predračun, ki je kršil proizvajalčeve
 * limite (npr. razmak stebrov nad dovoljenim).
 *
 * Tu nastajajo PREVERJANJA, ki jih uporabi predračun: če načrt krši pravila,
 * predračuna ni (enako kot pri drugih napakah v načrtu).
 */

import type { FencePlan } from '../types';
import type { RoksalProfile } from '../data/roksalCatalog';

export interface RuleCheckResult {
  errors: string[];
  warnings: string[];
  notes: string[];
}

/** Višina, nad katero velja strožji razmak stebrov (mm -> m). */
const HIGH_FENCE_THRESHOLD_M = 1.5;

/**
 * Preveri načrt ograje proti pravilom izbranega Roksal profila.
 *
 * @param plan načrt ograje (paneli + stebri)
 * @param profile izbrani katalogovni profil (ali undefined, če ni izbran)
 * @param options fenceHeightM višina ograje v metrih
 */
export function validateFencePlanAgainstProfile(
  plan: FencePlan,
  profile: RoksalProfile | undefined,
  options: { fenceHeightM: number }
): RuleCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  if (!profile) {
    return {
      errors,
      warnings: ['Profil ni izbran — tehnična pravila (razmak stebrov) niso preverjena.'],
      notes,
    };
  }

  const heightM = isFinite(options.fenceHeightM) && options.fenceHeightM > 0
    ? options.fenceHeightM
    : plan.panelHeight;
  const limitMm = heightM > HIGH_FENCE_THRESHOLD_M
    ? profile.maxPostSpacingHigh
    : profile.maxPostSpacingLow;

  if (!isFinite(limitMm) || limitMm <= 0) {
    notes.push(`Profil ${profile.name} nima podatka o maksimalnem razmaku stebrov.`);
    return { errors, warnings, notes };
  }

  for (const seg of plan.segments) {
    // Načrt že vsebuje točen razmik med sredinami stebrov (panel + steber).
    const spacingM = isFinite(seg.postSpacing) && seg.postSpacing > 0
      ? seg.postSpacing
      : (isFinite(seg.length) && seg.numPosts > 1 ? seg.length / (seg.numPosts - 1) : NaN);
    if (!isFinite(spacingM) || spacingM <= 0) continue;

    const spacingMm = spacingM * 1000;

    if (spacingMm > limitMm + 1e-6) {
      errors.push(
        `Segment ${seg.id}: razmak stebrov ${spacingMm.toFixed(0)} mm presega maksimalni ` +
        `dovoljeni razmak ${limitMm} mm (profil ${profile.name}, ` +
        `${heightM > HIGH_FENCE_THRESHOLD_M ? 'ograja nad 150 cm' : 'ograja do 150 cm'}). ` +
        `Dodajte vmesni steber ali skrajšajte razpon.`
      );
    } else if (spacingMm > limitMm * 0.9) {
      warnings.push(
        `Segment ${seg.id}: razmak stebrov ${spacingMm.toFixed(0)} mm je blizu meje ` +
        `${limitMm} mm (profil ${profile.name}).`
      );
    }
  }

  // ALU cev: profil, ki zahteva cev, potrebuja dodaten material.
  if (profile.requiresAluminumTube) {
    notes.push(`Profil ${profile.name} zahteva aluminijasto cev — dodaj jo v materiale.`);
  }

  for (const note of profile.technicalNotes ?? []) {
    notes.push(`${profile.name}: ${note}`);
  }

  return { errors, warnings, notes };
}
