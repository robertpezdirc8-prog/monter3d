import type { Project, Measurement, FencePlan, StairsPlan, CostEstimate, RoksalQuote } from '../types';
import { ROKSAL_COMPANY, companyFooterLine } from '../data/company';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generatePDFReport(
  project: Project,
  measurements: Measurement[],
  fencePlan: FencePlan | null,
  stairsPlan: StairsPlan | null,
  estimate: CostEstimate | null,
  roksalQuote?: RoksalQuote | null
): void {
  // Blokada izvoza: neveljavne konfiguracije ali praznega predračuna ne tiskamo.
  if (roksalQuote && (!roksalQuote.valid || roksalQuote.items.length === 0)) {
    alert('Ponudbe ni mogoče izvoziti: konfiguracija ni veljavna ali kosovnica je prazna.');
    return;
  }
  if (!roksalQuote && (!estimate || estimate.materials.length === 0 || estimate.total <= 0)) {
    alert('Predračuna ni mogoče izvoziti: ni veljavnih postavk. Najprej izračunajte količine.');
    return;
  }

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
  <title>${roksalQuote ? `Ponudba ${escapeHtml(roksalQuote.number)}` : 'Predračun'} - ${escapeHtml(project.name)}</title>
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
    <h1>${roksalQuote ? 'PONUDBA' : 'PREDRAČUN'}</h1>
    ${roksalQuote ? `<div style="font-size: 13pt; font-weight: 600; margin-bottom: 6px;">${escapeHtml(roksalQuote.number)}</div>` : ''}
    <div class="subtitle">${roksalQuote ? `${escapeHtml(ROKSAL_COMPANY.legalName)} — WoodCore WPC sistemi` : 'Mera3D Pro — Profesionalne meritve in montaža'}</div>
  </div>

  ${roksalQuote ? `
  <div class="section">
    <h2>Naročnik in ponudba</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Naročnik</div>
        <div class="info-value">${escapeHtml(roksalQuote.customer.name)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Naslov</div>
        <div class="info-value">${escapeHtml(roksalQuote.customer.address || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Telefon</div>
        <div class="info-value">${escapeHtml(roksalQuote.customer.phone || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">E-pošta</div>
        <div class="info-value">${escapeHtml(roksalQuote.customer.email || '—')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Datum ponudbe</div>
        <div class="info-value">${new Date(roksalQuote.createdAt).toLocaleDateString('sl-SI')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Velja do</div>
        <div class="info-value">${new Date(roksalQuote.validUntil).toLocaleDateString('sl-SI')}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Ponudnik</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Podjetje</div>
        <div class="info-value">${escapeHtml(ROKSAL_COMPANY.legalName)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Salon in skladišče</div>
        <div class="info-value">${escapeHtml(ROKSAL_COMPANY.showroomAddress)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Kontakt</div>
        <div class="info-value">${escapeHtml(ROKSAL_COMPANY.phones[1]?.number ?? ROKSAL_COMPANY.phones[0].number)} · ${escapeHtml(ROKSAL_COMPANY.email)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Davčna številka in TRR</div>
        <div class="info-value">${escapeHtml(ROKSAL_COMPANY.taxNumber)} · ${escapeHtml(ROKSAL_COMPANY.iban)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Konfiguracija ograje</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Profil</div>
        <div class="info-value">${escapeHtml(roksalQuote.configuration.profileName)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Barva</div>
        <div class="info-value">${escapeHtml(roksalQuote.configuration.colorName)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Orientacija</div>
        <div class="info-value">${roksalQuote.configuration.orientation === 'vertical' ? 'Pokončno' : 'Prečno'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Dolžina × višina</div>
        <div class="info-value">${(roksalQuote.configuration.fenceLengthMm / 1000).toFixed(2)} m × ${(roksalQuote.configuration.fenceHeightMm / 1000).toFixed(2)} m</div>
      </div>
      <div class="info-item">
        <div class="info-label">Razmik desk</div>
        <div class="info-value">${roksalQuote.configuration.boardSpacingMm} mm</div>
      </div>
      <div class="info-item">
        <div class="info-label">Razmik stebrov</div>
        <div class="info-value">${roksalQuote.configuration.postSpacingMm ? `${roksalQuote.configuration.postSpacingMm} mm (zahteva)` : 'samodejno'}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Podatki o projektu</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Ime projekta</div>
        <div class="info-value">${escapeHtml(project.name)}</div>
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
          <td>${m.value.toFixed(3)}</td>
          <td>${m.unit}</td>
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

  ${roksalQuote ? `
  <div class="section">
    <h2>KOSOVNICA</h2>
    <table>
      <thead>
        <tr>
          <th>Postavka</th>
          <th style="text-align: right;">Kol.</th>
          <th style="text-align: right;">Enota</th>
          <th style="text-align: right;">Cena</th>
          <th style="text-align: right;">Skupaj</th>
        </tr>
      </thead>
      <tbody>
        ${roksalQuote.items.map(item => `
        <tr>
          <td>${escapeHtml(item.name)}${item.notes ? `<br><small style="color: #6b7280;">${escapeHtml(item.notes)}</small>` : ''}</td>
          <td style="text-align: right;">${item.quantity}</td>
          <td style="text-align: right;">${escapeHtml(item.unit)}</td>
          <td style="text-align: right;">${item.unitPrice.toFixed(2)} €</td>
          <td style="text-align: right;">${item.totalPrice.toFixed(2)} €</td>
        </tr>
        `).join('')}
        ${roksalQuote.labor ? `
        <tr>
          <td>Montaža</td>
          <td style="text-align: right;">${roksalQuote.labor.hours} h</td>
          <td style="text-align: right;">—</td>
          <td style="text-align: right;">${roksalQuote.labor.rate.toFixed(2)} €/h</td>
          <td style="text-align: right;">${roksalQuote.labor.total.toFixed(2)} €</td>
        </tr>
        ` : ''}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align: right; font-weight: 600;">Material:</td>
          <td style="text-align: right;">${roksalQuote.materialsSubtotal.toFixed(2)} €</td>
        </tr>
        ${roksalQuote.labor ? `
        <tr>
          <td colspan="4" style="text-align: right; font-weight: 600;">Delo:</td>
          <td style="text-align: right;">${roksalQuote.laborTotal.toFixed(2)} €</td>
        </tr>
        ` : ''}
        ${roksalQuote.discount > 0 ? `
        <tr>
          <td colspan="4" style="text-align: right; font-weight: 600;">Popust (${roksalQuote.discountPercent}%):</td>
          <td style="text-align: right;">-${roksalQuote.discount.toFixed(2)} €</td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="4" style="text-align: right; font-weight: 600;">DDV (${(roksalQuote.taxRate * 100).toFixed(0)}%):</td>
          <td style="text-align: right;">${roksalQuote.tax.toFixed(2)} €</td>
        </tr>
        <tr class="total-row">
          <td colspan="4" style="text-align: right;">SKUPAJ Z DDV:</td>
          <td style="text-align: right;">${roksalQuote.total.toFixed(2)} €</td>
        </tr>
      </tfoot>
    </table>

    ${roksalQuote.isDemoPrices ? `
    <div class="warning-box">
      <strong>⚠ DEMO CENE:</strong> Ponudba uporablja demo cenik in ni uradni Roksal cenik.
      Pred uporabo pri stranki ga zamenjajte z veljavnim cenikom.
    </div>
    ` : ''}

    ${roksalQuote.warnings.length > 0 ? `
    <div class="warning-box">
      <strong>Opozorila:</strong>
      <ul style="margin: 8px 0 0 18px;">
        ${roksalQuote.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${roksalQuote.notes ? `
    <div style="margin-top: 15px;">
      <strong>Opombe:</strong>
      <p style="white-space: pre-line;">${escapeHtml(roksalQuote.notes)}</p>
    </div>
    ` : ''}

    ${roksalQuote.terms ? `
    <div style="margin-top: 15px;">
      <strong>Pogoji poslovanja:</strong>
      <p style="white-space: pre-line; font-size: 10pt; color: #374151;">${escapeHtml(roksalQuote.terms)}</p>
    </div>
    ` : ''}

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px;">
      <div style="border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 9pt; color: #6b7280;">Naročnik</div>
      <div style="border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 9pt; color: #6b7280;">${escapeHtml(ROKSAL_COMPANY.legalName)} — žig in podpis</div>
    </div>
  </div>
  ` : ''}

  ${estimate && !roksalQuote ? `
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

  <div class="footer">
    <p><strong>${roksalQuote ? escapeHtml(ROKSAL_COMPANY.legalName) : 'Mera3D Pro'}</strong> — ${roksalQuote ? 'WoodCore WPC sistemi' : 'Profesionalne meritve in montaža'}</p>
    ${roksalQuote ? `<p style="margin-top: 6px;">${escapeHtml(companyFooterLine())}</p>` : ''}
    <p>Dokument izdelan: ${new Date().toLocaleString('sl-SI')}</p>
    <p style="margin-top: 10px; font-size: 8pt;">
      ${roksalQuote
        ? 'Ponudba je informativne narave. Končni obračun se izvede po dejansko opravljenih delih in vgrajenem materialu.'
        : 'Ta dokument je bil samodejno generiran. Meritve so bile izvedene z uporabo klasične računalniške vizije. Priporočamo preverjanje ključnih meritev z referenčnimi merili pred začetkom montaže.'}
    </p>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Pobirnica materiala za skladišče — natisne seznam postavk iz kosovnice
 * projekta, s polji za odkljukavanje pri prevzemu materiala.
 */
export function printPickList(project: Project, quote: RoksalQuote): void {
  if (!quote || quote.items.length === 0) {
    alert('Pobirnice ni mogoče natisniti: kosovnica je prazna.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Prosimo, dovolite popup okna za tiskanje.');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="sl">
<head>
  <meta charset="UTF-8">
  <title>Pobirnica ${escapeHtml(quote.number)} — ${escapeHtml(project.name)}</title>
  <style>
    @page { size: A4; margin: 1.6cm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt; line-height: 1.45; color: #1a1a1a; margin: 0;
    }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 12px; margin-bottom: 18px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20pt; color: #10b981; }
    .header .sub { color: #4b5563; font-size: 10pt; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .meta .item { background: #f9fafb; padding: 8px 10px; border-radius: 4px; font-size: 10pt; }
    .meta .label { font-weight: 600; color: #6b7280; font-size: 8.5pt; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; padding: 8px; font-size: 10pt; border-bottom: 2px solid #d1d5db; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 10pt; vertical-align: top; }
    td.check { width: 30px; text-align: center; font-size: 15pt; color: #374151; }
    td.qty { text-align: right; white-space: nowrap; }
    .small { color: #6b7280; font-size: 8.5pt; }
    .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8.5pt; color: #6b7280; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; }
    .signatures div { border-top: 1px solid #9ca3af; padding-top: 6px; font-size: 9pt; color: #6b7280; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 16px;">
    <button onclick="window.print()" style="padding: 10px 30px; font-size: 12pt; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
      🖨️ Natisni / Shrani kot PDF
    </button>
  </div>

  <div class="header">
    <h1>POBIRNICA MATERIALA</h1>
    <div class="sub">${escapeHtml(ROKSAL_COMPANY.legalName)} — ${escapeHtml(ROKSAL_COMPANY.showroomAddress)} · ${escapeHtml(ROKSAL_COMPANY.phones[1]?.number ?? ROKSAL_COMPANY.phones[0].number)}</div>
  </div>

  <div class="meta">
    <div class="item"><div class="label">Projekt</div>${escapeHtml(project.name)}</div>
    <div class="item"><div class="label">Ponudba</div>${escapeHtml(quote.number)}</div>
    <div class="item"><div class="label">Stranka</div>${escapeHtml(quote.customer?.name || '—')}</div>
    <div class="item"><div class="label">Datum</div>${new Date().toLocaleDateString('sl-SI')}</div>
    <div class="item"><div class="label">Profil</div>${escapeHtml(quote.configuration.profileName)} · ${escapeHtml(quote.configuration.colorName)}</div>
    <div class="item"><div class="label">Mere</div>${(quote.configuration.fenceLengthMm / 1000).toFixed(2)} m × ${(quote.configuration.fenceHeightMm / 1000).toFixed(2)} m (${quote.configuration.orientation === 'vertical' ? 'pokončno' : 'prečno'})</div>
  </div>

  <table>
    <thead>
      <tr>
        <th></th>
        <th>Postavka</th>
        <th style="text-align: right;">Količina</th>
        <th style="text-align: right;">Enota</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map(item => `
      <tr>
        <td class="check">☐</td>
        <td>
          ${escapeHtml(item.name)}
          ${item.notes ? `<div class="small">${escapeHtml(item.notes)}</div>` : ''}
        </td>
        <td class="qty">${item.quantity}</td>
        <td class="qty">${escapeHtml(item.unit)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${quote.isDemoPrices ? `<p class="small" style="margin-top: 10px;">⚠️ Ponudba uporablja demo cene — količine so izračunane po konfiguraciji.</p>` : ''}

  <div class="signatures">
    <div>Pripravil (skladišče)</div>
    <div>Prevzel (monter)</div>
  </div>

  <div class="footer">
    <p>${escapeHtml(companyFooterLine())}</p>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
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
