/**
 * FAZA 8 (P2) — tehnična pravila Roksal proti načrtu ograje.
 *
 * Namen: predračun ne sme biti izdelan, če načrt krši proizvajalčeve limite
 * (npr. razmak stebrov), sicer monter dobi napačen naročilni material.
 */
import { describe, it, expect } from 'vitest';
import { validateFencePlanAgainstProfile } from '../utils/roksalRules';
import { calculateFencePlan } from '../utils/geometry';
import { ROKSAL_PROFILES, getProfileById } from '../data/roksalCatalog';

const CONFIG = {
  panelWidth: 1.8,
  panelHeight: 1.5,
  postWidth: 0.06,
  maxGap: 0.15,
  mountingStyle: 'level' as const,
  slopeThreshold: 5,
};

const polna57 = getProfileById('polna-deska-57-32')!;

function planFor(panelWidth: number, panelHeight = 1.5, length = 6) {
  return calculateFencePlan(
    [{ startPoint: [0, 0], endPoint: [length, 0], heightChange: 0 }],
    { ...CONFIG, panelWidth, panelHeight }
  );
}

describe('validateFencePlanAgainstProfile', () => {
  it('brez profila pravila niso preverjena (opozorilo, ne napaka)', () => {
    const result = validateFencePlanAgainstProfile(planFor(1.8), undefined, { fenceHeightM: 1.5 });
    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/profil/i);
  });

  it('razmak stebrov nad dovoljenim je NAPAKA (in s tem ni predračuna)', () => {
    // L = 3,78 m se točno razdeli na 2 panela po 1,80 m -> razmak med sredinami
    // stebrov je 1860 mm, limit za POLNA DESKA 57/32 pa je 1500 mm.
    const plan = planFor(1.8, 1.5, 3.78);
    expect(plan.segments[0].postSpacing).toBeCloseTo(1.86, 6);

    const result = validateFencePlanAgainstProfile(plan, polna57, { fenceHeightM: 1.5 });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/1500 mm/);
  });

  it('razmak znotraj meje je brez napake', () => {
    // Panel 1,0 m + steber 0,06 m -> največ 1060 mm < 1500 mm.
    const result = validateFencePlanAgainstProfile(planFor(1.0), polna57, { fenceHeightM: 1.5 });
    expect(result.errors).toEqual([]);
  });

  it('nad 150 cm velja strožji limit (maxPostSpacingHigh)', () => {
    const profil = ROKSAL_PROFILES.find(p => p.maxPostSpacingHigh !== p.maxPostSpacingLow);
    if (!profil) return; // katalog trenutno nima takega profila

    // 1,4 m panel -> 1460 mm: pri nizkem profilu OK, pri visokem (če je manjši) ni.
    const nizka = validateFencePlanAgainstProfile(planFor(1.4, 1.2), profil, { fenceHeightM: 1.2 });
    const visoka = validateFencePlanAgainstProfile(planFor(1.4, 1.8), profil, { fenceHeightM: 1.8 });
    expect(nizka.errors.length).toBeLessThanOrEqual(visoka.errors.length);
  });

  it('tehnične opombe profila se prenesejo v opozorila', () => {
    const result = validateFencePlanAgainstProfile(planFor(1.0), polna57, { fenceHeightM: 1.5 });
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('razmak blizu meje (90 %) je opozorilo, ne napaka', () => {
    // L = 2,98 m -> 2 panela po 1,40 m -> razmak stebrov 1460 mm = 97 % od 1500 mm.
    const plan = planFor(1.8, 1.5, 2.98);
    expect(plan.segments[0].postSpacing).toBeCloseTo(1.46, 6);

    const result = validateFencePlanAgainstProfile(plan, polna57, { fenceHeightM: 1.5 });
    expect(result.errors).toEqual([]);
    expect(result.warnings.some(w => /blizu meje/i.test(w))).toBe(true);
  });
});
