/**
 * annotation.ts — FAZA 19
 *
 * Skice/označbe na fotografijah (vzorec iz CompanyCam: »add more context to your photos«).
 *
 * Skica je **vektor** (točke z normaliziranimi koordinatami 0..1), ne slika, zato:
 *  - se pravilno izriše pri vsaki velikosti (miniatura, platno, dokumentacijska lista),
 *  - ne poveča velikosti zapisa v bazi,
 *  - ostane ostra pri izvozu v PNG/PDF.
 */

import type { AnnotationStroke, Photo, PhotoAnnotation } from '../types';

export const ANNOTATION_COLORS = [
  { id: 'red', label: 'Rdeča', hex: '#ef4444' },
  { id: 'yellow', label: 'Rumena', hex: '#facc15' },
  { id: 'green', label: 'Zelena', hex: '#22c55e' },
  { id: 'blue', label: 'Modra', hex: '#3b82f6' },
];

export const ANNOTATION_WIDTH = 0.008; // delež širine fotografije

/** Naredi novo prazno oznako. */
export function emptyAnnotation(): PhotoAnnotation {
  return { strokes: [] };
}

/** Ali je na fotografiji katera skica. */
export function hasAnnotation(photo: Photo): boolean {
  return (photo.annotation?.strokes?.length ?? 0) > 0;
}

/**
 * Nariše skice na canvasu. Koordinate so normalizirane, zato se skica prilagodi
 * velikosti platna.
 */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: PhotoAnnotation | undefined,
  width: number,
  height: number
): void {
  if (!annotation?.strokes?.length) return;

  for (const stroke of annotation.strokes) {
    if (stroke.points.length === 0) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = Math.max(1, stroke.width * width);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      const x = p.x * width;
      const y = p.y * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (stroke.points.length === 1) {
      // Klik brez premikanja = pika
      ctx.lineTo(stroke.points[0].x * width + 0.01, stroke.points[0].y * height + 0.01);
    }
    ctx.stroke();
  }
}

/** Pretvori kazalca v normalizirano točko glede na platno. */
export function toNormalizedPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

/** Doda novo potezo v oznako. */
export function addStroke(
  annotation: PhotoAnnotation | undefined,
  stroke: AnnotationStroke
): PhotoAnnotation {
  return { strokes: [...(annotation?.strokes ?? []), stroke] };
}

/** Odstrani zadnjo potezo (undo). */
export function undoStroke(annotation: PhotoAnnotation | undefined): PhotoAnnotation {
  const strokes = annotation?.strokes ?? [];
  return { strokes: strokes.slice(0, Math.max(0, strokes.length - 1)) };
}
