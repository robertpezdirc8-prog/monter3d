/**
 * FAZA 7 (P0) — regresijski testi za kritične popravke:
 *  1. referenčna (kalibracijska) meritev NE sme postati del dolžine ograje,
 *  2. celotno stanje projekta (meritve, načrti, predračun, nastavitve) se shrani
 *     in obnovi iz IndexedDB,
 *  3. brisanje projekta pobriše tudi njegove fotografije (brez sirot).
 */
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { isFenceLengthMeasurement, selectFenceLengthMeasurements, calculateFencePlan } from '../utils/geometry';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  snapshotProjectState,
  applySnapshotToProject,
  stateSignature,
  emptySnapshot,
} from '../utils/projectState';
import { saveProject, getProject, savePhoto, getPhotosByProject, deleteProject, deletePhotosByProject, loadProjectWithPhotos } from '../utils/storage';
import { createBackup, parseBackup, restoreBackup } from '../utils/backup';
import type { Project, Photo, Measurement, CostEstimate } from '../types';

const CONFIG = {
  panelWidth: 1.8,
  panelHeight: 1.5,
  postWidth: 0.06,
  maxGap: 0.15,
  mountingStyle: 'level' as const,
  slopeThreshold: 5,
};

function mkMeasurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: `m-${Math.random().toString(36).slice(2)}`,
    type: 'length',
    value: 5,
    unit: 'm',
    source: 'manual',
    scaleSource: 'manual_reference',
    status: 'verified',
    uncertainty: 3,
    confidence: 0.85,
    photoIds: [],
    algorithm: 'pixel_distance',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const referenceMeasurement = (value = 2) => mkMeasurement({
  value,
  source: 'reference_scale',
  isScaleReference: true,
  algorithm: 'reference_calibration',
  calibration: { method: 'manual_reference', referenceLength: value, pixelToMeterRatio: 0.005 },
});

function mkProject(id: string, overrides: Partial<Project> = {}): Project {
  return {
    id,
    name: `Projekt ${id}`,
    objectType: 'fence',
    createdAt: new Date('2026-02-01T10:00:00Z'),
    updatedAt: new Date('2026-02-01T10:00:00Z'),
    photos: [],
    measurements: [],
    materials: {
      productLine: 'Roksal Standard',
      color: 'Antracit',
      finish: 'Prašno barvan',
      panelMaterial: 'Aluminij',
      postMaterial: 'Aluminij',
      fastenerType: 'A2 inox',
    },
    status: 'capture',
    ...overrides,
  };
}

const mkPhoto = (id: string, projectId: string): Photo & { projectId: string } => ({
  id,
  projectId,
  dataUrl: 'data:image/png;base64,AAAA',
  timestamp: new Date('2026-02-02T08:00:00Z'),
  quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0.1, glareDetected: false, overallScore: 0.7 },
  coverage: 0,
  status: 'accepted',
  width: 100,
  height: 80,
});

describe('FAZA 7/P0 — referenčna meritev ni del objekta', () => {
  it('kalibracijska meritev (2 m trak) se NE šteje v dolžino ograje', () => {
    const measurements = [
      referenceMeasurement(2),
      mkMeasurement({ value: 5 }),
      mkMeasurement({ value: 3 }),
    ];

    expect(selectFenceLengthMeasurements(measurements).map(m => m.value)).toEqual([5, 3]);

    // Pred popravkom je 2 m referenca postala tretji segment: 10 m namesto 8 m.
    const lengths = selectFenceLengthMeasurements(measurements).map(m => m.value);
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    expect(totalLength).toBe(8);

    let x = 0;
    const segments = lengths.map(len => {
      const seg = { startPoint: [x, 0] as [number, number], endPoint: [x + len, 0] as [number, number], heightChange: 0 };
      x += len;
      return seg;
    });
    const plan = calculateFencePlan(segments, CONFIG);
    expect(plan.totalLength).toBeCloseTo(8, 10);
    expect(plan.errors).toBeUndefined();
  });

  it('stari zapisi (brez isScaleReference) se prav tako izločijo po algoritmu', () => {
    const legacy = mkMeasurement({
      value: 1.5,
      source: 'manual',
      algorithm: 'reference_calibration',
    });
    expect(isFenceLengthMeasurement(legacy)).toBe(false);
  });

  it('izloči neveljavne, nemetrične in nekalibrirane meritve', () => {
    expect(isFenceLengthMeasurement(mkMeasurement({ status: 'warning' }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ status: 'invalid' }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ unit: 'px' }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ scaleSource: 'unknown' }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ scaleSource: 'demo' }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ scaleSource: 'normalized' }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ value: 0 }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ value: -3 }))).toBe(false);
    expect(isFenceLengthMeasurement(mkMeasurement({ value: NaN }))).toBe(false);
  });

  it('veljavna ročna meritev ostane uporabna', () => {
    expect(isFenceLengthMeasurement(mkMeasurement({ value: 4.2 }))).toBe(true);
  });
});

describe('FAZA 7/P0 — celotno stanje projekta se shrani in obnovi', () => {
  const estimate: CostEstimate = {
    materials: [
      { id: 'mat-panels', name: 'Paneli', category: 'panels', quantity: 3, unit: 'kos', unitPrice: 100, totalPrice: 300 },
    ],
    labor: { hours: 8, rate: 35, total: 280 },
    subtotal: 580,
    tax: 127.6,
    taxRate: 0.22,
    total: 707.6,
    wastePercent: 7,
    validMeasurements: 2,
    invalidMeasurements: 0,
    warningMeasurements: 0,
  };

  it('round-trip: meritve, načrti, predračun in nastavitve preživijo IndexedDB', async () => {
    const project = mkProject('proj-state', {
      measurements: [mkMeasurement({ value: 4 }), referenceMeasurement(2)],
      settings: normalizeSettings({
        pixelToMeter: 0.004,
        fenceConfig: { ...CONFIG, maxGap: 0.2 },
        stairsConfig: { numSteps: 12, totalRise: 2.4, totalRun: 3.6, handrailHeight: 1 },
        laborRate: 40,
        laborHours: 10,
        taxRate: 22,
        capturedSteps: ['ograja_fronta'],
      }),
    });

    const snapshot = snapshotProjectState(project);
    snapshot.estimate = estimate;

    const updated = applySnapshotToProject(project, snapshot);
    await saveProject(updated);
    const loaded = await getProject('proj-state');

    expect(loaded).not.toBeNull();
    const loadedSnapshot = snapshotProjectState(loaded!);

    expect(loadedSnapshot.measurements.length).toBe(2);
    expect(loadedSnapshot.settings.pixelToMeter).toBeCloseTo(0.004, 12);
    expect(loadedSnapshot.settings.fenceConfig.maxGap).toBeCloseTo(0.2, 12);
    expect(loadedSnapshot.settings.stairsConfig.numSteps).toBe(12);
    expect(loadedSnapshot.settings.laborRate).toBe(40);
    expect(loadedSnapshot.settings.capturedSteps).toEqual(['ograja_fronta']);
    expect(loadedSnapshot.estimate?.total).toBeCloseTo(707.6, 9);
    // Podpis stanja mora biti po ponovnem nalaganju enak (brez lažnih sprememb).
    expect(stateSignature(loadedSnapshot)).toBe(stateSignature(snapshot));
  });

  it('podpis zazna spremembo stanja (meritev, načrt, predračun)', () => {
    const base = emptySnapshot();
    const sig = stateSignature(base);

    expect(stateSignature({ ...base, measurements: [mkMeasurement()] })).not.toBe(sig);
    expect(stateSignature({ ...base, estimate })).not.toBe(sig);
    expect(stateSignature({
      ...base,
      settings: { ...base.settings, laborRate: base.settings.laborRate + 1 },
    })).not.toBe(sig);
    expect(stateSignature(emptySnapshot())).toBe(sig);
  });

  it('stari projekti brez settings dobijo varne privzetke', () => {
    const loaded = snapshotProjectState(mkProject('proj-old'));
    expect(loaded.settings).toEqual(normalizeSettings(DEFAULT_SETTINGS));
    expect(loaded.settings.pixelToMeter).toBeNull();
    expect(loaded.measurements).toEqual([]);
    expect(loaded.estimate).toBeNull();
  });

  it('normalizeSettings popravi poškodovane vrednosti', () => {
    const fixed = normalizeSettings({
      pixelToMeter: Number.NaN,
      fenceConfig: { panelWidth: -1, panelHeight: 0, postWidth: 0.06, maxGap: -5, mountingStyle: 'nonsense' as never, slopeThreshold: 5 },
      stairsConfig: { numSteps: 0, totalRise: -2, totalRun: 0, handrailHeight: 0 },
      laborRate: Number.POSITIVE_INFINITY,
      laborHours: -4,
      taxRate: Number.NaN,
      capturedSteps: ['a', 5 as never, null as never],
    });

    expect(fixed.pixelToMeter).toBeNull();
    expect(fixed.fenceConfig.panelWidth).toBe(DEFAULT_SETTINGS.fenceConfig.panelWidth);
    expect(fixed.fenceConfig.panelHeight).toBe(DEFAULT_SETTINGS.fenceConfig.panelHeight);
    expect(fixed.fenceConfig.maxGap).toBe(DEFAULT_SETTINGS.fenceConfig.maxGap);
    expect(fixed.fenceConfig.mountingStyle).toBe(DEFAULT_SETTINGS.fenceConfig.mountingStyle);
    expect(fixed.stairsConfig.numSteps).toBe(DEFAULT_SETTINGS.stairsConfig.numSteps);
    expect(fixed.stairsConfig.totalRise).toBe(DEFAULT_SETTINGS.stairsConfig.totalRise);
    expect(fixed.laborRate).toBe(DEFAULT_SETTINGS.laborRate);
    expect(fixed.laborHours).toBe(DEFAULT_SETTINGS.laborHours);
    expect(fixed.taxRate).toBe(DEFAULT_SETTINGS.taxRate);
    expect(fixed.capturedSteps).toEqual(['a']);
  });
});

describe('FAZA 7/P0 — fotografije samo v svoji shrambi, brisanje brez sirot', () => {
  it('projekt ne vsebuje več kopije fotografij (brez podvajanja)', async () => {
    await saveProject(mkProject('proj-nodup'));
    await savePhoto(mkPhoto('nodup-1', 'proj-nodup'));
    await savePhoto(mkPhoto('nodup-2', 'proj-nodup'));

    const loaded = await getProject('proj-nodup');
    expect(loaded!.photos).toEqual([]);
    expect((await getPhotosByProject('proj-nodup')).length).toBe(2);
  });

  it('deletePhotosByProject pobriše samo fotografije izbranega projekta', async () => {
    await saveProject(mkProject('proj-a'));
    await saveProject(mkProject('proj-b'));
    await savePhoto(mkPhoto('a-1', 'proj-a'));
    await savePhoto(mkPhoto('a-2', 'proj-a'));
    await savePhoto(mkPhoto('b-1', 'proj-b'));

    const deleted = await deletePhotosByProject('proj-a');
    expect(deleted).toBe(2);
    expect((await getPhotosByProject('proj-a')).length).toBe(0);
    expect((await getPhotosByProject('proj-b')).length).toBe(1);
  });

  it('izbrisan projekt ne pusti fotografij-sirot', async () => {
    await saveProject(mkProject('proj-del'));
    await savePhoto(mkPhoto('del-1', 'proj-del'));

    await deletePhotosByProject('proj-del');
    await deleteProject('proj-del');

    expect(await getProject('proj-del')).toBeNull();
    expect((await getPhotosByProject('proj-del')).length).toBe(0);
  });
});

describe('FAZA 7/P0 — migracija starih projektov (fotografije v projektu)', () => {
  it('stare vgrajene fotografije se preselijo v shrambo in počistijo iz projekta', async () => {
    const legacy = mkProject('proj-legacy', {
      photos: [
        { ...mkPhoto('legacy-1', 'proj-legacy') } as Photo,
        { ...mkPhoto('legacy-2', 'proj-legacy') } as Photo,
      ],
    });
    // projekt v stari obliki je imel fotografije tudi v samem zapisu
    delete (legacy.photos[0] as Photo & { projectId?: string }).projectId;
    delete (legacy.photos[1] as Photo & { projectId?: string }).projectId;
    await saveProject(legacy);

    const loaded = await loadProjectWithPhotos(legacy);

    expect(loaded.photos.length).toBe(2);
    expect(loaded.project.photos).toEqual([]);
    expect((await getPhotosByProject('proj-legacy')).length).toBe(2);

    // Shranjeni projekt je očiščen, da se slike ne bi zapisovale dvakrat.
    const stored = await getProject('proj-legacy');
    expect(stored!.photos).toEqual([]);
  });

  it('če so fotografije že v shrambi, se ne podvojijo', async () => {
    const project = mkProject('proj-both', {
      photos: [{ ...mkPhoto('both-legacy', 'proj-both') } as Photo],
    });
    await saveProject(project);
    await savePhoto(mkPhoto('both-store', 'proj-both'));

    const loaded = await loadProjectWithPhotos(project);

    expect(loaded.photos.length).toBe(1);
    expect(loaded.photos[0].id).toBe('both-store');
    expect(loaded.project.photos).toEqual([]);
    expect((await getPhotosByProject('proj-both')).length).toBe(1);
  });

  it('projekt brez vgrajenih fotografij se ne spreminja', async () => {
    const project = mkProject('proj-plain');
    await saveProject(project);
    await savePhoto(mkPhoto('plain-1', 'proj-plain'));

    const loaded = await loadProjectWithPhotos(project);

    expect(loaded.project).toBe(project);
    expect(loaded.photos.map(p => p.id)).toEqual(['plain-1']);
  });
});

describe('FAZA 7/P0 — varnostna kopija in obnova projekta', () => {
  it('kopija vsebuje fotografije, meritve in se pravilno razčleni', () => {
    const project = mkProject('proj-backup', { measurements: [mkMeasurement({ value: 6 })] });
    const photos: Photo[] = [mkPhoto('bk-1', 'proj-backup'), mkPhoto('bk-2', 'proj-backup')];

    const json = createBackup(project, photos);
    const parsed = parseBackup(json);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.backup.photos.length).toBe(2);
    expect(parsed.backup.photos[0].dataUrl).toBe('data:image/png;base64,AAAA');
    expect(parsed.backup.project.name).toBe('Projekt proj-backup');
    expect(parsed.backup.project.measurements.length).toBe(1);
  });

  it('zavrne neveljavne ali tuje datoteke', () => {
    expect(parseBackup('{ni json').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'drugo', version: 1, project: {}, photos: [] })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'mera3d-pro', version: 99, project: {}, photos: [] })).ok).toBe(false);
    // manjka id projekta
    expect(parseBackup(JSON.stringify({ app: 'mera3d-pro', version: 1, project: { name: 'x' }, photos: [] })).ok).toBe(false);
  });

  it('obnova ustvari nov projekt s fotografijami in meritvami', async () => {
    const project = mkProject('proj-backup2', { measurements: [mkMeasurement({ value: 6 })] });
    const photos: Photo[] = [mkPhoto('bk2-1', 'proj-backup2')];

    const result = await restoreBackup(createBackup(project, photos));

    expect(result.photoCount).toBe(1);
    expect(result.projectId).not.toBe('proj-backup2');

    const restored = await getProject(result.projectId);
    expect(restored).not.toBeNull();
    expect(restored!.name).toBe('Projekt proj-backup2');
    expect(restored!.measurements.length).toBe(1);

    const restoredPhotos = await getPhotosByProject(result.projectId);
    expect(restoredPhotos.length).toBe(1);
    expect(restoredPhotos[0].dataUrl).toBe('data:image/png;base64,AAAA');
  });
});
