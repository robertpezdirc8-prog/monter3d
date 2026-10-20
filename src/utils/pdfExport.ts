import type { Project, Photo, Measurement, FencePlan, StairsPlan, CostEstimate } from '../types';
import type { ActivityEntry } from './activityLog';
import { ACTIVITY_PRESENTATION } from './activityLog';
import { formatLength, type LengthUnit } from './units';

export function generatePDFReport(
  project: Project,
  measurements: Measurement[],
  fencePlan: FencePlan | null,
  stairsPlan: StairsPlan | null,
  estimate: CostEstimate | null,
  activity: ActivityEntry[] = [],
  lengthUnit: LengthUnit = 'm'
): void {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Prosimo, dovolite popup okna za izvoz PDF.');
    return;
  }

  const validMeasurements = measurements.filter(m => m.status === 'verified');
  const warningMeasurements = measurements.filter(m => m.status === 'warning');
  const invalidMeasurements = measurements.filter(m => m.status === 'invalid');

  const html = `
<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <title>Predračun - ${project.name}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #10b981;
      margin: 0 0 10px 0;
      font-size: 24pt;
    }
    .header .subtitle {
      color: #666;
      font-size: 10pt;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      color: #1e40af;
      font-size: 14pt;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 15px;
    }
    .info-item {
      background: #f9fafb;
      padding: 10px;
      border-radius: 4px;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 9pt;
      text-transform: uppercase;
    }
    .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
    .photo-cell { break-inside: avoid; margin: 0; }
    .photo-frame { position: relative; width: 100%; height: 52mm; overflow: hidden; border: 0.3mm solid #d1d5db; }
    .photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-frame svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .photo-cell figcaption { font-size: 8pt; color: #4b5563; margin-top: 1.5mm; }
    .info-value {
      font-size: 12pt;
      color: #111827;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #d1d5db;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .status-verified {
      color: #059669;
      font-weight: 600;
    }
    .status-warning {
      color: #d97706;
      font-weight: 600;
    }
    .status-invalid {
      color: #dc2626;
      font-weight: 600;
    }
    .total-row {
      background: #f0fdf4;
      font-weight: 700;
      font-size: 14pt;
    }
    .total-row td {
      padding: 15px 10px;
      border-top: 3px solid #10b981;
    }
    .warning-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box strong {
      color: #92400e;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 9pt;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body {
        font-size: 10pt;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 20px;">
    <button onclick="window.print()" style="padding: 10px 30px; font-size: 12pt; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
      🖨️ Natisni / Shrani kot PDF
    </button>
  </div>

  <div class="header">
    <h1>PREDRAČUN</h1>
    <div class="subtitle">Mera3D Pro — Profesionalne 3D-meritve in montaža</div>
  </div>

  <div class="section">
    <h2>Podatki o projektu</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Ime projekta</div>
        <div class="info-value">${project.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Tip objekta</div>
        <div class="info-value">${getObjectTypeLabel(project.objectType)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Datum izdelave</div>
        <div class="info-value">${new Date().toLocaleDateString('sl-SI')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Število fotografij</div>
        <div class="info-value">${project.photos.length}</div>
      </div>
    </div>
  </div>

  ${fencePlan ? `
  <div class="section">
    <h2>Podatki o ograji</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Skupna dolžina</div>
        <div class="info-value">${fencePlan.totalLength.toFixed(2)} m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Višina panela</div>
        <div class="info-value">${fencePlan.panelHeight.toFixed(2)} m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Število panelov</div>
        <div class="info-value">${fencePlan.totalPanels} kos</div>
      </div>
      <div class="info-item">
        <div class="info-label">Število stebrov</div>
        <div class="info-value">${fencePlan.totalPosts} kos</div>
      </div>
      <div class="info-item">
        <div class="info-label">Način montaže</div>
        <div class="info-value">${fencePlan.mountingStyle === 'stepped' ? 'Stopničasta' : 'Ravna'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Število segmentov</div>
        <div class="info-value">${fencePlan.segments.length}</div>
      </div>
    </div>
  </div>
  ` : ''}

  ${stairsPlan ? `
  <div class="section">
    <h2>Podatki o stopnicah</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Število stopnic</div>
        <div class="info-value">${stairsPlan.numSteps}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Skupna višina</div>
        <div class="info-value">${stairsPlan.totalRise.toFixed(2)} m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Skupna dolžina</div>
        <div class="info-value">${stairsPlan.totalRun.toFixed(2)} m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Naklon</div>
        <div class="info-value">${stairsPlan.slope.toFixed(1)}°</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>MERITVE</h2>
    ${validMeasurements.length > 0 ? `
    <h3 style="color: #059669; margin-bottom: 10px;">✓ Preverjene meritve (${validMeasurements.length})</h3>
    <table>
      <thead>
        <tr>
          <th>Vrednost</th>
          <th>Enota</th>
          <th>Vir</th>
          <th>Negotovost</th>
        </tr>
      </thead>
      <tbody>
        ${validMeasurements.map(m => `
        <tr>
          <td>${m.unit === 'm' ? formatLength(m.value, lengthUnit) : m.value.toFixed(3) + ' ' + m.unit}</td>
          <td>${m.unit === 'm' ? '' : m.unit}</td>
          <td>${m.source}</td>
          <td>±${m.uncertainty.toFixed(1)}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${warningMeasurements.length > 0 ? `
    <h3 style="color: #d97706; margin: 20px 0 10px 0;">⚠ Opozorilne meritve (${warningMeasurements.length})</h3>
    <table>
      <thead>
        <tr>
          <th>Vrednost</th>
          <th>Enota</th>
          <th>Vir</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${warningMeasurements.map(m => `
        <tr>
          <td>${m.value.toFixed(3)}</td>
          <td>${m.unit}</td>
          <td>${m.source}</td>
          <td class="status-warning">OPOZORILO</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    ${invalidMeasurements.length > 0 ? `
    <h3 style="color: #dc2626; margin: 20px 0 10px 0;">✗ Neveljavne meritve (${invalidMeasurements.length})</h3>
    <p style="color: #6b7280; font-size: 9pt; margin-bottom: 10px;">
      Te meritve so izključene iz predračuna.
    </p>
    <table>
      <thead>
        <tr>
          <th>Vrednost</th>
          <th>Enota</th>
          <th>Razlog</th>
        </tr>
      </thead>
      <tbody>
        ${invalidMeasurements.map(m => `
        <tr>
          <td>${m.value.toFixed(3)}</td>
          <td>${m.unit}</td>
          <td class="status-invalid">NEVELJAVNA</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
  </div>

  ${estimate ? `
  <div class="section">
    <h2>PREDRAČUN</h2>
    <table>
      <thead>
        <tr>
          <th>Material</th>
          <th style="text-align: right;">Kol.</th>
          <th style="text-align: right;">Enota</th>
          <th style="text-align: right;">Skupaj</th>
        </tr>
      </thead>
      <tbody>
        ${estimate.materials.map(item => `
        <tr>
          <td>${item.name}${item.notes ? `<br><small style="color: #6b7280;">${item.notes}</small>` : ''}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td style="text-align: right;">${item.unitPrice.toFixed(2)} €/${item.unit}</td>
          <td style="text-align: right;">${item.totalPrice.toFixed(2)} €</td>
        </tr>
        `).join('')}
        ${estimate.labor ? `
        <tr>
          <td>Montaža</td>
          <td style="text-align: right;">${estimate.labor.hours} ur</td>
          <td style="text-align: right;">${estimate.labor.rate.toFixed(2)} €/h</td>
          <td style="text-align: right;">${estimate.labor.total.toFixed(2)} €</td>
        </tr>
        ` : ''}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align: right; font-weight: 600;">Vmesni seštevek:</td>
          <td style="text-align: right;">${estimate.subtotal.toFixed(2)} €</td>
        </tr>
        ${estimate.labor ? `
        <tr>
          <td colspan="3" style="text-align: right; font-weight: 600;">Materiali + delo:</td>
          <td style="text-align: right;">${(estimate.subtotal + estimate.labor.total).toFixed(2)} €</td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="3" style="text-align: right; font-weight: 600;">DDV (${(estimate.taxRate * 100).toFixed(0)}%):</td>
          <td style="text-align: right;">${estimate.tax.toFixed(2)} €</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">SKUPAJ:</td>
          <td style="text-align: right;">${estimate.total.toFixed(2)} €</td>
        </tr>
      </tfoot>
    </table>

    ${estimate.invalidMeasurements > 0 || estimate.warningMeasurements > 0 ? `
    <div class="warning-box">
      <strong>⚠ OPOZORILO:</strong> Predračun vključuje ${estimate.warningMeasurements} opozorilnih meritev. 
      ${estimate.invalidMeasurements > 0 ? `${estimate.invalidMeasurements} neveljavnih meritev je izključenih. ` : ''}
      Priporočamo preverjanje meritev z laserskim merilnikom pred končno potrditvijo.
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${photoGalleryHtml(project.photos, measurements)}

  ${activityLogHtml(activity)}

  <div class="footer">
    <p><strong>Mera3D Pro</strong> — Profesionalne 3D-meritve in montaža</p>
    <p>Dokument izdelan: ${new Date().toLocaleString('sl-SI')}</p>
    <p style="margin-top: 10px; font-size: 8pt;">
      Ta dokument je bil samodejno generiran. Meritve so bile izvedene z uporabo klasične računalniške vizije. 
      Priporočamo preverjanje ključnih meritev z referenčnimi merili pred začetkom montaže.
    </p>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * FAZA 20: galerija fotografij v PDF poročilu — stranka vidi posnetke in
 * narisane skice, ne le številke.
 *
 * Označbe so vektor (normalizirane koordinate), zato jih v HTML vgradimo kot
 * SVG nad fotografijo — brez dodatnega zapisa v bazi in brez posiljanja.
 */
function photoGalleryHtml(photos: Photo[], measurements: Measurement[]): string {
  if (!photos || photos.length === 0) return '';

  const cells = photos.slice(0, 12).map(photo => {
    const measurement = measurements.find(m => m.photoIds?.includes(photo.id) && m.status === 'verified');
    const time = photo.timestamp instanceof Date
      ? photo.timestamp.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
      : '';
    const caption = [measurement ? `${measurement.value.toFixed(2)} ${measurement.unit}` : '', time]
      .filter(Boolean)
      .join(' · ');

    const strokes = photo.annotation?.strokes ?? [];
    const paths = strokes.map(stroke => {
      const d = stroke.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`)
        .join(' ');
      const width = (stroke.width * 100).toFixed(2);
      return `<path d="${d}" stroke="${stroke.color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('');

    const overlay = paths
      ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${paths}</svg>`
      : '';

    return `<figure class="photo-cell">
      <div class="photo-frame">
        <img src="${photo.dataUrl}" alt="" />
        ${overlay}
      </div>
      <figcaption>${caption || '—'}</figcaption>
    </figure>`;
  }).join('');

  return `
  <h3 style="margin: 24px 0 8px 0;">📷 Fotografije (${photos.length})</h3>
  <div class="photo-grid">${cells}</div>
  `;
}

/**
 * FAZA 28: potek dela v PDF poročilu — stranka vidi, kaj je bilo izvedeno in kdaj.
 */
function activityLogHtml(activity: ActivityEntry[]): string {
  if (!activity || activity.length === 0) return '';

  const vrstici = activity
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(entry => {
      const presentation = ACTIVITY_PRESENTATION[entry.type] ?? { icon: '•', label: 'Dogodek' };
      const cas = entry.timestamp.toLocaleString('sl-SI');
      return `<tr>
        <td style="white-space: nowrap; color: #6b7280;">${cas}</td>
        <td style="white-space: nowrap;">${presentation.icon} ${presentation.label}</td>
        <td>${entry.message}</td>
      </tr>`;
    })
    .join('');

  return `
  <h3 style="margin: 24px 0 8px 0;">🕘 Potek dela</h3>
  <table>
    <thead>
      <tr>
        <th>Čas</th>
        <th>Dejanje</th>
        <th>Opis</th>
      </tr>
    </thead>
    <tbody>${vrstici}</tbody>
  </table>
  `;
}

function getObjectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fence: 'Ograja',
    stairs: 'Stopnice',
    facade: 'Fasada',
    terrain: 'Teren',
    combined: 'Kombinirano'
  };
  return labels[type] || type;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Dokumentacijska lista v PDF (za tisk) — FAZA 19
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Odpre tiskalni pogovor z dokumentacijsko listo (A4 ležeče): fotografije z
 * napisi, glava z imenom projekta in noga s ključnimi podatki.
 *
 * Vse poteka lokalno v brskalniku (kot pri ostalih izvozih) — fotografije se
 * vgradijo kot podatkovni nizi in nikamor se ne pošiljajo.
 */
export function generatePhotoSheetPDF(
  project: Project,
  photos: Photo[],
  measurements: Measurement[],
  summary?: string
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Prosimo, dovolite popup okna za izvoz dokumentacijske liste.');
    return;
  }

  const date = new Date().toLocaleDateString('sl-SI');
  const cell = (photo: Photo): string => {
    const measurement = measurements.find(m => m.photoIds?.includes(photo.id) && m.status === 'verified');
    const time = photo.timestamp instanceof Date
      ? photo.timestamp.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' })
      : '';
    const caption = [measurement ? `${measurement.value.toFixed(2)} ${measurement.unit}` : '', time]
      .filter(Boolean)
      .join(' · ');

    return `<figure>
      <img src="${photo.dataUrl}" alt="" />
      <figcaption>${caption || '—'}</figcaption>
    </figure>`;
  };

  const html = `<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8" />
  <title>Dokumentacija - ${project.name}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 10pt; color: #111; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6mm; }
    h1 { font-size: 18pt; margin: 0; }
    .meta { font-size: 9pt; color: #555; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    figure { margin: 0; break-inside: avoid; }
    figure img { width: 100%; height: 52mm; object-fit: cover; border: 0.3mm solid #bbb; }
    figcaption { font-size: 8pt; color: #333; margin-top: 1mm; }
    footer { margin-top: 6mm; font-size: 8.5pt; color: #444; border-top: 0.3mm solid #ccc; padding-top: 2mm; }
    .no-print { text-align: center; margin-bottom: 8mm; }
    .no-print button { padding: 8px 24px; font-size: 11pt; background: #10b981; color: #fff; border: none; border-radius: 5px; cursor: pointer; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">🖨 Natisni / shrani kot PDF</button></div>
  <header>
    <h1>${project.name}</h1>
    <div class="meta">${date} · ${photos.length} ${photos.length === 1 ? 'fotografija' : 'fotografij'}</div>
  </header>
  <div class="grid">${photos.slice(0, 24).map(cell).join('')}</div>
  ${summary ? `<footer>${summary}</footer>` : ''}
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 300);
}
