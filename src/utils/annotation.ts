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

/**
 * Nariše opombo (kratko besedilo) ob skici — z ozadjem, da je berljiva tudi
 * čez svetlo fotografijo.
 */
export function drawStrokeNote(
  ctx: CanvasRenderingContext2D,
  stroke: AnnotationStroke,
  width: number,
  height: number
): void {
  if (!stroke.note || stroke.points.length === 0) return;

  const anchor = stroke.points[0];
  const x = anchor.x * width;
  const y = anchor.y * height;
  const text = stroke.note.length > 28 ? `${stroke.note.slice(0, 28)}…` : stroke.note;

  ctx.save();
  ctx.font = `${Math.max(12, Math.round(height * 0.045))}px system-ui, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 6;
  const padY = 4;
  const boxW = metrics.width + padX * 2;
  const boxH = Math.max(18, Math.round(height * 0.045)) + padY * 2;

  // Opomba naj bo vedno v celici (pod fotografijo, ne na njej)
  const boxY = Math.min(Math.max(0, y - boxH - 6), Math.max(0, height - boxH));

  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(x, boxY, boxW, boxH);
  ctx.fillStyle = '#f8fafc';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x + padX, boxY + padY);
  ctx.restore();
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

/**
 * Doda opremo (kratko besedilo) zadnji potezi — npr. »vrtanje tukaj«.
 * Če opomba že obstaja, se prepiše.
 */
export function setNoteOnLastStroke(
  annotation: PhotoAnnotation | undefined,
  note: string
): PhotoAnnotation {
  const strokes = annotation?.strokes ?? [];
  if (strokes.length === 0) return { strokes: [] };
  const trimmed = note.trim();
  const next = strokes.slice();
  next[next.length - 1] = { ...next[next.length - 1], note: trimmed || undefined };
  return { strokes: next };
}

/** Odstrani zadnjo potezo (undo). */
export function undoStroke(annotation: PhotoAnnotation | undefined): PhotoAnnotation {
  const strokes = annotation?.strokes ?? [];
  return { strokes: strokes.slice(0, Math.max(0, strokes.length - 1)) };
}
