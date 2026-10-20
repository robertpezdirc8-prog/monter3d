/**
 * shareExport.ts — FAZA 32
 *
 * **Prenos dokumentacije med napravami brez strežnika.**
 *
 * Pravzaprav sinhronizacije z oblakom ni: aplikacija je povsem lokalna, kar je
 * prednost (zasebnost) in omejitev (ni skupnega projekta med napravami).
 *
 * Rešitev, ki deluje brez infrastrukture: aplikacija izdela **samostojen HTML
 * dokument** — vsebuje projekt, meritve, predračun in fotografije (vgrajene kot
 * data-URI), odpre pa se v kateremkoli brskalniku. Monter ga pošlje po WhatsAppu,
 * e-pošti ali USB-ja, pisarna pa odpre dokument brez aplikacije.
 *
 * Dokument je namenjen **branju**, ne uvozu: uvoz v aplikacijo je že podprt prek
 * varnostne kopije (JSON).
 */

import type { BoardFencePlan, CostEstimate, FencePlan, Measurement, Photo, Project } from '../types';
import { formatLength, type LengthUnit } from './units';
import { ACTIVITY_PRESENTATION, type ActivityEntry } from './activityLog';

/** Varno vstavljanje besedila v HTML (imena projektov in opisi so uporabnikov vnos). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ShareDocumentInput {
  project: Project;
  photos: Photo[];
  measurements: Measurement[];
  fencePlan?: FencePlan | null;
  boardPlan?: BoardFencePlan | null;
  estimate?: CostEstimate | null;
  lengthUnit?: LengthUnit;
  /** Opomba, ki se doda dokumentu (npr. »ponudba«). */
  note?: string;
  /** Dnevnik opravljenih dejanj (potek dela) — prikazan pisarni. */
  activity?: ActivityEntry[];
}

/** Ocena velikosti dokumenta v MB (za opozorilo pred deljenjem). */
export function estimateShareSizeMB(photos: Photo[]): number {
  const bytes = photos.reduce((sum, p) => sum + (p.dataUrl?.length ?? 0), 0);
  return bytes / (1024 * 1024);
}

function measurementRows(measurements: Measurement[], unit: LengthUnit): string {
  const rows = measurements
    .filter(m => m.status !== 'invalid')
    .map(m => `<tr>
      <td>${escapeHtml(m.unit === 'm' ? formatLength(m.value, unit) : `${m.value.toFixed(3)} ${m.unit}`)}</td>
      <td>${escapeHtml(m.source)}</td>
      <td>±${escapeHtml(m.uncertainty.toFixed(1))}%</td>
      <td>${escapeHtml(m.status === 'verified' ? 'preverjena' : 'opozorilo')}</td>
    </tr>`)
    .join('');
  return rows || '<tr><td colspan="4">Ni meritev</td></tr>';
}

function photoBlocks(photos: Photo[], measurements: Measurement[], unit: LengthUnit): string {
  if (photos.length === 0) return '<p class="empty">Ni fotografij.</p>';

  return photos.map(photo => {
    const measurement = measurements.find(m => m.photoIds?.includes(photo.id) && m.status === 'verified');
    const caption = measurement
      ? formatLength(measurement.value, unit)
      : new Date(photo.timestamp).toLocaleString('sl-SI');
    const annotationNote = photo.annotation?.strokes
      .map(s => s.note)
      .filter((n): n is string => Boolean(n))
      .join(', ');

    return `<figure>
      <img src="${escapeHtml(photo.dataUrl)}" alt="" />
      <figcaption>${escapeHtml(caption)}${annotationNote ? ` — ${escapeHtml(annotationNote)}` : ''}</figcaption>
    </figure>`;
  }).join('');
}

/**
 * Tabela poteka dela (dnevnik opravljenih dejanj) — prikazana v deljenem dokumentu,
 * da pisarna vidi tudi *kaj je bilo narejeno*, ne le številk.
 */
function activityRows(activity: ActivityEntry[] | undefined): string {
  if (!activity || activity.length === 0) return '';

  const vrstici = activity
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(entry => {
      const presentation = ACTIVITY_PRESENTATION[entry.type] ?? { icon: '•', label: 'Dogodek' };
      return `<tr>
        <td style="white-space:nowrap;color:#64748b;">${escapeHtml(entry.timestamp.toLocaleString('sl-SI'))}</td>
        <td style="white-space:nowrap;">${escapeHtml(presentation.icon)} ${escapeHtml(presentation.label)}</td>
        <td>${escapeHtml(entry.message)}</td>
      </tr>`;
    })
    .join('');

  return `<h2 style="font-size:16px;margin:24px 0 4px;">Potek dela</h2>
  <table>
    <thead><tr><th>Čas</th><th>Dejanje</th><th>Opis</th></tr></thead>
    <tbody>${vrstici}</tbody>
  </table>`;
}

/**
 * Sestavi samostojen HTML dokument z dokumentacijo projekta.
 * Dokument ne potrebuje omrežja in se odpre v kateremkoli brskalniku.
 */
export function buildShareDocument(input: ShareDocumentInput): string {
  const { project, photos, measurements, estimate, note } = input;
  const unit = input.lengthUnit ?? 'm';
  const datum = new Date().toLocaleDateString('sl-SI');
  const ograjni = input.fencePlan ?? null;
  const deskna = input.boardPlan ?? null;

  const dolzina = ograjni
    ? `${ograjni.totalLength.toFixed(2)} m`
    : deskna
      ? `${deskna.totalLength.toFixed(2)} m`
      : '—';

  const materialna = ograjni
    ? `${ograjni.totalPanels} paneli · ${ograjni.totalPosts} stebrov`
    : deskna
      ? `${deskna.boards} desk · ${deskna.posts} stebrov`
      : '—';

  const znesek = estimate ? `${estimate.total.toFixed(2)} €` : '—';

  return `<!DOCTYPE html>
<html lang="sl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(project.name)} — dokumentacija</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f1f5f9; color: #0f172a; }
  .card { max-width: 900px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(15,23,42,.12); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  figure { margin: 0; }
  figure img { width: 100%; border-radius: 8px; display: block; }
  figcaption { font-size: 12px; color: #475569; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  th { color: #475569; font-weight: 600; }
  .facts { display: flex; flex-wrap: wrap; gap: 16px; margin: 16px 0; font-size: 14px; }
  .facts b { display: block; font-size: 17px; }
  .note { background: #f8fafc; border-left: 3px solid #10b981; padding: 10px 12px; border-radius: 4px; font-size: 13px; white-space: pre-wrap; }
  .empty { color: #94a3b8; font-size: 13px; }
  footer { margin-top: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { background: #fff; padding: 0; } .card { box-shadow: none; } }
</style>
</head>
<body>
<div class="card">
  <h1>${escapeHtml(project.name)}</h1>
  <div class="meta">Dokumentacija projekta · ${escapeHtml(datum)} · Mera3D Pro</div>

  <div class="facts">
    <div>Dolžina ograje<b>${escapeHtml(dolzina)}</b></div>
    <div>Material<b>${escapeHtml(materialna)}</b></div>
    <div>Predračun<b>${escapeHtml(znesek)}</b></div>
    <div>Fotografije<b>${photos.length}</b></div>
  </div>

  ${note ? `<div class="note">${escapeHtml(note)}</div>` : ''}

  <h2 style="font-size:16px;margin:24px 0 4px;">Meritve</h2>
  <table>
    <thead><tr><th>Vrednost</th><th>Vir</th><th>Negotovost</th><th>Status</th></tr></thead>
    <tbody>${measurementRows(measurements, unit)}</tbody>
  </table>

  ${activityRows(input.activity)}

  <h2 style="font-size:16px;margin:24px 0 8px;">Fotografije</h2>
  <div class="grid">${photoBlocks(photos, measurements, unit)}</div>

  <footer>
    Dokument je samostojen (ne potrebuje omrežja) in je izdelan z aplikacijo Mera3D Pro.
    Vrednosti so izmerjene v terenu; priporočamo preverjanje kritičnih meritev z referenčnimi merili.
  </footer>
</div>
</body>
</html>`;
}
