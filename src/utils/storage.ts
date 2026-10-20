/**
 * Mera3D Pro - Local Storage with IndexedDB
 * 
 * Provides persistent storage for projects and photos that survives page refresh.
 * Uses IndexedDB for large binary data (photos) and localStorage for metadata.
 */

import type { Project, Photo } from '../types';
import type { ActivityEntry, StoredActivityEntry } from './activityLog';
import { toStoredActivity, fromStoredActivity } from './activityLog';

const DB_NAME = 'Mera3DProDB';
const DB_VERSION = 2;
const PROJECTS_STORE = 'projects';
const PHOTOS_STORE = 'photos';
const ACTIVITY_STORE = 'activity';

// Initialize IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create projects store
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }

      // Create photos store
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        const photoStore = db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' });
        photoStore.createIndex('projectId', 'projectId', { unique: false });
      }

      // FAZA 27: dnevnik opravljenih dejanj
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) {
        const activityStore = db.createObjectStore(ACTIVITY_STORE, { keyPath: 'id' });
        activityStore.createIndex('projectId', 'projectId', { unique: false });
      }
    };
  });
}

// FAZA 1: IndexedDB hrani strukturirane vrednosti, a Date objekti preživijo le,
// če jih ne pretvarjamo skozi JSON. Vsebujoči delovni tok (App.tsx) projekte serializira,
// zato ob branju obnovimo znana časovna polja iz ISO nizov v prave Date objekte.
const DATE_FIELDS = ['createdAt', 'updatedAt', 'timestamp', 'verifiedAt'] as const;

function reviveDates<T>(obj: T): T {
  // FAZA 1 popravilo: pravi Date objekti (IndexedDB strukturno kopija ohrani instanceof)
  // morajo ostati nespremenjeni — sicer bi jih rekurzija spremenila v PRAZEN objekt {}
  // in App.tsx createdAt.toLocaleDateString() bi bil pokvarjen.
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(reviveDates) as unknown as T;
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if ((DATE_FIELDS as readonly string[]).includes(k)) {
        if (v instanceof Date) {
          out[k] = v; // že veljaven Date — ohrani
        } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
          const d = new Date(v);
          out[k] = isNaN(d.getTime()) ? v : d; // neveljaven niz ostane niz, brez InvalidDate
        } else if (typeof v === 'number' && Number.isFinite(v)) {
          const d = new Date(v);
          out[k] = isNaN(d.getTime()) ? v : d;
        } else {
          out[k] = v; // null/undefined/neveljavna vrednost — pusti, ne ustvari lažnega datuma
        }
      } else {
        out[k] = reviveDates(v);
      }
    }
    return out as T;
  }
  return obj;
}

// Save project
export async function saveProject(project: Project): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.put(project);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get project by ID
export async function getProject(id: string): Promise<Project | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result ? reviveDates<Project>(request.result) : null);
    request.onerror = () => reject(request.error);
  });
}

// Get all projects
export async function getAllProjects(): Promise<Project[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(reviveDates<Project[]>(request.result || []));
    request.onerror = () => reject(request.error);
  });
}

// Delete project
export async function deleteProject(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Save photo
export async function savePhoto(photo: Photo & { projectId: string }): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PHOTOS_STORE], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE);
    const request = store.put(photo);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Posodobi obstoječo fotografijo (npr. po dodajanju skice). */
export async function updatePhoto(photo: Photo & { projectId: string }): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PHOTOS_STORE], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE);
    const request = store.put(photo);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get photos for project
export async function getPhotosByProject(projectId: string): Promise<Photo[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PHOTOS_STORE], 'readonly');
    const store = transaction.objectStore(PHOTOS_STORE);
    const index = store.index('projectId');
    const request = index.getAll(projectId);

    request.onsuccess = () => resolve(reviveDates<Photo[]>(request.result || []));
    request.onerror = () => reject(request.error);
  });
}

// Delete photo
export async function deletePhoto(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PHOTOS_STORE], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * FAZA 7 (P0): ob brisanju projekta je treba pobrisati tudi njegove fotografije,
 * sicer v IndexedDB ostanejo "sirote" in trajno zapolnijo kvoto.
 * Vrne število izbrisanih fotografij.
 */
export async function deletePhotosByProject(projectId: string): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PHOTOS_STORE], 'readwrite');
    const store = transaction.objectStore(PHOTOS_STORE);
    const index = store.index('projectId');
    const request = index.openKeyCursor(IDBKeyRange.only(projectId));
    let deleted = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        deleted++;
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve(deleted);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * FAZA 7 (P0): naloži projekt in njegove fotografije.
 *
 * Starejši zapisi so imeli fotografije (z dataUrl) tudi v samem projektu. Tu jih
 * enkrat preselimo v ločeno shrambo in projekt očistimo, da se podatki ne podvajajo
 * in da kasnejše shranjevanje stanja ne zapisuje slik dvakrat.
 */
export async function loadProjectWithPhotos(
  project: Project
): Promise<{ project: Project; photos: Photo[] }> {
  const storedPhotos = await getPhotosByProject(project.id);
  const legacyPhotos = Array.isArray(project.photos) ? project.photos : [];

  if (legacyPhotos.length === 0) {
    return { project, photos: storedPhotos };
  }

  if (storedPhotos.length === 0) {
    await Promise.all(legacyPhotos.map(p => savePhoto({ ...p, projectId: project.id })));
  }

  const cleanedProject: Project = { ...project, photos: [] };
  await saveProject(cleanedProject);

  return {
    project: cleanedProject,
    photos: storedPhotos.length > 0 ? storedPhotos : legacyPhotos,
  };
}

// Save current project ID to localStorage for quick access
export function setCurrentProjectId(id: string | null): void {
  if (id) {
    localStorage.setItem('currentProjectId', id);
  } else {
    localStorage.removeItem('currentProjectId');
  }
}

// Get current project ID from localStorage
export function getCurrentProjectId(): string | null {
  return localStorage.getItem('currentProjectId');
}


/* ────────────────────────────────────────────────────────────────────────────
 * Dnevnik opravljenih dejanj (FAZA 27)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Shrani dogodek v dnevnik projekta. */
export async function addActivity(entry: ActivityEntry): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ACTIVITY_STORE], 'readwrite');
    const store = transaction.objectStore(ACTIVITY_STORE);
    const request = store.put(toStoredActivity(entry));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Vrne dogodke projekta, od najnovejšega. */
export async function getActivities(projectId: string, limit = 200): Promise<ActivityEntry[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ACTIVITY_STORE], 'readonly');
    const store = transaction.objectStore(ACTIVITY_STORE);
    const index = store.index('projectId');
    const request = index.getAll(IDBKeyRange.only(projectId));
    request.onsuccess = () => {
      const entries = (request.result as StoredActivityEntry[]).map(fromStoredActivity);
      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      resolve(entries.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
}

/** Počisti dnevnik projekta. */
export async function clearActivities(projectId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ACTIVITY_STORE], 'readwrite');
    const store = transaction.objectStore(ACTIVITY_STORE);
    const index = store.index('projectId');
    const request = index.openKeyCursor(IDBKeyRange.only(projectId));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
