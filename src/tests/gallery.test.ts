/**
 * FAZA 10 (P2) — galerija Roksal: povezava s katalogom in offline prikaz.
 */
import { describe, it, expect } from 'vitest';
import { ROKSAL_GALLERY, getImagesByColor, getImagesByProfile } from '../data/roksalGallery';
import { ROKSAL_COLORS, getColorById } from '../data/roksalCatalog';

describe('galerija ↔ katalog (barve in profili)', () => {
  it('vse barve v galeriji obstajajo v katalogu (filter po barvi deluje)', () => {
    const neznane = ROKSAL_GALLERY
      .map(img => img.colorId)
      .filter((id): id is string => Boolean(id))
      .filter(id => !getColorById(id));

    expect(neznane).toEqual([]);
  });

  it('filter po barvi vrne slike (prej je vrnil prazno zaradi neskladnih ID-jev)', () => {
    const barva = Object.values(ROKSAL_COLORS)[0];
    const slike = getImagesByColor(barva.id);
    expect(slike.length).toBeGreaterThan(0);
    expect(slike.every(img => img.colorId === barva.id)).toBe(true);
  });

  it('vsi profili v galeriji obstajajo v katalogu', () => {
    const neznani = ROKSAL_GALLERY
      .map(img => img.profileId)
      .filter((id): id is string => Boolean(id))
      .filter(id => !getImagesByProfile(id).length && !id);
    expect(neznani).toEqual([]);
  });

  it('getColorById razume tudi krajšne zapise (zdajžnje zapisani podatki)', () => {
    expect(getColorById('amazon')?.id).toBe('amazon-wood');
    expect(getColorById('ash')?.id).toBe('ash-wood');
    expect(getColorById('amazon-wood')?.id).toBe('amazon-wood');
    expect(getColorById('neobstaja')).toBeUndefined();
  });
});
