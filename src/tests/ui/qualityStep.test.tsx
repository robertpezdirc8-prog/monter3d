// @vitest-environment jsdom
/**
 * UI test: korak »Kakovost« — pregled posnetkov in njihovih ocen.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { FenceConfigurator } from '../../components/FenceConfigurator';
import { saveProject, savePhoto, getAllProjects, deleteProject, getPhotosByProject } from '../../utils/storage';
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

const beforeEachClean = async () => {
  cleanup();
  await new Promise(resolve => setTimeout(resolve, 0));
  localStorage.clear();
  for (const p of await getAllProjects()) {
    await deleteProject(p.id);
  }
};

/** Ustvari projekt in v merilni korak doda ročno dolžino. */
async function projektZMeritvijo(dolzina: string, ime = 'Testni projekt') {
  const user = userEvent.setup();
  render(<App />);
  const input = await screen.findByPlaceholderText('npr. Ograja - Družina Novak');
  await user.clear(input);
  await user.type(input, ime);
  await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));

  await user.click(screen.getByRole('button', { name: /meritve/i }));
  const polje = await screen.findByLabelText(/ročna dolžina/i);
  await user.type(polje, dolzina);
  await user.click(screen.getByRole('button', { name: /dodaj meritve/i }));
  await screen.findByText(`${dolzina}00 m ±2.0%`);
  return user;
}

describe('Ročni vnos dolžine (UI)', () => {
  beforeEach(beforeEachClean);

  it('ročno vnesena dolžina se prikaže kot preverjena meritev', async () => {
    const user = await projektZMeritvijo('6.5', 'Ročna ograda');
    expect(user).toBeTruthy();
    expect(screen.getAllByText(/PREVERJENA/).length).toBeGreaterThan(0);
  });

  it('ročno vnesena dolžina gre v načrt ograje in predračun', async () => {
    const user = await projektZMeritvijo('6.5', 'Načrtna ograda');
    await user.click(screen.getByRole('button', { name: /materiali/i }));
    await user.click(await screen.findByRole('button', { name: /izračunaj ograjo/i }));
    await user.click(screen.getByRole('button', { name: /količine/i }));
    expect((await screen.findAllByText('6.50 m')).length).toBeGreaterThan(0);
  });
});

describe('Upravljanje napak uporabnika (UI)', () => {
  beforeEach(beforeEachClean);

  it('meritev se izbriše in ne ostane v načrtu', async () => {
    const user = await projektZMeritvijo('6.5', 'Napaka projekta');

    await user.click(screen.getByRole('button', { name: /izbriši meritev 6\.500 m/i }));

    await waitFor(() => {
      expect(screen.queryByText('6.500 m ±2.0%')).toBeNull();
    });
  });

  it('meritev je lahko izključena iz načrta (dokumentacijska)', async () => {
    const user = await projektZMeritvijo('6.5', 'Izkljucena ograda');

    await user.click(screen.getByRole('checkbox', { name: /vključi meritev 6\.500 m/i }));
    expect(await screen.findByText(/izključena/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /materiali/i }));
    await user.click(await screen.findByRole('button', { name: /izračunaj ograjo/i }));
    await user.click(screen.getByRole('button', { name: /količine/i }));

    await waitFor(() => {
      expect(screen.queryByText('6.50 m')).toBeNull();
    });
  });
});

describe('Dokumentacijska lista (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });

  it('odpre predogled in izvozi PNG (lokalno, brez nalaganja)', async () => {
    const user = userEvent.setup();
    const project = mkProject('proj-lista');
    await saveProject(project);
    await savePhoto(mkPhoto('ph-1', project.id, 'analyzed', 0.8));
    localStorage.setItem('currentProjectId', project.id);

    // canvas v jsdom nima 2D konteksta -> nadomestek
    const ctxStub = {
      fillRect: vi.fn(), fillText: vi.fn(), drawImage: vi.fn(), strokeRect: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      set fillStyle(_v: string) { /* noop */ },
      set font(_v: string) { /* noop */ },
      set textBaseline(_v: string) { /* noop */ },
      set lineWidth(_v: number) { /* noop */ },
      set strokeStyle(_v: string) { /* noop */ },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctxStub as unknown as CanvasRenderingContext2D
    );
    // jsdom ne nalaga slik -> nadomestek Image, ki takoj 'naloži'
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      set src(_value: string) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal('Image', FakeImage);

    // toBlob v jsdom ni implementiran -> nadomestek, ki vrne prazen Blob
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback) {
      cb(new Blob(['x'], { type: 'image/png' }));
    });

    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);

    await user.click(screen.getByRole('button', { name: /izvoz/i }));
    await user.click(await screen.findByRole('button', { name: /dokumentacijska lista/i }));

    expect((await screen.findAllByText(/Dokumentacijska lista/)).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/predogled dokumentacijske liste/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /izvozi png/i }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  });
});

describe('Označbe na fotografiji (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });

  it('odpre risanje in shrani skico v projekt', async () => {
    const user = userEvent.setup();
    const project = mkProject('proj-skica');
    await saveProject(project);
    await savePhoto(mkPhoto('ph-1', project.id, 'analyzed', 0.8));
    localStorage.setItem('currentProjectId', project.id);

    const ctxStub = {
      clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), rect: vi.fn(), clip: vi.fn(), save: vi.fn(), restore: vi.fn(),
      translate: vi.fn(),
      set strokeStyle(_v: string) { /* noop */ },
      set lineWidth(_v: number) { /* noop */ },
      set lineCap(_v: string) { /* noop */ },
      set lineJoin(_v: string) { /* noop */ },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctxStub as unknown as CanvasRenderingContext2D
    );
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = 800;
      height = 600;
      clientWidth = 800;
      clientHeight = 600;
      naturalWidth = 800;
      naturalHeight = 600;
      set src(_value: string) { setTimeout(() => this.onload?.(), 0); }
    }
    vi.stubGlobal('Image', FakeImage);

    render(<App />);
    await screen.findByText(/Zajem fotografij/i);

    // Odpri risanje čez posnetek.
    await user.click(screen.getByRole('button', { name: /označi fotografijo/i }));
    expect((await screen.findAllByText(/Označbe na fotografiji/)).length).toBeGreaterThan(0);

    const canvas = screen.getByLabelText(/platno za risanje označb/i);
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 200, clientY: 150, pointerId: 1 });

    await user.click(screen.getByRole('button', { name: /shrani skico/i }));

    // Skica je shranjena skupaj s fotografijo v bazi.
    await waitFor(async () => {
      const shranjene = await getPhotosByProject(project.id);
      expect(shranjene[0].annotation?.strokes.length).toBe(1);
    });
  });
});


describe('Razveljavi po brisanju (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });

  it('izbrisana meritev se lahko razveljavi', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = await screen.findByPlaceholderText('npr. Ograja - Družina Novak');
    await user.clear(input);
    await user.type(input, 'Undo projekt');
    await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));

    await user.click(screen.getByRole('button', { name: /meritve/i }));
    const polje = await screen.findByLabelText(/ročna dolžina/i);
    await user.type(polje, '4.5');
    await user.click(screen.getByRole('button', { name: /dodaj meritve/i }));
    await screen.findByText('4.500 m ±2.0%');

    // Izbriši meritev -> pojavi se ponudba za razveljavo.
    await user.click(screen.getByRole('button', { name: /izbriši meritev 4\.500 m/i }));
    expect(await screen.findByText(/meritev je izbrisana/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('4.500 m ±2.0%')).toBeNull());

    // Razveljavi -> meritev je nazaj.
    await user.click(screen.getByRole('button', { name: /razveljavi/i }));
    expect(await screen.findByText('4.500 m ±2.0%')).toBeInTheDocument();
  });

  it('več zaporednih brisanj lahko razveljavimo eno za drugim', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = await screen.findByPlaceholderText('npr. Ograja - Družina Novak');
    await user.clear(input);
    await user.type(input, 'Zgodovina projekt');
    await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));

    await user.click(screen.getByRole('button', { name: /meritve/i }));
    const polje = await screen.findByLabelText(/ročna dolžina/i);

    // Dodaj dve meritvi.
    await user.type(polje, '4.5');
    await user.click(screen.getByRole('button', { name: /dodaj meritve/i }));
    await screen.findByText('4.500 m ±2.0%');
    await user.type(polje, '3.2');
    await user.click(screen.getByRole('button', { name: /dodaj meritve/i }));
    await screen.findByText('3.200 m ±2.0%');

    // Izbriši prvo, nato drugo -> dve razveljivi akciji.
    await user.click(screen.getByRole('button', { name: /izbriši meritev 4\.500 m/i }));
    await screen.findByText(/meritev je izbrisana/i);
    await user.click(screen.getByRole('button', { name: /izbriši meritev 3\.200 m/i }));

    // Prikazano je, da sta razveljivi dve akciji.
    expect(await screen.findByText(/1 še razveljivih/i)).toBeInTheDocument();

    // Razveljavi -> nazadnja izbrisana meritev.
    await user.click(screen.getByRole('button', { name: /razveljavi/i }));
    expect(await screen.findByText('3.200 m ±2.0%')).toBeInTheDocument();
    expect(screen.queryByText('4.500 m ±2.0%')).toBeNull();

    // Razveljavi še enkrat -> nazaj je tudi prva.
    await user.click(screen.getByRole('button', { name: /razveljavi/i }));
    expect(await screen.findByText('4.500 m ±2.0%')).toBeInTheDocument();
  });
});


describe('Konfigurator ograje (UI)', () => {
  it('iskanje profila, izbira in prenos v projekt', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onClose = vi.fn();

    render(<FenceConfigurator onClose={onClose} onApply={onApply} />);

    // Iskanje profila filtrira seznam.
    const iskanje = screen.getByLabelText(/profil \(iskanje\)/i);
    await user.type(iskanje, 'romb');

    const izbirnik = screen.getByRole('combobox', { name: /izberite profil/i }) as HTMLSelectElement;
    const možnosti = Array.from(izbirnik.options).map(o => o.value);
    expect(možnosti.length).toBeGreaterThan(0);
    expect(možnosti.every(id => id === '' || id.includes('romb'))).toBe(true);

    // Izberi profil in prenosi konfiguracijo v projekt.
    const prvi = možnosti.find(id => id !== '');
    await user.selectOptions(izbirnik, prvi!);
    await user.click(screen.getByRole('button', { name: /uporabi v projektu/i }));

    expect(onApply).toHaveBeenCalled();
    const preneseno = onApply.mock.calls[0][0] as { profileId: string; boardSpacingMm: number };
    expect(preneseno.profileId).toBe(prvi);
    expect(preneseno.boardSpacingMm).toBeGreaterThan(0);
  });
});


describe('Zgodovina projekta (UI)', () => {
  beforeEach(async () => {
    cleanup();
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
  });

  it('dnevnik prikaže opravljena dejanja', async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = await screen.findByPlaceholderText('npr. Ograja - Družina Novak');
    await user.clear(input);
    await user.type(input, 'Zgodovina projekt');
    await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));

    await user.click(screen.getByRole('button', { name: /zgodovina/i }));

    expect(await screen.findByText(/Zgodovina projekta/)).toBeInTheDocument();
    // Dogodek o ustvaritvi projekta je zabeležen.
    expect(await screen.findByText(/Projekt »Zgodovina projekt« je ustvarjen/)).toBeInTheDocument();
  });
});


describe('Korak Kakovost (UI)', () => {
  beforeEach(beforeEachClean);

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
