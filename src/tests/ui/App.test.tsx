// @vitest-environment jsdom
/**
 * UI testi (jsdom + Testing Library) — preverjajo tok uporabnika, ne samo logiko.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { getAllProjects, deleteProject } from '../../utils/storage';

const IME_PROJEKT = 'npr. Ograja - Družina Novak';

async function ustvariProjekt(ime = 'Testna ograda'): Promise<void> {
  const user = userEvent.setup();
  const input = await screen.findByPlaceholderText(IME_PROJEKT);
  await user.clear(input);
  await user.type(input, ime);
  await user.click(screen.getByRole('button', { name: /ustvari projekt/i }));
}

describe('App — tok projekta (UI)', () => {
  beforeEach(async () => {
    cleanup();
    // Pustimo, da se končajo morebitna asinhrona nalaganja iz prejšnjega testa,
    // nato počistimo shrambo — vsak test se začne s prazno bazo in brez projekta,
    // zato se samodejno naložen projekt ne pojavi.
    await new Promise(resolve => setTimeout(resolve, 0));
    localStorage.clear();
    for (const p of await getAllProjects()) {
      await deleteProject(p.id);
    }
    vi.restoreAllMocks();
  });

  it('ustvari projekt in ga prikaže v glavi', async () => {
    render(<App />);
    await ustvariProjekt('Moja ograda');

    // Ime se prikaže v glavi in v stranski vrstici (preklopnik projekta).
    expect((await screen.findAllByText('Moja ograda')).length).toBeGreaterThan(0);

    const projekti = await getAllProjects();
    expect(projekti.map(p => p.name)).toContain('Moja ograda');
  });

  it('projekt preživi osvežitev (se znova naloži iz IndexedDB)', async () => {
    const { unmount } = render(<App />);
    await ustvariProjekt('Trajna ograda');
    await waitFor(async () => {
      expect((await getAllProjects()).length).toBeGreaterThan(0);
    });

    // Simulacija osvežitve strani: komponenta se razmontira in naloži znova.
    unmount();
    render(<App />);

    expect((await screen.findAllByText('Trajna ograda')).length).toBeGreaterThan(0);
  });

  it('projekt se odpre s seznama in ga je mogoče izbrisati', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<App />);
    await ustvariProjekt('Izbrisana ograda');

    // Nazaj na korak »Nov projekt« (navbar).
    await user.click(screen.getByRole('button', { name: /nov projekt/i }));

    const gumbZaBrisanje = await screen.findByRole('button', { name: /izbriši projekt izbrisana ograda/i });
    await user.click(gumbZaBrisanje);

    await waitFor(async () => {
      const projekti = await getAllProjects();
      expect(projekti.map(p => p.name)).not.toContain('Izbrisana ograda');
    });
  });

  it('obvestilo o napaki pri brisanju ne izgubi projekta', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<App />);
    await ustvariProjekt('Zadržana ograda');
    await user.click(screen.getByRole('button', { name: /nov projekt/i }));

    const gumb = await screen.findByRole('button', { name: /izbriši projekt zadržana ograda/i });
    await user.click(gumb);

    const projekti = await getAllProjects();
    expect(projekti.map(p => p.name)).toContain('Zadržana ograda');
  });
});
