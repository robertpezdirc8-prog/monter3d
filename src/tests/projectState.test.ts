/**
 * Testi prenosa meritev, načrtov in predračuna v projekt.
 */

import { describe, expect, it } from 'vitest';
import type { CostEstimate, FencePlan, Project, StairsPlan } from '../types';
import {
  applyProjectWorkState,
  projectWorkStateChanged,
  type ProjectWorkState
} from '../utils/projectState';

const project: Project = {
  id: 'project-1',
  name: 'Test',
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
  customer: { name: 'Stranka' },
  montages: [],
  status: 'measuring'
};

const measurement = {
  id: 'm1',
  type: 'length' as const,
  value: 4.2,
  unit: 'm' as const,
  source: 'manual' as const,
  scaleSource: 'manual_reference' as const,
  status: 'verified' as const,
  uncertainty: 3,
  confidence: 0.85,
  photoIds: [],
  algorithm: 'pixel_distance',
  createdAt: new Date('2026-01-01T11:00:00Z')
};

const fencePlan: FencePlan = {
  totalLength: 4.2,
  totalHeightChange: 0,
  segments: [],
  mountingStyle: 'level',
  productType: 'WPC ograja',
  panelHeight: 1.5,
  panelWidth: 1.8,
  postHeight: 1.7,
  maxGap: 0.12,
  totalPanels: 3,
  totalPosts: 4,
  sharedCornerPosts: 0,
  totalRails: 6,
  totalFasteners: 24
};

const stairsPlan: StairsPlan = {
  numSteps: 5,
  totalRise: 1.2,
  totalRun: 2.5,
  averageRise: 0.24,
  averageRun: 0.5,
  slope: 25.6,
  steps: [],
  railingLength: 2.8,
  handrailHeight: 0.9
};

const estimate: CostEstimate = {
  materials: [],
  subtotal: 100,
  tax: 22,
  taxRate: 0.22,
  total: 122,
  wastePercent: 5,
  validMeasurements: 1,
  invalidMeasurements: 0,
  warningMeasurements: 0
};

const completeState: ProjectWorkState = {
  measurements: [measurement],
  fencePlan,
  stairsPlan,
  estimate
};

describe('projectWorkStateChanged', () => {
  it('vrne false, ko so vrednosti enake', () => {
    const loaded: Project = {
      ...project,
      measurements: completeState.measurements,
      fencePlan,
      stairsPlan,
      estimate
    };
    expect(projectWorkStateChanged(loaded, completeState)).toBe(false);
  });

  it('vrne true ob novih meritvah', () => {
    const state = { ...completeState, measurements: [...completeState.measurements] };
    expect(projectWorkStateChanged(project, state)).toBe(true);
  });

  it('vrne true ob spremembi načrta ali predračuna', () => {
    const loaded: Project = {
      ...project,
      measurements: completeState.measurements,
      fencePlan,
      stairsPlan,
      estimate
    };
    expect(projectWorkStateChanged(loaded, { ...completeState, fencePlan: null })).toBe(true);
    expect(projectWorkStateChanged(loaded, { ...completeState, estimate: null })).toBe(true);
  });
});

describe('applyProjectWorkState', () => {
  it('prenese meritve, načrte in predračun ter ohrani druge podatke', () => {
    const updated = applyProjectWorkState(project, completeState);

    expect(updated.measurements).toEqual([measurement]);
    expect(updated.fencePlan).toBe(fencePlan);
    expect(updated.stairsPlan).toBe(stairsPlan);
    expect(updated.estimate).toBe(estimate);
    expect(updated.customer).toEqual({ name: 'Stranka' });
    expect(updated.montages).toEqual([]);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(project.updatedAt.getTime());
  });

  it('počisti neobstoječe načrte in predračun', () => {
    const loaded: Project = { ...project, fencePlan, stairsPlan, estimate };
    const updated = applyProjectWorkState(loaded, {
      measurements: [],
      fencePlan: null,
      stairsPlan: null,
      estimate: null
    });

    expect(updated.fencePlan).toBeUndefined();
    expect(updated.stairsPlan).toBeUndefined();
    expect(updated.estimate).toBeUndefined();
  });
});
