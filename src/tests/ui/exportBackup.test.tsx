// @vitest-environment jsdom
/**
 * UI testi: izvoz (CSV/JSON/PDF) in varnostna kopija (izvoz + uvoz).
 *
 * To je pot za varnost podatkov uporabnika — test preveri, da se izvoz dejansko
 * ustvari, da vsebuje prave podatke in da se kopijo da uvoziti nazaj.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { saveProject, savePhoto, getAllProjects, deleteProject } from '../../utils/storage';
import type { Project, Photo } from '../../types';

const BLOCKED = 'blob:test';

function mkProject(id: string): Project {
  return {
    id,
    name: 'Izvozni projekt',
    objectType: 'fence',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    photos: [],
    measurements: [{
      id: 'm-1', type: 'length', value: 4.2, unit: 'm', source: 'manual', scaleSource: 'manual_reference',
      status: 'verified', uncertainty: 3, confidence: 0.9, photoIds: ['ph-1'], algorithm: 'pixel_distance',
      createdAt: new Date('2026-01-02T10:00:00Z'),
    }],
    materials: {
      productLine: 'Roksal Standard', color: 'Antracit', finish: 'Prašno barvan',
      panelMaterial: 'Aluminij', postMaterial: 'Aluminij', fastenerType: 'A2 inox',
    },
    status: 'capture',
  };
}

function mkPhoto(id: string, projectId: string): Photo & { projectId: string } {
  return {
    id,
    projectId,
    dataUrl: 'data:image/png;base64,AAAA',
    timestamp: new Date('2026-01-02T10:00:00Z'),
    quality: { sharpness: 0.8, brightness: 0.5, contrast: 0.4, blurScore: 0.1, glareDetected: false, overallScore: 0.8 },
    coverage: 0,
    status: 'analyzed',
    width: 800,
    height: 600,
  };
}

async function seedProject() {
  const project = mkProject('proj-izvoz');
  await saveProject(project);
  await savePhoto(mkPhoto('ph-1', project.id));
  localStorage.setItem('currentProjectId', project.id);
  return project;
}

/** Prebere vsebino bloba (jsdom Blob nima .text()). */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** Zajame vsebine blobov, ki jih aplikacija ustvari pri izvozu. */
function captureBlobs() {
  const blobs: Blob[] = [];
  const spy = vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
    if (obj instanceof Blob) blobs.push(obj);
    return BLOCKED;
  });
  return { blobs, spy };
}

describe('Izvoz in varnostna kopija (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CSV izvoz ustvari datoteko z glavo meritve', async () => {
    const user = userEvent.setup();
    const { blobs } = captureBlobs();
    await seedProject();

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);
    await user.click(screen.getByRole('button', { name: /izvoz/i }));
    await user.click(await screen.findByRole('button', { name: /csv/i }));

    await waitFor(() => expect(blobs.length).toBeGreaterThan(0));
    const text = await readBlob(blobs[0]);
    // glava je slovenska, vrednost meritve pa mora biti vključena
    expect(text).toContain('Tip,Vrednost');
    expect(text).toContain('4.2');
  });

  it('JSON izvoz vsebuje projekt in meritve', async () => {
    const user = userEvent.setup();
    const { blobs } = captureBlobs();
    await seedProject();

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);
    await user.click(screen.getByRole('button', { name: /izvoz/i }));
    await user.click(await screen.findByRole('button', { name: /json/i }));

    await waitFor(() => expect(blobs.length).toBeGreaterThan(0));
    const data = JSON.parse(await readBlob(blobs[0]));
    expect(data.project.name).toBe('Izvozni projekt');
    expect(data.measurements.length).toBe(1);
    expect(data.measurements[0].value).toBe(4.2);
  });

  it('PDF izvoz brez dovoljenega popup okna prikaže razumljivo opozorilo', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'open').mockReturnValue(null);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    await seedProject();

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);
    await user.click(screen.getByRole('button', { name: /izvoz/i }));
    await user.click(await screen.findByRole('button', { name: /pdf/i }));

    expect(alertSpy).toHaveBeenCalled();
    expect(String(alertSpy.mock.calls[0][0])).toMatch(/popup/i);
  });

  it('varnostna kopija vsebuje fotografijo in jo je mogoče uvoziti nazaj', async () => {
    const user = userEvent.setup();
    const { blobs } = captureBlobs();
    await seedProject();

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);
    await user.click(screen.getByRole('button', { name: /izvoz/i }));
    await user.click(await screen.findByRole('button', { name: /varnostna kopija/i }));

    await waitFor(() => expect(blobs.length).toBeGreaterThan(0));
    const backupText = await readBlob(blobs[0]);
    const backup = JSON.parse(backupText);
    expect(backup.photos.length).toBe(1);
    expect(backup.photos[0].dataUrl).toBe('data:image/png;base64,AAAA');

    // --- uvoz iste kopije (ustvari nov projekt) ---
    const file = new File([backupText], 'kopija.json', { type: 'application/json' });
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();

    render(<App />);
    await screen.findByRole('button', { name: /ustvari projekt/i });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(async () => {
      const projekti = await getAllProjects();
      expect(projekti.map(p => p.name)).toContain('Izvozni projekt');
    });
  });

  it('uvoz neveljavne datoteke ne uniči obstoječih projektov', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    await seedProject();

    render(<App />);
    await screen.findByRole('button', { name: /ustvari projekt/i });

    const file = new File(['{to ni json'], 'napacna.json', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const projekti = await getAllProjects();
    expect(projekti.map(p => p.name)).toContain('Izvozni projekt');
  });
});
