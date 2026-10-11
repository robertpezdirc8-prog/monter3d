/**
 * Mera3D Pro - Local Storage with IndexedDB
 * 
 * Provides persistent storage for projects and photos that survives page refresh.
 * Uses IndexedDB for large binary data (photos) and localStorage for metadata.
 */

import type { Project, Photo } from '../types';

const DB_NAME = 'Mera3DProDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const PHOTOS_STORE = 'photos';

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
    };
  });
}

// FAZA 1: IndexedDB hrani strukturirane vrednosti, a Date objekti preživijo le,
// če jih ne pretvarjamo skozi JSON. Vsebujoči delovni tok (App.tsx) projekte serializira,
// zato ob branju obnovimo znana časovna polja iz ISO nizov v prave Date objekte.
const DATE_FIELDS = ['createdAt', 'updatedAt', 'timestamp', 'verifiedAt'] as const;

function reviveDates<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(reviveDates) as unknown as T;
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof v === 'string' && (DATE_FIELDS as readonly string[]).includes(k) && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
        const d = new Date(v);
        out[k] = isNaN(d.getTime()) ? v : d;
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
