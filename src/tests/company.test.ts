/**
 * Testi uradnih podatkov podjetja in barvnih palet po profilih.
 */

import { describe, it, expect } from 'vitest';
import { ROKSAL_COMPANY, companyFooterLine } from '../data/company';
import { ROKSAL_PROFILES, ROKSAL_COLORS } from '../data/roksalCatalog';

describe('Podatki podjetja Roksal', () => {
  it('davčna številka je v obliki SI + 8 števk', () => {
    expect(ROKSAL_COMPANY.taxNumber).toMatch(/^SI\d{8}$/);
  });

  it('TRR je v obliki SI56 + 15 števk', () => {
    expect(ROKSAL_COMPANY.iban.replace(/\s+/g, '')).toMatch(/^SI56\d{15}$/);
  });

  it('ima naslov salona, e-pošto in spletno stran', () => {
    expect(ROKSAL_COMPANY.showroomAddress).toContain('Kranj');
    expect(ROKSAL_COMPANY.email).toContain('@');
    expect(ROKSAL_COMPANY.website).toContain('roksal');
  });

  it('noga dokumenta vsebuje ključne podatke', () => {
    const line = companyFooterLine();
    expect(line).toContain(ROKSAL_COMPANY.legalName);
    expect(line).toContain(ROKSAL_COMPANY.taxNumber);
    expect(line).toContain('TRR');
  });
});

describe('Barvne palete po profilih (uradna lestvica)', () => {
  const expectedCounts: Record<string, number> = {
    'deska-150': 7,
    'romb-deska-67': 7,
    'kubo-80-42': 4,
    'polna-deska-100': 8,
    'polna-deska-128': 6
  };

  for (const [profileId, count] of Object.entries(expectedCounts)) {
    it(`${profileId} ima ${count} razpoložljivih barv`, () => {
      const profile = ROKSAL_PROFILES.find(p => p.id === profileId);
      expect(profile).toBeDefined();
      expect(profile!.colors.length).toBe(count);
      for (const color of profile!.colors) {
        expect(ROKSAL_COLORS[color.id]).toBeDefined();
      }
    });
  }

  it('bela barva je na voljo samo za POLNA DESKA 100', () => {
    for (const profile of ROKSAL_PROFILES) {
      const hasWhite = profile.colors.some(c => c.id === 'white');
      expect(hasWhite).toBe(profile.id === 'polna-deska-100');
    }
  });

  it('Rustic Oak in Rustic Walnut sta označena kot večbarvna', () => {
    expect(ROKSAL_COLORS['rustic-oak'].notes).toMatch(/večbarvni/i);
    expect(ROKSAL_COLORS['rustic-walnut'].notes).toMatch(/večbarvni/i);
  });
});
