/**
 * backup.ts — FAZA 7 (P0)
 *
 * Varnostna kopija projekta: JSON z opisom projekta, stanjem in FOTOGRAFIJAMI.
 * Prej je običajni izvoz JSON vseboval samo metapodatke fotografij, zato projekta
 * ni bilo mogoče obnoviti (niti varnostno kopirati) — obnova je bila nemogoča.
 *
 * Format je versioniran, da ga lahko pozneje migriramo.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Project, Photo, Measurement, FencePlan, StairsPlan, CostEstimate, ProjectSettings } from '../types';
import { saveProject, savePhoto } from './storage';
import { normalizeSettings } from './projectState';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'mera3d-pro';

export interface BackupPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  quality: Photo['quality'];
  status: Photo['status'];
  rejectionReason?: string;
  width?: number;
  height?: number;
  coverage: number;
  features?: Photo['features'];
}

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  project: Omit<Project, 'id' | 'photos' | 'createdAt' | 'updatedAt'> & {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  photos: BackupPhoto[];
}

export type ParseResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string };

/** Ustvari JSON varnostne kopije (vključno s fotografijami). */
export function createBackup(project: Project, photos: Photo[]): string {
  const backup: BackupFile = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: {
      ...project,
      id: project.id,
      name: project.name,
      createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : new Date(project.createdAt).toISOString(),
      updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : new Date(project.updatedAt).toISOString(),
      photos: undefined,
    } as BackupFile['project'],
    photos: photos.map(p => ({
      id: p.id,
      dataUrl: p.dataUrl,
      timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : new Date(p.timestamp).toISOString(),
      quality: p.quality,
      status: p.status,
      rejectionReason: p.rejectionReason,
      width: p.width,
      height: p.height,
      coverage: p.coverage,
      features: p.features,
    })),
  };

  // photos ni del zapisa projekta v novi obliki
  delete (backup.project as { photos?: unknown }).photos;

  return JSON.stringify(backup, null, 2);
}

/** Preveri in razčleni varnostno kopijo. */
export function parseBackup(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Datoteka ni veljaven JSON.' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Datoteka ne vsebuje projekta.' };
  }

  const b = data as Partial<BackupFile>;
  if (b.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'Datoteka ni varnostna kopija Mera3D Pro.' };
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    return { ok: false, error: `Nepodprta različica kopije (${String(b.version)}).` };
  }
  if (!b.project || typeof b.project.id !== 'string' || typeof b.project.name !== 'string') {
    return { ok: false, error: 'Varnostna kopija nima veljavnega projekta.' };
  }
  if (!Array.isArray(b.photos)) {
    return { ok: false, error: 'Varnostna kopija nima seznama fotografij.' };
  }

  return { ok: true, backup: b as BackupFile };
}

export interface RestoreResult {
  projectId: string;
  photoCount: number;
}

/**
 * Obnovi projekt iz varnostne kopije v IndexedDB.
 * Obnova dobi NOVI id, da ne prepise obstoječega projekta; ime se obdrži.
 */
export async function restoreBackup(raw: string): Promise<RestoreResult> {
  const parsed = parseBackup(raw);
  if (!parsed.ok) throw new Error(parsed.error);

  const b = parsed.backup;
  const projectId = uuidv4();

  const project: Project = {
    ...(b.project as unknown as Project),
    id: projectId,
    name: b.project.name,
    createdAt: new Date(b.project.createdAt),
    updatedAt: new Date(b.project.updatedAt),
    photos: [],
    measurements: (b.project.measurements ?? []) as Measurement[],
    fencePlan: (b.project.fencePlan ?? undefined) as FencePlan | undefined,
    stairsPlan: (b.project.stairsPlan ?? undefined) as StairsPlan | undefined,
    estimate: (b.project.estimate ?? undefined) as CostEstimate | undefined,
    settings: normalizeSettings((b.project.settings ?? {}) as Partial<ProjectSettings>),
    status: b.project.status ?? 'capture',
  };

  await saveProject(project);

  let photoCount = 0;
  for (const p of b.photos) {
    if (!p || typeof p.dataUrl !== 'string' || p.dataUrl.length === 0) continue;
    const photo: Photo = {
      id: p.id,
      dataUrl: p.dataUrl,
      timestamp: new Date(p.timestamp),
      quality: p.quality,
      status: p.status ?? 'analyzed',
      rejectionReason: p.rejectionReason,
      width: p.width,
      height: p.height,
      coverage: p.coverage ?? 0,
      features: p.features,
    };
    await savePhoto({ ...photo, projectId });
    photoCount++;
  }

  return { projectId, photoCount };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Varnostna kopija celotnega delovnega okolja (vsi projekti)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface WorkspaceBackup {
  app: string;
  version: number;
  exportedAt: string;
  projects: WorkspaceProject[];
}

export interface WorkspaceProject {
  project: Omit<Project, 'photos'> & { photos: [] };
  photos: BackupPhoto[];
}

/**
 * Ustvari varnostno kopijo vseh projektov (z fotografijami) — za prenos na drugo
 * napravo ali arhiviranje. En projekt je mogoče izvoziti tudi posamično
 * (`createBackup`), ta funkcija pa zajame celotno delovno okolje.
 */
export function createWorkspaceBackup(
  projects: Project[],
  photosByProject: Map<string, Photo[]>
): string {
  const backup: WorkspaceBackup = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects: projects.map(project => {
      const photos = photosByProject.get(project.id) ?? [];
      return {
        project: { ...project, photos: [] } as WorkspaceProject['project'],
        photos: photos.map(p => ({
          id: p.id,
          dataUrl: p.dataUrl,
          timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : new Date(p.timestamp).toISOString(),
          quality: p.quality,
          status: p.status,
          rejectionReason: p.rejectionReason,
          width: p.width,
          height: p.height,
          coverage: p.coverage,
          features: p.features,
        })),
      };
    }),
  };

  return JSON.stringify(backup, null, 2);
}

/** Preveri in razčleni varnostno kopijo delovnega okolja. */
export function parseWorkspaceBackup(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Datoteka ni veljaven JSON.' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Datoteka ne vsebuje projektov.' };
  }

  const b = data as Partial<WorkspaceBackup>;
  if (b.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'Datoteka ni varnostna kopija Mera3D Pro.' };
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    return { ok: false, error: `Nepodprta različica kopije (${String(b.version)}).` };
  }
  if (!Array.isArray(b.projects)) {
    return { ok: false, error: 'Varnostna kopija ne vsebuje seznama projektov.' };
  }

  return { ok: true, backup: b as BackupFile & WorkspaceBackup };
}

/**
 * Obnovi vse projekte iz varnostne kopije delovnega okolja.
 * Vsak projekt dobi NOVO oznako, da obstoječi projekti ostanejo nedotaknjeni.
 */
export async function restoreWorkspaceBackup(
  raw: string
): Promise<{ projectIds: string[]; photoCount: number }> {
  const parsed = parseWorkspaceBackup(raw);
  if (!parsed.ok) throw new Error(parsed.error);

  const data = parsed.backup as unknown as WorkspaceBackup;
  const projectIds: string[] = [];
  let photoCount = 0;

  for (const entry of data.projects) {
    const source = entry.project;
    const projectId = uuidv4();

    const project: Project = {
      ...(source as unknown as Project),
      id: projectId,
      createdAt: new Date(source.createdAt),
      updatedAt: new Date(source.updatedAt),
      photos: [],
      measurements: source.measurements ?? [],
      fencePlan: source.fencePlan ?? undefined,
      boardPlan: source.boardPlan ?? undefined,
      stairsPlan: source.stairsPlan ?? undefined,
      estimate: source.estimate ?? undefined,
      settings: normalizeSettings((source.settings ?? {}) as Partial<ProjectSettings>),
      status: source.status ?? 'capture',
    };

    await saveProject(project);

    for (const p of entry.photos ?? []) {
      if (!p?.dataUrl) continue;
      const photo: Photo = {
        id: p.id,
        dataUrl: p.dataUrl,
        timestamp: new Date(p.timestamp),
        quality: p.quality,
        status: p.status ?? 'analyzed',
        rejectionReason: p.rejectionReason,
        width: p.width,
        height: p.height,
        coverage: p.coverage ?? 0,
        features: p.features,
      };
      await savePhoto({ ...photo, projectId });
      photoCount++;
    }

    projectIds.push(projectId);
  }

  return { projectIds, photoCount };
}
