/**
 * FAZA 19 — označbe (skice) na fotografijah.
 *
 * Vzorec iz CompanyCam (»annotations«): skica je vektor z normaliziranimi
 * koordinatami, zato ostane ostra pri vsaki velikosti in se izriše tudi v
 * dokumentacijski listi.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  ANNOTATION_COLORS, ANNOTATION_WIDTH, addStroke, drawAnnotation, emptyAnnotation,
  hasAnnotation, toNormalizedPoint, undoStroke,
} from '../utils/annotation';
import type { Photo } from '../types';

function photo(annotation?: Photo['annotation']): Photo {
  return {
    id: 'p1',
    dataUrl: 'data:image/png;base64,AAAA',
    timestamp: new Date(2026, 0, 1),
    quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0, glareDetected: false, overallScore: 0.8 },
    coverage: 0,
    status: 'analyzed',
    annotation,
  };
}

describe('toNormalizedPoint', () => {
  it('koordinate so relativne glede na platno in omejene na 0..1', () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(toNormalizedPoint(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(toNormalizedPoint(500, 250, rect)).toEqual({ x: 1, y: 1 });
    expect(toNormalizedPoint(300, 150, rect)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('izven platna se omeji na rob', () => {
    const rect = { left: 0, top: 0, width: 100, height: 100 };
    expect(toNormalizedPoint(-50, -20, rect)).toEqual({ x: 0, y: 0 });
    expect(toNormalizedPoint(500, 500, rect)).toEqual({ x: 1, y: 1 });
  });

  it('ničelna velikost ne povzroči napake', () => {
    const p = toNormalizedPoint(10, 10, { left: 0, top: 0, width: 0, height: 0 });
    expect(p).toEqual({ x: 0, y: 0 });
  });
});

describe('upravljanje potez', () => {
  it('doda potezo in jo razveljavi', () => {
    const stroke = { points: [{ x: 0.1, y: 0.2 }], color: ANNOTATION_COLORS[0].hex, width: ANNOTATION_WIDTH };
    let a = addStroke(emptyAnnotation(), stroke);
    expect(a.strokes.length).toBe(1);
    expect(hasAnnotation(photo(a))).toBe(true);

    a = undoStroke(a);
    expect(a.strokes.length).toBe(0);
    expect(hasAnnotation(photo(a))).toBe(false);
  });

  it('razveljavi prazno oznako brez napake', () => {
    expect(undoStroke(undefined).strokes.length).toBe(0);
  });
});

describe('drawAnnotation', () => {
  it('nariše vsako potezo in spoštuje barvo', () => {
    const ctx = {
      strokeStyle: '', lineWidth: 0, lineCap: '', lineJoin: '',
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    drawAnnotation(ctx, {
      strokes: [
        { points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }], color: '#ef4444', width: 0.01 },
        { points: [{ x: 0.2, y: 0.3 }], color: '#22c55e', width: 0.02 },
      ],
    }, 800, 600);

    expect(ctx.stroke).toHaveBeenCalledTimes(2);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(400, 300);
  });

  it('brez oznake ne risa ničesar', () => {
    const ctx = { beginPath: vi.fn(), stroke: vi.fn() } as unknown as CanvasRenderingContext2D;
    drawAnnotation(ctx, undefined, 800, 600);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});
