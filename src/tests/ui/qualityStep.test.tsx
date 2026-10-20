// @vitest-environment jsdom
/**
 * UI test: korak »Kakovost« — pregled posnetkov in njihovih ocen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { saveProject, savePhoto, getAllProjects, deleteProject } from '../../utils/storage';
import type { Project, Photo } from '../../types';

function mkProject(id: string): Project {
  return {
    id,
    name: 'Kakovostni projekt',
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

function mkPhoto(id: string, projectId: string, status: Photo['status'], overall: number): Photo & { projectId: string } {
  return {
    id,
    projectId,
    dataUrl: 'data:image/png;base64,AAAA',
    timestamp: new Date('2026-01-02T10:00:00Z'),
    quality: {
      sharpness: 0.8, brightness: 0.5, contrast: 0.4,
      blurScore: overall > 0.4 ? 0 : 1,
      glareDetected: false,
      overallScore: overall,
    },
    coverage: 0,
    status,
    width: 800,
    height: 600,
  };
}

describe('Ročni vnos dolžine (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });

  it('ročno vnesena dolžina se prikaže kot preverjena meritev', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = await screen.findByPlaceholderText('npr. Ograja - Družina Novak');
    await user.clear(input);
    await user.type(input, 'Ročna ograda');
    await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));

    await user.click(screen.getByRole('button', { name: /meritve/i }));

    const polje = await screen.findByLabelText(/ročna dolžina/i);
    await user.type(polje, '6.5');
    await user.click(screen.getByRole('button', { name: /dodaj meritve/i }));

    expect(await screen.findByText('6.500 m ±2.0%')).toBeInTheDocument();
    expect(screen.getAllByText(/PREVERJENA/).length).toBeGreaterThan(0);
  });

  it('ročno vnesena dolžina gre v načrt ograje in predračun', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = await screen.findByPlaceholderText('npr. Ograja - Družina Novak');
    await user.clear(input);
    await user.type(input, 'Načrtna ograda');
    await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));

    await user.click(screen.getByRole('button', { name: /meritve/i }));
    const polje = await screen.findByLabelText(/ročna dolžina/i);
    await user.type(polje, '6.5');
    await user.click(screen.getByRole('button', { name: /dodaj meritve/i }));
    await screen.findByText('6.500 m ±2.0%');

    // Materiali -> izračunaj ograjo
    await user.click(screen.getByRole('button', { name: /materiali/i }));
    await user.click(await screen.findByRole('button', { name: /izračunaj ograjo/i }));

    // Količine -> skupna dolžina mora biti 6,50 m
    await user.click(screen.getByRole('button', { name: /količine/i }));
    expect((await screen.findAllByText('6.50 m')).length).toBeGreaterThan(0);
  });
});

  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });


describe('Korak Kakovost (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });

  it('prikaže število sprejetih, čakajočih in zavrnjenih posnetkov', async () => {
    const user = userEvent.setup();
    const project = mkProject('proj-kakovost');
    await saveProject(project);
    await savePhoto(mkPhoto('good-1', project.id, 'analyzed', 0.8));
    await savePhoto(mkPhoto('bad-1', project.id, 'rejected', 0.2));
    await savePhoto(mkPhoto('wait-1', project.id, 'pending', 0.5));
    localStorage.setItem('currentProjectId', project.id);

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);

    await user.click(screen.getByRole('button', { name: /kakovost/i }));

    expect(await screen.findByText(/Kontrola kakovosti/)).toBeInTheDocument();
    expect(screen.getByText('Sprejeto')).toBeInTheDocument();
    expect(screen.getByText('V čakanju')).toBeInTheDocument();
    expect(screen.getByText('Zavrnjeno')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });
    // Ostrina posnetka je prikazana v odstotkih.
    expect(screen.getAllByText(/Ostrina: 80%/).length).toBeGreaterThan(0);
  });

  it('brez fotografij prikaže obvestilo, da je treba najprej zajeti posnetke', async () => {
    const user = userEvent.setup();
    const project = mkProject('proj-brez-foto');
    await saveProject(project);
    localStorage.setItem('currentProjectId', project.id);

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);
    await user.click(screen.getByRole('button', { name: /kakovost/i }));

    expect(await screen.findByText(/Ni fotografij/i)).toBeInTheDocument();
  });
});
