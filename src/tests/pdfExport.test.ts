// @vitest-environment jsdom
/**
 * FAZA 20 (P1) — PDF poročilo za stranko vsebuje tudi fotografije (in skice).
 *
 * Vzorec iz CompanyCam: stranka dobi dokumentacijo dela, ne le številk.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generatePDFReport } from '../utils/pdfExport';
import type { Measurement, Photo, Project } from '../types';

function mkProject(photos: Photo[]): Project {
  return {
    id: 'p1',
    name: 'Ograja Novak',
    objectType: 'fence',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    photos,
    measurements: [],
    materials: {
      productLine: 'Roksal Standard', color: 'Antracit', finish: 'Prašno barvan',
      panelMaterial: 'Aluminij', postMaterial: 'Aluminij', fastenerType: 'A2 inox',
    },
    status: 'complete',
  };
}

function mkPhoto(id: string, annotation?: Photo['annotation']): Photo {
  return {
    id,
    dataUrl: `data:image/png;base64,${id}`,
    timestamp: new Date('2026-01-02T10:30:00Z'),
    quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0, glareDetected: false, overallScore: 0.8 },
    coverage: 0,
    status: 'analyzed',
    width: 800,
    height: 600,
    annotation,
  };
}

const measurement: Measurement = {
  id: 'm1', type: 'length', value: 4.2, unit: 'm', source: 'manual', scaleSource: 'manual_reference',
  status: 'verified', uncertainty: 3, confidence: 0.9, photoIds: ['ph-1'], algorithm: 'pixel_distance',
  createdAt: new Date('2026-01-02T10:30:00Z'),
};

/** Zajame HTML, ki ga poročilo zapiše v tiskalno okno. */
function captureReportHtml(): { html: () => string } {
  let written = '';
  const fakeWindow = {
    document: {
      write: (html: string) => { written += html; },
      close: vi.fn(),
    },
    focus: vi.fn(),
    print: vi.fn(),
  };
  vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);
  return { html: () => written };
}

describe('generatePDFReport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('v poročilo vključi fotografije z napisi', () => {
    const { html } = captureReportHtml();
    generatePDFReport(mkProject([mkPhoto('ph-1')]), [measurement], null, null, null);

    const out = html();
    expect(out).toContain('data:image/png;base64,ph-1');
    expect(out).toContain('4.20 m');
    expect(out).toContain('Fotografije');
  });

  it('narisane skice se vgradijo kot SVG nad fotografijo', () => {
    const { html } = captureReportHtml();
    const photo = mkPhoto('ph-1', {
      strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.4, y: 0.5 }], color: '#ef4444', width: 0.01 }],
    });
    generatePDFReport(mkProject([photo]), [], null, null, null);

    const out = html();
    expect(out).toContain('<svg');
    expect(out).toContain('M 10.00 20.00 L 40.00 50.00');
    expect(out).toContain('#ef4444');
  });

  it('brez fotografij poročilo ne vsebuje galerije', () => {
    const { html } = captureReportHtml();
    generatePDFReport(mkProject([]), [], null, null, null);
    expect(html()).not.toContain('class="photo-grid"');
  });
});
