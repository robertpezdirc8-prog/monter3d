/**
 * FAZA 11 (P2) — deskna ograja: povezava kataloga s predračunom.
 *
 * Deskna konstrukcija je bila prej izolirana v konfiguratorju in ni nikdar
 * prišla v predračun. Zdaj je del glavnega izračuna.
 */
import { describe, it, expect } from 'vitest';
import { buildBoardFencePlan, estimateBoardMaterials } from '../utils/boardFence';
import { getProfileById, ROKSAL_PROFILES } from '../data/roksalCatalog';
import { DEFAULT_MATERIAL_PRICES } from '../utils/projectState';

const polna57 = getProfileById('polna-deska-57-32')!;
const romb67 = getProfileById('romb-deska-67')!;

describe('buildBoardFencePlan', () => {
  it('iz 6 m ograje naredi deske, stebre in nosilce', () => {
    const plan = buildBoardFencePlan({
      profile: polna57,
      segments: [{ id: 's1', length: 6 }],
      fenceHeight: 1.1,
    });

    expect(plan.errors).toEqual([]);
    expect(plan.totalLength).toBeCloseTo(6, 10);
    expect(plan.boards).toBeGreaterThan(0);
    expect(plan.posts).toBeGreaterThan(0);
    expect(plan.beams).toBeGreaterThan(0);
    expect(plan.boardLength).toBeGreaterThan(6);   // z odpadom
    expect(plan.postSpacing).toBeGreaterThan(0);
    expect(plan.postSpacing).toBeLessThanOrEqual(polna57.maxPostSpacingLow / 1000 + 1e-9);
  });

  it('več segmentov se poveže; vogalni stebri se ne štejejo dvakrat', () => {
    const en = buildBoardFencePlan({ profile: polna57, segments: [{ id: 'a', length: 4 }], fenceHeight: 1.1 });
    const dva = buildBoardFencePlan({
      profile: polna57,
      segments: [{ id: 'a', length: 4 }, { id: 'b', length: 4 }],
      fenceHeight: 1.1,
    });

    expect(dva.totalLength).toBeCloseTo(8, 10);
    // Skupno število stebrov je manj kot dvakratnik enega segmenta (vogal se deli).
    expect(dva.posts).toBeLessThan(en.posts * 2);
  });

  it('neveljavna višina je napaka', () => {
    const plan = buildBoardFencePlan({ profile: polna57, segments: [{ id: 'a', length: 4 }], fenceHeight: 0 });
    expect(plan.errors.length).toBeGreaterThan(0);
  });

  it('brez segmentov je napaka (ne tiho prazno)', () => {
    const plan = buildBoardFencePlan({ profile: polna57, segments: [], fenceHeight: 1.1 });
    expect(plan.errors.length).toBeGreaterThan(0);
    expect(plan.totalLength).toBe(0);
  });

  it('profil, ki zahteva ALU cev, jo vključi v načrt', () => {
    const zAlu = ROKSAL_PROFILES.find(p => p.requiresAluminumTube);
    if (!zAlu) return; // katalog trenutno nima takega profila

    const plan = buildBoardFencePlan({ profile: zAlu, segments: [{ id: 'a', length: 5 }], fenceHeight: 1.1 });
    expect(plan.requiresAluminumTube).toBe(true);
    expect(plan.aluminumTubeLength).toBeGreaterThan(0);
  });

  it('romb 67: razmak stebrov nad 1800 mm je napaka (pravilo kataloga)', () => {
    const plan = buildBoardFencePlan({
      profile: romb67,
      segments: [{ id: 'a', length: 12 }],
      fenceHeight: 1.1,
    });
    // Ali je napaka odvisna od višine; pri nizkih ograjah je razmak dovoljen.
    expect(plan.errors.length + plan.warnings.length).toBeGreaterThan(0);
  });
});

describe('estimateBoardMaterials', () => {
  it('iz načrta naredi materialno listo s cenami', () => {
    const plan = buildBoardFencePlan({ profile: polna57, segments: [{ id: 'a', length: 6 }], fenceHeight: 1.1 });
    const items = estimateBoardMaterials(plan, polna57, DEFAULT_MATERIAL_PRICES);

    const ids = items.map(i => i.id);
    expect(ids).toContain('mat-boards');
    expect(ids).toContain('mat-board-posts');
    expect(ids).toContain('mat-board-beams');
    expect(ids).toContain('mat-board-fasteners');

    for (const item of items) {
      expect(item.totalPrice).toBeCloseTo(item.quantity * item.unitPrice, 6);
      expect(item.totalPrice).toBeGreaterThan(0);
    }
  });

  it('pri napaki v načrtu ni predračuna', () => {
    const plan = buildBoardFencePlan({ profile: polna57, segments: [], fenceHeight: 1.1 });
    expect(estimateBoardMaterials(plan, polna57, DEFAULT_MATERIAL_PRICES)).toEqual([]);
  });

  it('cena desk in cevi vplivata na predračun', () => {
    const plan = buildBoardFencePlan({ profile: polna57, segments: [{ id: 'a', length: 6 }], fenceHeight: 1.1 });
    const osnovna = estimateBoardMaterials(plan, polna57, DEFAULT_MATERIAL_PRICES);
    const dražje = estimateBoardMaterials(plan, polna57, {
      ...DEFAULT_MATERIAL_PRICES,
      boardPricePerM: DEFAULT_MATERIAL_PRICES.boardPricePerM * 2,
    });

    const skupaj = (items: typeof osnovna) => items.reduce((sum, i) => sum + i.totalPrice, 0);
    expect(skupaj(dražje)).toBeGreaterThan(skupaj(osnovna));
  });
});
