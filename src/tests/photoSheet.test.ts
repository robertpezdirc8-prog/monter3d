/**
 * FAZA 18 (P1) — dokumentacijska lista (kontaktna lista fotografij).
 *
 * Vzorec je prevzet po spletnih orodjih za fotomontažo (Abox Image Layout, PixGrid):
 * mreža z napisi, glava in noga, izvoz v sliko — vse lokalno v brskalniku.
 */
import { describe, it, expect } from 'vitest';
import { buildPhotoSheetLayout, PHOTO_SHEET_PRESETS } from '../utils/photoSheet';
import type { Measurement, Photo } from '../types';

function photo(id: string, minute = 0): Photo {
  return {
    id,
    dataUrl: 'data:image/png;base64,AAAA',
    timestamp: new Date(2026, 0, 15, 10, minute),
    quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0, glareDetected: false, overallScore: 0.8 },
    coverage: 0,
    status: 'analyzed',
    width: 800,
    height: 600,
  };
}

function measurement(photoIds: string[], value = 4.2): Measurement {
  return {
    id: 'm-1', type: 'length', value, unit: 'm', source: 'manual', scaleSource: 'manual_reference',
    status: 'verified', uncertainty: 3, confidence: 0.9, photoIds, algorithm: 'pixel_distance',
    createdAt: new Date(2026, 0, 15, 10, 0),
  };
}

describe('buildPhotoSheetLayout', () => {
  it('izdeluje mrežo celic z glavo in nogo', () => {
    const layout = buildPhotoSheetLayout({
      photos: [photo('a'), photo('b'), photo('c')],
      measurements: [],
      projectName: 'Ograja Novak',
      summary: 'Dolžina 8,40 m',
      columns: 3,
    });

    expect(layout.cells.length).toBe(3);
    expect(layout.title).toBe('Ograja Novak');
    expect(layout.footer).toBe('Dolžina 8,40 m');
    expect(layout.subtitle).toMatch(/3 fotografij/);
    expect(layout.width).toBe(PHOTO_SHEET_PRESETS[0].width);
  });

  it('celice se ne prekrivajo in so znotraj platna', () => {
    const photos = Array.from({ length: 9 }, (_, i) => photo(`p${i}`));
    const layout = buildPhotoSheetLayout({ photos, measurements: [], projectName: 'X', columns: 3 });

    expect(layout.cells.length).toBe(9);
    for (let i = 0; i < layout.cells.length; i++) {
      const a = layout.cells[i];
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width).toBeLessThanOrEqual(layout.width);
      expect(a.y + a.height).toBeLessThanOrEqual(layout.height);

      for (let j = i + 1; j < layout.cells.length; j++) {
        const b = layout.cells[j];
        const prekrivanje =
          a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y;
        expect(prekrivanje).toBe(false);
      }
    }
  });

  it('napis vsebuje meritev in čas posnetka', () => {
    const layout = buildPhotoSheetLayout({
      photos: [photo('a', 5)],
      measurements: [measurement(['a'], 4.2)],
      projectName: 'X',
    });

    expect(layout.cells[0].caption).toContain('4.20 m');
    expect(layout.cells[0].caption).toMatch(/10:05/);
  });

  it('brez meritve je napis samo čas', () => {
    const layout = buildPhotoSheetLayout({
      photos: [photo('a', 7)],
      measurements: [],
      projectName: 'X',
    });
    expect(layout.cells[0].caption).toMatch(/10:07/);
    expect(layout.cells[0].caption).not.toContain('m');
  });

  it('omeji število fotografij na 24 in podpira prednastavitve', () => {
    const photos = Array.from({ length: 30 }, (_, i) => photo(`p${i}`));
    const layout = buildPhotoSheetLayout({ photos, measurements: [], projectName: 'X' });
    expect(layout.cells.length).toBe(24);

    const kvadrat = buildPhotoSheetLayout({
      photos, measurements: [], projectName: 'X', presetId: 'square',
    });
    expect(kvadrat.width).toBe(1600);
    expect(kvadrat.height).toBe(1600);
  });

  it('brez fotografij ne razpade', () => {
    const layout = buildPhotoSheetLayout({ photos: [], measurements: [], projectName: 'X' });
    expect(layout.cells.length).toBe(0);
    expect(layout.columns).toBe(1);
  });

  it('postavitev pred/po poveže posnetke v pare', () => {
    const pred: Photo = { ...photo('before-1'), role: 'before' };
    const po: Photo = { ...photo('after-1'), role: 'after' };
    const drugo: Photo = { ...photo('other-1'), role: 'detail' };

    const layout = buildPhotoSheetLayout({
      photos: [pred, po, drugo],
      measurements: [],
      projectName: 'X',
      layoutKind: 'compare',
    });

    // Le par pred/po — posnetek z vlogo 'detajl' ni v primerjavi.
    expect(layout.cells.length).toBe(2);
    expect(layout.cells[0].photoId).toBe('before-1');
    expect(layout.cells[1].photoId).toBe('after-1');
    expect(layout.cells[0].caption).toMatch(/^pred · /);
    expect(layout.cells[1].caption).toMatch(/^po · /);
    // V isti vrstici, ena druga ob drugi.
    expect(layout.cells[0].y).toBe(layout.cells[1].y);
    expect(layout.cells[0].x).toBeLessThan(layout.cells[1].x);
  });

  it('brez označenih parov pred/po pade nazaj na mrežo', () => {
    const layout = buildPhotoSheetLayout({
      photos: [photo('a'), photo('b')],
      measurements: [],
      projectName: 'X',
      layoutKind: 'compare',
    });
    expect(layout.cells.length).toBe(2);
    expect(layout.columns).toBe(2);
  });
});
