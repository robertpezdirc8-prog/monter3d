/**
 * photoSheet.ts — FAZA 18
 *
 * Dokumentacijska lista (»contact sheet«) iz zajetih fotografij.
 *
 * Vzorec je prevzet po spletnih orodjih za fotomontažo (Abox Image Layout, PixGrid),
 * ki jih uporabljajo mojstri: izbrane fotografije se razporedijo v mrežo, vsaka dobi
 * napis, izdelek pa se izvozi kot slika (PNG). Ključna lastnost teh orodij —
 * **ničesar se ne pošilja na strežnik**, vse deluje v brskalniku — je tu tudi naša
 * prednost: dokumentacija za stranko nastane brez omrežja.
 *
 * Modul je razdeljen na dva dela:
 *  - `buildPhotoSheetLayout()` — čist izračun geometrije (brez canvas API) → testljivo;
 *  - `renderPhotoSheet()` — izris na canvas.
 */

import type { Measurement, Photo } from '../types';
import { drawAnnotation } from './annotation';

export interface PhotoSheetPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/** Pred nastavitvi: A4 pri 150 dpi in kvadrat za deljenje na telefonu. */
export const PHOTO_SHEET_PRESETS: PhotoSheetPreset[] = [
  { id: 'a4-landscape', label: 'A4 ležeče (1754 × 1240 px)', width: 1754, height: 1240 },
  { id: 'a4-portrait', label: 'A4 pokončno (1240 × 1754 px)', width: 1240, height: 1754 },
  { id: 'square', label: 'Kvadrat (1600 × 1600 px)', width: 1600, height: 1600 },
];

export interface PhotoSheetCell {
  photoId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Napis pod fotografijo (meritev, čas). */
  caption: string;
}

export interface PhotoSheetLayout {
  preset: PhotoSheetPreset;
  width: number;
  height: number;
  /** Zgornji naslov (ime projekta). */
  title: string;
  /** Podnaslov (datum, število fotografij). */
  subtitle: string;
  /** Noga (ključni podatki: dolžina, število materiala). */
  footer: string;
  cells: PhotoSheetCell[];
  /** Velikost napisa v celicah. */
  captionFontSize: number;
  padding: number;
  gap: number;
  columns: number;
  background: string;
}

export interface PhotoSheetInput {
  photos: Photo[];
  measurements: Measurement[];
  projectName: string;
  /** Ključni podatki v nogi (npr. »Dolžina 12,40 m · 24 paneli«). */
  summary?: string;
  presetId?: string;
  columns?: number;
  gap?: number;
  padding?: number;
  background?: string;
  /** Format datuma za napise. */
  dateLabel?: string;
}

const DEFAULT_COLUMNS = 3;
const DEFAULT_GAP = 16;
const DEFAULT_PADDING = 40;
const DEFAULT_BACKGROUND = '#0f172a';
const HEADER_HEIGHT = 120;
const FOOTER_HEIGHT = 70;
const CAPTION_HEIGHT = 34;

/** Formatira čas posnetka kot »HH:MM«. */
function formatTime(photo: Photo): string {
  const d = photo.timestamp instanceof Date ? photo.timestamp : new Date(photo.timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
}

/** Meritev, ki se nanaša na fotografijo. */
function measurementForPhoto(photo: Photo, measurements: Measurement[]): Measurement | undefined {
  return measurements.find(m => m.photoIds?.includes(photo.id) && m.status === 'verified')
    ?? measurements.find(m => m.photoIds?.includes(photo.id));
}

/**
 * Izračuna geometrijo dokumentacijske liste: mreža celic z napisi, glava in noga.
 * Čist izračun brez canvas API — zato je enostaven za testiranje.
 */
export function buildPhotoSheetLayout(input: PhotoSheetInput): PhotoSheetLayout {
  const preset = PHOTO_SHEET_PRESETS.find(p => p.id === input.presetId) ?? PHOTO_SHEET_PRESETS[0];
  const photos = input.photos.slice(0, 24);
  const columns = Math.max(1, Math.min(input.columns ?? DEFAULT_COLUMNS, photos.length || 1));
  const gap = input.gap ?? DEFAULT_GAP;
  const padding = input.padding ?? DEFAULT_PADDING;
  const background = input.background ?? DEFAULT_BACKGROUND;

  const contentWidth = preset.width - padding * 2;
  const contentHeight = preset.height - padding * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;
  const rows = Math.max(1, Math.ceil(photos.length / columns));
  const cellWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);
  const cellHeight = Math.floor((contentHeight - gap * (rows - 1)) / rows);
  const photoHeight = Math.max(40, cellHeight - CAPTION_HEIGHT);

  const cells: PhotoSheetCell[] = photos.map((photo, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = padding + col * (cellWidth + gap);
    const y = padding + HEADER_HEIGHT + row * (cellHeight + gap);

    const measurement = measurementForPhoto(photo, input.measurements);
    const parts: string[] = [];
    if (measurement) {
      parts.push(`${measurement.value.toFixed(2)} ${measurement.unit}`);
    }
    const time = formatTime(photo);
    if (time) parts.push(time);
    if (parts.length === 0) parts.push('—');

    return {
      photoId: photo.id,
      x,
      y,
      width: cellWidth,
      height: photoHeight,
      caption: parts.join(' · '),
    };
  });

  const dateLabel = input.dateLabel ?? new Date().toLocaleDateString('sl-SI');
  const subtitle = `${dateLabel} · ${photos.length} ${photos.length === 1 ? 'fotografija' : 'fotografij'}`;
  const footer = input.summary ?? '';

  return {
    preset,
    width: preset.width,
    height: preset.height,
    title: input.projectName || 'Mera3D Pro',
    subtitle,
    footer,
    cells,
    captionFontSize: 22,
    padding,
    gap,
    columns,
    background,
  };
}

/**
 * Izriše dokumentacijsko listo na canvas. Vse poteka lokalno v brskalniku —
 * fotografije se nikamor ne pošiljajo.
 */
export async function renderPhotoSheet(
  canvas: HTMLCanvasElement,
  layout: PhotoSheetLayout,
  photos: Photo[]
): Promise<void> {
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = layout.background;
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Glava
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.title, layout.padding, layout.padding);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(layout.subtitle, layout.padding, layout.padding + 52);

  // Noga
  if (layout.footer) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(layout.footer, layout.padding, layout.height - layout.padding - 26);
  }

  // Fotografije (z označbami, če so shranjene)
  const byId = new Map(photos.map(p => [p.id, p]));
  for (const cell of layout.cells) {
    const photo = byId.get(cell.photoId);
    if (photo) {
      const img = await loadImage(photo.dataUrl);
      drawCover(ctx, img, cell.x, cell.y, cell.width, cell.height);
      // FAZA 19: skica je v normaliziranih koordinatah -> pripiše se v celico
      if (photo.annotation?.strokes?.length) {
        ctx.save();
        // Skica je v normaliziranih koordinatah -> izriše se glede na celico
        ctx.beginPath();
        ctx.rect(cell.x, cell.y, cell.width, cell.height);
        ctx.clip();
        ctx.translate(cell.x, cell.y);
        drawAnnotation(ctx, photo.annotation, cell.width, cell.height);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${layout.captionFontSize}px system-ui, sans-serif`;
    ctx.fillText(cell.caption, cell.x, cell.y + cell.height + 6);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
  }
}

/** Naloži sliko iz podatkovnega niza (dataUrl). */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Slika se ni naložila'));
    img.src = dataUrl;
  });
}

/** Risane slike kot »cover« (zapolni celico, ohrani razmerje). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, width: number, height: number
): void {
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, x + (width - w) / 2, y + (height - h) / 2, w, h);
}
