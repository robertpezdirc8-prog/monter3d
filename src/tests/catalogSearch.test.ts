/**
 * FAZA 21 — iskanje v katalogu Roksal.
 */
import { describe, it, expect } from 'vitest';
import { ROKSAL_PROFILES, ROKSAL_COLORS, searchProfiles, searchColors } from '../data/roksalCatalog';

describe('searchProfiles', () => {
  it('brez iskalnega niza vrne celoten katalog', () => {
    expect(searchProfiles('').length).toBe(ROKSAL_PROFILES.length);
    expect(searchProfiles('   ').length).toBe(ROKSAL_PROFILES.length);
  });

  it('najde profil po imenu (neodvisno od velikosti črk)', () => {
    const rezultat = searchProfiles('polna deska');
    expect(rezultat.length).toBeGreaterThan(0);
    expect(rezultat.every(p => p.name.toLowerCase().includes('polna deska'))).toBe(true);
  });

  it('najde profil po ID-ju', () => {
    const rezultat = searchProfiles('romb-deska-67');
    expect(rezultat.map(p => p.id)).toContain('romb-deska-67');
  });

  it('najde profil po dimenziji', () => {
    const rezultat = searchProfiles('1500');
    expect(rezultat.length).toBeGreaterThan(0);
  });

  it('ne najde ničesar za naključno besedo', () => {
    expect(searchProfiles('xyz-ne-obstaja')).toEqual([]);
  });
});

describe('searchColors', () => {
  it('najde barvo po imenu in po hex kodu', () => {
    expect(searchColors('amazon').length).toBeGreaterThan(0);
    const prva = Object.values(ROKSAL_COLORS)[0];
    const poHex = searchColors(prva.hex.toLowerCase());
    expect(poHex.map(c => c.id)).toContain(prva.id);
  });

  it('brez iskalnega niza vrne vse barve', () => {
    expect(searchColors('').length).toBe(Object.values(ROKSAL_COLORS).length);
  });
});
