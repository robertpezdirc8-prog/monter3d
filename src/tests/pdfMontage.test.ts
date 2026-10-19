/**
 * Testi PDF razdelka s fotomontažo.
 */

import { describe, expect, it } from 'vitest';
import type { ProjectMontage } from '../types';
import { buildMontageSection } from '../utils/pdfExport';

const montage: ProjectMontage = {
  id: 'montage-1',
  dataUrl: 'data:image/png;base64,AAAA',
  createdAt: new Date('2026-10-19T12:00:00Z'),
  sourcePhotoId: 'photo-1',
  profileName: 'POLNA DESKA 57/32',
  colorName: 'Amazon Wood',
  orientation: 'vertical',
  fenceHeightMm: 1600,
  boardSpacingMm: 20,
  pxPerMeter: 137
};

describe('buildMontageSection', () => {
  it('vrne prazen niz brez montaže', () => {
    expect(buildMontageSection(null)).toBe('');
    expect(buildMontageSection(undefined)).toBe('');
  });

  it('vključi sliko in podatke o konfiguraciji', () => {
    const html = buildMontageSection(montage);
    expect(html).toContain('Fotomontaža');
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('POLNA DESKA 57/32');
    expect(html).toContain('Amazon Wood');
    expect(html).toContain('višina 1.60 m');
    expect(html).toContain('razmik desk 20 mm');
    expect(html).toContain('pokončno');
  });

  it('označi prečno orientacijo', () => {
    const html = buildMontageSection({ ...montage, orientation: 'horizontal' });
    expect(html).toContain('prečno');
  });

  it('zavrne neveljaven data URL', () => {
    expect(buildMontageSection({ ...montage, dataUrl: 'javascript:alert(1)' })).toBe('');
    expect(buildMontageSection({ ...montage, dataUrl: 'data:text/html;base64,AAAA' })).toBe('');
    expect(buildMontageSection({ ...montage, dataUrl: 'data:image/png;base64,<script>' })).toBe('');
  });

  it('pobegne ime profila in barve', () => {
    const html = buildMontageSection({
      ...montage,
      profileName: '<script>alert(1)</script>',
      colorName: 'Barva & "odtenek"'
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('Barva &amp; &quot;odtenek&quot;');
  });
});
