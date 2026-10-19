/**
 * Testi shranjevanja in odstranjevanja fotomontaž v projektu.
 */

import { describe, expect, it } from 'vitest';
import type { Project, ProjectMontageInput } from '../types';
import { addProjectMontage, removeProjectMontage } from '../utils/montages';

const baseProject: Project = {
  id: 'project-1',
  name: 'Testna ograja',
  objectType: 'fence',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
  photos: [],
  measurements: [],
  materials: {
    productLine: 'Roksal Standard',
    color: 'Antracit RAL 7016',
    finish: 'Prašno barvan',
    panelMaterial: 'Aluminij',
    postMaterial: 'Aluminij',
    fastenerType: 'A2 inox'
  },
  status: 'capture'
};

const montageInput: ProjectMontageInput = {
  dataUrl: 'data:image/png;base64,AAAA',
  sourcePhotoId: 'photo-1',
  profileName: 'POLNA DESKA 57/32',
  colorName: 'Amazon Wood',
  orientation: 'vertical',
  fenceHeightMm: 1600,
  boardSpacingMm: 20,
  pxPerMeter: 137
};

describe('addProjectMontage', () => {
  it('doda montažo z id in datumom ter ne spremeni izvirnika', () => {
    const updated = addProjectMontage(baseProject, montageInput);

    expect(updated.montages).toHaveLength(1);
    expect(updated.montages![0].id).toBeTruthy();
    expect(updated.montages![0].createdAt).toBeInstanceOf(Date);
    expect(updated.montages![0].profileName).toBe('POLNA DESKA 57/32');
    expect(baseProject.montages).toBeUndefined();
  });

  it('ohrani obstoječe montaže in doda novo', () => {
    const first = addProjectMontage(baseProject, montageInput);
    const second = addProjectMontage(first, {
      ...montageInput,
      profileName: 'DESKA 150',
      orientation: 'horizontal'
    });

    expect(second.montages).toHaveLength(2);
    expect(second.montages![0].profileName).toBe('POLNA DESKA 57/32');
    expect(second.montages![1].orientation).toBe('horizontal');
  });

  it('posodobi updatedAt', () => {
    const updated = addProjectMontage(baseProject, montageInput);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(baseProject.updatedAt.getTime());
  });
});

describe('removeProjectMontage', () => {
  it('odstrani izbrano montažo in pusti ostale', () => {
    const first = addProjectMontage(baseProject, montageInput);
    const second = addProjectMontage(first, { ...montageInput, profileName: 'DESKA 150' });
    const removed = removeProjectMontage(second, second.montages![0].id);

    expect(removed.montages).toHaveLength(1);
    expect(removed.montages![0].profileName).toBe('DESKA 150');
  });

  it('ne spremeni projekta, če montaža ne obstaja', () => {
    const withMontage = addProjectMontage(baseProject, montageInput);
    const removed = removeProjectMontage(withMontage, 'ne-obstaja');

    expect(removed.montages).toHaveLength(1);
    expect(removed.montages![0].id).toBe(withMontage.montages![0].id);
  });
});
