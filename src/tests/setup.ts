/**
 * Skupna nastavitev testov (neposredno za `setupFiles` v vitest.config.ts).
 *
 * Namen: testi logike tečejo v okolju `node` (brez DOM), UI testi pa v `jsdom`.
 * Tu dopolnimo obe okolji z osnovnimi nadomestki, ki jih brskalnik zagotavlja,
 * vendar jih jsdom nima.
 */

// IndexedDB v testih: uporabimo fake-indexeddb (najprej v node okolju).
import 'fake-indexeddb/auto';

// Dodatni matchers za Testing Library (toBeInTheDocument, toHaveTextContent, ...).
import '@testing-library/jest-dom/vitest';

// jsdom ne implementira URL.createObjectURL — potreben pri izvozu/backupu.
if (typeof globalThis.URL !== 'undefined' && typeof globalThis.URL.createObjectURL !== 'function') {
  globalThis.URL.createObjectURL = () => 'blob:mera3d-test';
  globalThis.URL.revokeObjectURL = () => undefined;
}

// jsdom nima matchMedia (uporablja ga kamera/UI).
if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.matchMedia !== 'function') {
  globalThis.window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.window.matchMedia;
}
