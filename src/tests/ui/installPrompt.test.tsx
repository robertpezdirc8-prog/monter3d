// @vitest-environment jsdom
/**
 * UI test: ponudba namestitve (PWA) in indikator povezave.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { InstallPrompt } from '../../components/InstallPrompt';

describe('InstallPrompt (UI)', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('po dogodku beforeinstallprompt ponudi namestitev in jo izvede', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'accepted' as const });

    render(<InstallPrompt />);
    expect(screen.queryByText(/namesti/i)).toBeNull();

    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', { value: prompt });
    Object.defineProperty(event, 'userChoice', { value: userChoice });
    window.dispatchEvent(event);

    const gumb = await screen.findByText(/namesti/i);
    fireEvent.click(gumb);

    await waitFor(() => expect(prompt).toHaveBeenCalled());
    // Po uspešni namestitvi se gumb umakne.
    await waitFor(() => expect(screen.queryByText(/namesti/i)).toBeNull());
  });

  it('brez povezave pokaže opozorilo, da deluje lokalno', async () => {
    const original = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });

    render(<InstallPrompt />);
    expect(await screen.findByText(/brez povezave/i)).toBeInTheDocument();

    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(screen.queryByText(/brez povezave/i)).toBeNull());

    if (original) Object.defineProperty(window.navigator, 'onLine', original);
  });
});
