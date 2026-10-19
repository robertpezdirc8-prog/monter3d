/**
 * Združevanje delovnega stanja (meritve, načrti, predračun) v projekt.
 * Ločeno od Reacta, da je mogoče preveriti, kdaj je stanje res spremenjeno.
 */

import type { Project, Measurement, FencePlan, StairsPlan, CostEstimate } from '../types';

export interface ProjectWorkState {
  measurements: Measurement[];
  fencePlan: FencePlan | null;
  stairsPlan: StairsPlan | null;
  estimate: CostEstimate | null;
}

export function projectWorkStateChanged(project: Project, state: ProjectWorkState): boolean {
  return (
    project.measurements !== state.measurements ||
    (project.fencePlan ?? null) !== state.fencePlan ||
    (project.stairsPlan ?? null) !== state.stairsPlan ||
    (project.estimate ?? null) !== state.estimate
  );
}

export function applyProjectWorkState(project: Project, state: ProjectWorkState): Project {
  return {
    ...project,
    measurements: state.measurements,
    fencePlan: state.fencePlan ?? undefined,
    stairsPlan: state.stairsPlan ?? undefined,
    estimate: state.estimate ?? undefined,
    updatedAt: new Date()
  };
}
