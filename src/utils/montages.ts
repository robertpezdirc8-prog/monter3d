/**
 * Pomožne funkcije za shranjene fotomontaže v projektu.
 * Ločeno od Reacta, da jih je mogoče preprosto testirati.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Project, ProjectMontage, ProjectMontageInput } from '../types';

export function addProjectMontage(project: Project, input: ProjectMontageInput): Project {
  const montage: ProjectMontage = {
    ...input,
    id: uuidv4(),
    createdAt: new Date()
  };

  return {
    ...project,
    montages: [...(project.montages ?? []), montage],
    updatedAt: new Date()
  };
}

export function removeProjectMontage(project: Project, montageId: string): Project {
  return {
    ...project,
    montages: (project.montages ?? []).filter(montage => montage.id !== montageId),
    updatedAt: new Date()
  };
}
