/**
 * FAZA 1 — ciljni regresijski testi.
 * Vsak test pokriva konkreten popravek; testi za panele in datume so bili
 * preverjeni tudi proti STARI implementaciji (pred popravkom odpovejo).
 */
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { calculateFencePlan, calculateStairsPlan, estimateFenceMaterials } from '../utils/geometry';
import { saveProject, getProject, savePhoto, getPhotosByProject } from '../utils/storage';
import type { Project, Photo } from '../types';

const CONFIG = {
  panelWidth: 1.8,
  panelHeight: 1.5,
  postWidth: 0.06,
  maxGap: 0.15,
  mountingStyle: 'level' as const,
  slopeThreshold: 5,
};

const seg = (x0: number, y0: number, x1: number, y1: number, dh = 0) => ({
  startPoint: [x0, y0] as [number, number],
  endPoint: [x1, y1] as [number, number],
  heightChange: dh,
});

describe('calculateFencePlan — model panelov (rezanje na mero)', () => {
  it('robni primer 2,5 m / panel 1,8 m / steber 0,06 m: NE sme nastati panel 2,38 m', () => {
    // Stara implementacija (Math.round(idealN)=round(1.344)=1) je dala N=1 in dejansko
    // sirino (2.5 - 2*0.06)/1 = 2.38 m — tiho nad dimenzijo profila 1.8 m.
    // Novo: ceil -> N=2 razpona, 3 stebri; preostanek se enakomerno porazdeli med
    // VSE razpone: vsak panel = (2.5 - 3*0.06)/2 = 1.16 m <= nominalna 1.8 m.
    const plan = calculateFencePlan([seg(0, 0, 2.5, 0)], CONFIG);
    expect(plan.errors).toBeUndefined();
    expect(plan.segments[0].numPanels).toBe(2);
    expect(plan.segments[0].numPosts).toBe(3);
    // Dejanska sirina = (2.5 - 3*0.06)/2 = 1.16 m (enakomerno krajšani rezani paneli)
    expect(plan.segments[0].panelWidth).toBeCloseTo(1.16, 10);
    expect(plan.segments[0].nominalPanelWidth).toBe(1.8);
    // Identiteta modela velja TOČNO:
    const s = plan.segments[0];
    expect(s.numPanels * s.panelWidth + s.numPosts * CONFIG.postWidth).toBeCloseTo(2.5, 10);
    // In DEJANSKA sirina nikoli ne preseze nominalne (brez tihega raztezanja nad profil):
    expect(s.panelWidth).toBeLessThanOrEqual(CONFIG.panelWidth + 1e-9);
    // Ker 1,16 < nominalna - maxGap, mora biti uporabnik obveščen o krajšanem panelu:
    expect(plan.warnings?.some(w => /1\.16/.test(w))).toBe(true);
  });

  it('natančno izmenjan razpored (L točno ustreza modelu): brez odrezanega panela', () => {
    // L = 2*1.8 + 3*0.06 = 3.78 -> idealN = 2 točno -> width = 1.8 brez opozoril
    const plan = calculateFencePlan([seg(0, 0, 3.78, 0)], CONFIG);
    const s = plan.segments[0];
    expect(s.numPanels).toBe(2);
    expect(s.panelWidth).toBeCloseTo(1.8, 10);
    expect(plan.warnings).toBeUndefined();
  });

  it('dalj segment 5,5 m: ustrezno stevilo panelov in točen izracun razmikov', () => {
    const plan = calculateFencePlan([seg(0, 0, 5.5, 0)], CONFIG);
    const s = plan.segments[0];
    // idealN = (5.5-0.06)/1.86 = 2.9245 -> ceil = 3
    expect(s.numPanels).toBe(3);
    expect(s.numPosts).toBe(4);
    expect(s.panelWidth).toBeCloseTo((5.5 - 4 * 0.06) / 3, 10);
    // identiteta modela: N*panel + (N+1)*post = L
    expect(s.numPanels * s.panelWidth + s.numPosts * CONFIG.postWidth).toBeCloseTo(5.5, 10);
    expect(s.postSpacing).toBeCloseTo(s.panelWidth + CONFIG.postWidth, 10);
  });

  it('kratki segment 1,0 m: vsaj 1 panel, dejanska sirina pod nominalno (rezan panel)', () => {
    const plan = calculateFencePlan([seg(0, 0, 1.0, 0)], CONFIG);
    const s = plan.segments[0];
    expect(s.numPanels).toBe(1);
    expect(s.panelWidth).toBeCloseTo(1.0 - 2 * 0.06, 10); // 0.88 m
    expect(s.panelWidth).toBeLessThan(CONFIG.panelWidth);
  });

  it('panel pod nominalno z vec kot maxGap -> OPOZORILO o rezanem panelu', () => {
    // Pri modelu ceil N dejanska sirina nikoli ne preseze nominalne (brez tihega
    // raztezanja nad profil); obratni robni primer (veliko odstopanje navzdol)
    // mora biti jasno opozorilo monterju, ne tiho sprejet.
    const tight = { ...CONFIG, maxGap: 0 };
    const okPlan = calculateFencePlan([seg(0, 0, 3.73, 0)], tight); // width 1.775 < 1.8, a cezelj doseze nominalno? idealN=1.973->ceil2, odstopanje 0.025 > 0
    expect(okPlan.errors).toBeUndefined();
    const warnPlan = calculateFencePlan([seg(0, 0, 1.0, 0)], tight); // width 0.88, odstopanje 0.92 > maxGap 0
    expect(warnPlan.warnings?.some(w => w.includes('odrezan'))).toBe(true);
  });

  it('neveljavne koordinate (NaN) -> strukturirana napaka, prazen nacrt brez NaN', () => {
    const plan = calculateFencePlan(
      [{ startPoint: [NaN, 0], endPoint: [2, 0], heightChange: 0 }, seg(0, 0, 2, 0)],
      CONFIG
    );
    expect(plan.errors).toBeDefined();
    expect(plan.errors!.length).toBeGreaterThan(0);
    expect(plan.errors![0]).toContain('neveljavne koordinate');
    // veljavni segment je vseeno obdelan, a nacrt je oznacen z napako
    expect(Number.isFinite(plan.totalLength)).toBe(true);
  });

  it('nicelna dolzina segmenta -> opozorilo in izpust, ne deljenje z niclo', () => {
    const plan = calculateFencePlan([seg(0, 0, 0, 0), seg(0, 0, 3, 0)], CONFIG);
    expect(plan.warnings?.some(w => w.includes('ničelna dolžina'))).toBe(true);
    expect(plan.segments.length).toBe(1);
  });

  it('negativna sirina panela v konfiguraciji -> napaka, nikoli lazno veljaven nacrt', () => {
    const plan = calculateFencePlan([seg(0, 0, 3, 0)], { ...CONFIG, panelWidth: -1 });
    expect(plan.errors).toBeDefined();
    expect(plan.totalPanels).toBe(0);
    expect(plan.segments.length).toBe(0);
  });

  it('prazen seznam segmentov -> napaka "prazen načrt"', () => {
    const plan = calculateFencePlan([], CONFIG);
    expect(plan.errors).toBeDefined();
    expect(plan.errors![0]).toContain('prazen');
  });

  it('povezani segmenti: vogalni steber steje SAMO ENKRAT', () => {
    // L-oblika: (0,0)->(4,0)->(4,3) skupna tocka (4,0) je deljen vogalni steber
    const plan = calculateFencePlan([seg(0, 0, 4, 0), seg(4, 0, 4, 3)], CONFIG);
    expect(plan.segments.length).toBe(2);
    const raw = plan.segments.reduce((s, x) => s + x.numPosts, 0);
    expect(plan.sharedCornerPosts).toBe(1);
    expect(plan.totalPosts).toBe(raw - 1);
    // fasteners uporabijo poravnano stevilo
    expect(plan.totalFasteners).toBe(plan.totalPanels * 4 + plan.totalPosts * 2);
  });

  it('nepovezani segmenti: vogalni steber NE steje skupnega stebra', () => {
    const plan = calculateFencePlan([seg(0, 0, 4, 0), seg(10, 0, 10, 3)], CONFIG);
    expect(plan.sharedCornerPosts).toBe(0);
    expect(plan.totalPosts).toBe(plan.segments.reduce((s, x) => s + x.numPosts, 0));
  });

  it('naklon: fizicna dolzina po naklonu > horizontalna (raked)', () => {
    const plan = calculateFencePlan([seg(0, 0, 4, 0, 1.5)], { ...CONFIG, mountingStyle: 'stepped' });
    const s = plan.segments[0];
    expect(s.length).toBeCloseTo(Math.sqrt(16 + 2.25), 10);
    expect(s.slope).toBeCloseTo(Math.atan2(1.5, 4) * 180 / Math.PI, 10);
    // paneli se razporejajo po HORIZONTALNI projekciji
    expect(s.numPanels * s.panelWidth + s.numPosts * CONFIG.postWidth).toBeCloseTo(4, 10);
  });
});

describe('estimateFenceMaterials — skladnost z načrtom in enote cen', () => {
  const prices = { panelPricePerM2: 85, postPriceEach: 45, railPricePerM: 12, fastenerPriceEach: 0.5, endCapPriceEach: 8 };

  it('iz nacrta z NAPAKO ne nastane predračun (prazna lista)', () => {
    const badPlan = calculateFencePlan([{ startPoint: [NaN, 0], endPoint: [2, 0], heightChange: 0 }], CONFIG);
    expect(badPlan.errors).toBeDefined();
    expect(estimateFenceMaterials(badPlan, prices)).toEqual([]);
  });

  it('enota panelPricePerM2 = EUR/m²: enotska cena kosa = cena/m² × širina × višina', () => {
    const plan = calculateFencePlan([seg(0, 0, 5.5, 0)], CONFIG);
    const items = estimateFenceMaterials(plan, prices);
    const panels = items.find(i => i.category === 'panels')!;
    expect(panels.unitPrice).toBeCloseTo(85 * CONFIG.panelWidth * CONFIG.panelHeight, 6);
    expect(panels.quantity).toBe(Math.ceil(plan.totalPanels * 1.07));
  });

  it('količina stebrov ujema z načrtom (brez dvojnega vogalnega štetja) + odpad', () => {
    const plan = calculateFencePlan([seg(0, 0, 4, 0), seg(4, 0, 4, 3)], CONFIG);
    const items = estimateFenceMaterials(plan, prices);
    const posts = items.find(i => i.category === 'posts')!;
    expect(posts.quantity).toBe(Math.ceil(plan.totalPosts * 1.07));
    // ce bi racunalnik dvojno stejal vogal, bi bilo vec:
    const doubled = plan.segments.reduce((s, x) => s + x.numPosts, 0);
    expect(plan.totalPosts).toBeLessThan(doubled);
  });

  it('letve: EUR/tekm × skupna fizicna dolzina segmentov × 2 (+7%)', () => {
    const plan = calculateFencePlan([seg(0, 0, 4, 0)], CONFIG);
    const items = estimateFenceMaterials(plan, prices);
    const rails = items.find(i => i.category === 'rails')!;
    expect(rails.unitPrice).toBe(12);
    expect(rails.quantity).toBeCloseTo(Math.ceil(4 * 2 * 1.07 * 10) / 10, 6);
  });
});

describe('calculateStairsPlan — validacija in robni primeri', () => {
  it('numSteps=0 / NaN / negative -> napaka', () => {
    expect(() => calculateStairsPlan(0, 2, 4)).toThrow(/Neveljavno/);
    expect(() => calculateStairsPlan(NaN, 2, 4)).toThrow(/Neveljavno/);
    expect(() => calculateStairsPlan(2.5, 2, 4)).toThrow(/Neveljavno/); // ne-celo stevilo
  });
  it('totalRun<=0 ali NaN -> napaka', () => {
    expect(() => calculateStairsPlan(10, 2, 0)).toThrow(/Neveljavna/);
    expect(() => calculateStairsPlan(10, NaN, 4)).toThrow(/Neveljavna/);
  });
  it('Blumovo pravilo: opozorilo pri slabem razmerju, brez opozorila pri udobnem', () => {
    const bad = calculateStairsPlan(10, 2.5, 2.0); // r=25cm g=20cm -> 2r+g=70cm
    expect(bad.warnings!.length).toBeGreaterThan(0);
    const good = calculateStairsPlan(10, 1.7, 3.0); // r=17, g=30 -> 64cm
    expect(good.warnings ?? []).not.toContainEqual(expect.stringContaining('Blum'));
    expect(good.warnings ?? []).toEqual(expect.not.arrayContaining([expect.stringContaining('Neudobne')]));
  });
  it('handrailHeight validacija', () => {
    // nizka ograja -> opozorilo; neveljavna -> napaka (glej implementacijo)
    const low = calculateStairsPlan(10, 1.7, 3.0, 0.7);
    expect(low.warnings?.some(w => /0\.9|90/.test(w))).toBe(true);
  });
});

describe('storage — shranjevanje, ponovno nalaganje in obnovitev datumov', () => {
  const mkProject = (id: string, createdAt: Date): Project => ({
    id, name: `P ${id}`, objectType: 'fence',
    createdAt, updatedAt: createdAt,
    photos: [], measurements: [], materials: {} as Project['materials'],
    status: 'capture',
  });

  it('Date objekt prezivi IndexedDB round-trip kot INSTANCEOF Date (ne prazen objekt)', async () => {
    const created = new Date('2026-03-05T14:48:00Z');
    await saveProject(mkProject('proj-date', created));
    const loaded = await getProject('proj-date');
    expect(loaded).not.toBeNull();
    // Ključna trditev: to JE Date, ne {} niti niz
    expect(loaded!.createdAt instanceof Date).toBe(true);
    expect(isNaN(loaded!.createdAt.getTime())).toBe(false);
    expect(loaded!.createdAt.getTime()).toBe(created.getTime());
    // App.tsx poteka: toLocaleDateString() mora delovati
    expect(typeof loaded!.createdAt.toLocaleDateString('sl-SI')).toBe('string');
  });

  it('ISO niz (npr. po JSON uvozu) se obnovi v Date', async () => {
    const p = mkProject('proj-iso', new Date());
    const jsonRound = JSON.parse(JSON.stringify(p)) as unknown as Project; // createdAt -> string
    expect(typeof (jsonRound as unknown as { createdAt: unknown }).createdAt).toBe('string');
    await saveProject(jsonRound);
    const loaded = await getProject('proj-iso');
    expect(loaded!.createdAt instanceof Date).toBe(true);
  });

  it('fotografije: timestamp in povezava s projektom preživita round-trip', async () => {
    await saveProject(mkProject('proj-photo', new Date('2026-01-01T00:00:00Z')));
    const photo: Photo & { projectId: string } = {
      id: 'photo-1', projectId: 'proj-photo', dataUrl: 'data:image/png;base64,AAA',
      timestamp: new Date('2026-01-02T10:20:30Z'),
      quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0.1, glareDetected: false, overallScore: 0.7 },
      coverage: 0, status: 'accepted', width: 100, height: 80,
    };
    await savePhoto(photo);
    const photos = await getPhotosByProject('proj-photo');
    expect(photos.length).toBe(1);
    expect(photos[0].timestamp instanceof Date).toBe(true);
    expect(photos[0].timestamp.getTime()).toBe(photo.timestamp.getTime());
    expect(photos[0].dataUrl).toBe(photo.dataUrl);
  });

  it('neveljaven datumski niz ne ustvari InvalidDate objekta', async () => {
    const broken = mkProject('proj-broken', new Date()) as unknown as Record<string, unknown>;
    broken.createdAt = '2026-13-45T99:99:99Z'; // nesmiseln ISO
    await saveProject(broken as unknown as Project);
    const loaded = await getProject('proj-broken');
    // polje naj ostane niz (ali pa veljaven Date), nikoli InvalidDate z {} obliko
    const v = (loaded as unknown as { createdAt: unknown }).createdAt;
    if (v instanceof Date) expect(isNaN(v.getTime())).toBe(false);
    else expect(typeof v).toBe('string');
  });
});
