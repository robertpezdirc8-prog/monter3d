// @vitest-environment jsdom
/**
 * UI test: merilni tok od fotografije do metrične meritve.
 *
 * To je jedro aplikacije — klik na fotografijo naredi meritev v slikovnih
 * točkah, kalibracija z referenčno dolžino pa jo pretvori v metre.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { saveProject, savePhoto, getAllProjects, deleteProject } from '../../utils/storage';
import type { Project, Photo } from '../../types';

// jsdom nima canvasa — nadomestimo 2D kontekst z brezdelčnimi funkcijami.
const ctxStub = {
  fillRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn(), clearRect: vi.fn(),
  beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), setLineDash: vi.fn(), save: vi.fn(), restore: vi.fn(), closePath: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  measureText: vi.fn(() => ({ width: 10 })),
};

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => ctxStub) as unknown as HTMLCanvasElement['getContext'];
  HTMLCanvasElement.prototype.getBoundingClientRect = (() => ({
    left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0,
    toJSON: () => ({}),
  })) as unknown as HTMLCanvasElement['getBoundingClientRect'];
});

function mkProject(id: string): Project {
  return {
    id,
    name: 'Merilni projekt',
    objectType: 'fence',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    photos: [],
    measurements: [],
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

async function seedProjectWithPhoto() {
  const project = mkProject('proj-meritev');
  await saveProject(project);
  await savePhoto(mkPhoto('photo-1', project.id));
  localStorage.setItem('currentProjectId', project.id);
}

describe('Merilni tok (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
    vi.restoreAllMocks();
  });

  it('klik na fotografijo naredi meritev, kalibracija pa jo pretvori v metre', async () => {
    const user = userEvent.setup();
    await seedProjectWithPhoto();

    render(<App />);
    // Počakamo, da se projekt DEJANSKO naloži (korak »Zajem« se prikaže šele po
    // openProject). Sicer lahko klik na navigacijo pride pretoo, kot se projekt naloži,
    // in nalaganje nato korak prepiše nazaj — to je bila vzrok za občasni flake.
    expect(await screen.findByText(/Zajem fotografij/i)).toBeInTheDocument();
    expect(screen.getAllByText('Merilni projekt').length).toBeGreaterThan(0);

    // --- Meritev (brez kalibracije je v slikovnih točkah) ---
    await user.click(screen.getByRole('button', { name: /meritve/i }));
    await user.click(await screen.findByRole('button', { name: /novo merjenje/i }));

    const canvas = screen.getByLabelText(/merilno platno – meritve/i) as HTMLCanvasElement;
    fireEvent.click(canvas, { clientX: 10, clientY: 20 });
    fireEvent.click(canvas, { clientX: 110, clientY: 20 });

    expect(await screen.findByText('100.00 px ±20.0%')).toBeInTheDocument();
    expect(screen.getAllByText(/OPOZORILO/).length).toBeGreaterThan(0);

    // --- Kalibracija: 100 px = 2 m -> merilo 0,02 m/px ---
    await user.click(screen.getByRole('button', { name: /merilo/i }));
    const scaleCanvas = screen.getByLabelText(/merilno platno – merilo/i) as HTMLCanvasElement;
    fireEvent.click(scaleCanvas, { clientX: 10, clientY: 20 });
    fireEvent.click(scaleCanvas, { clientX: 110, clientY: 20 });

    const input = await screen.findByPlaceholderText('Dolžina v metrih');
    await user.type(input, '2');
    await user.click(screen.getByRole('button', { name: /potrdi merilo/i }));

    expect(await screen.findByText(/Merilo: 0\.02000 m\/px/)).toBeInTheDocument();

    // --- Meritve so zdaj metrične in preverjene ---
    await user.click(screen.getByRole('button', { name: /meritve/i }));
    expect(await screen.findByText('2.000 m ±3.0%')).toBeInTheDocument();
    expect(screen.getAllByText(/PREVERJENA/).length).toBeGreaterThan(0);

    // Referenčna kalibracija se ne sme prikazati kot še ena meritev objekta.
    await waitFor(() => {
      const vrstice = document.querySelectorAll('tbody tr');
      expect(vrstice.length).toBe(1);
    });
    // V tabeli je samo metrična meritev objekta (2.000 m), brez referenčne.
    expect(document.body.textContent).toContain('2.000 m ±3.0%');
    expect(document.body.textContent).not.toContain('2.000 m ±2.0%');
  });
});
