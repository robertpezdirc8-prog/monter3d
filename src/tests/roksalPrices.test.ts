/**
 * Testi cenika: privzete vrednosti, shranjevanje in nalaganje uporabniškega cenika.
 *
 * Monter oziroma vodstvo določi cene samo — zato mora shramba pravilno ločiti
 * med privzetim DEMO cenikom in shranjenim uporabniškim cenikom.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ROKSAL_PRICE_LIST,
  PRICE_LIST_STORAGE_KEY,
  isPriceListValid,
  loadRoksalPriceList,
  resetRoksalPriceList,
  saveRoksalPriceList
} from '../data/roksalPrices';

function createStorageMock(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    }
  } as unknown as Storage;
}

describe('Roksal cenik', () => {
  describe('isPriceListValid', () => {
    it('privzeti DEMO cenik je veljaven', () => {
      expect(isPriceListValid(DEFAULT_ROKSAL_PRICE_LIST)).toBe(true);
    });

    it('zavrne negativno ceno', () => {
      expect(isPriceListValid({ ...DEFAULT_ROKSAL_PRICE_LIST, postPriceEach: -1 })).toBe(false);
    });

    it('zavrne neštevilsko vrednost', () => {
      expect(
        isPriceListValid({ ...DEFAULT_ROKSAL_PRICE_LIST, laborRatePerHour: Number.NaN })
      ).toBe(false);
    });
  });

  describe('shramba', () => {
    const originalStorage = (globalThis as { localStorage?: Storage }).localStorage;

    beforeEach(() => {
      (globalThis as { localStorage?: Storage }).localStorage = createStorageMock();
    });

    afterEach(() => {
      (globalThis as { localStorage?: Storage }).localStorage = originalStorage;
    });

    it('brez shranjenega cenika vrne privzeti DEMO cenik', () => {
      const list = loadRoksalPriceList();
      expect(list.isDemo).toBe(true);
      expect(list.version).toBe(DEFAULT_ROKSAL_PRICE_LIST.version);
    });

    it('shrani in naloži uporabniški cenik', () => {
      const custom = {
        ...DEFAULT_ROKSAL_PRICE_LIST,
        label: 'Moj cenik',
        profilePricePerM2: 99.5
      };
      expect(saveRoksalPriceList(custom)).toBe(true);

      const loaded = loadRoksalPriceList();
      expect(loaded.isDemo).toBe(false);
      expect(loaded.label).toBe('Moj cenik');
      expect(loaded.profilePricePerM2).toBe(99.5);
      expect(loaded.updatedAt).toBeTruthy();
    });

    it('ne shrani neveljavnega cenika', () => {
      expect(saveRoksalPriceList({ ...DEFAULT_ROKSAL_PRICE_LIST, beamPricePerM: -5 })).toBe(false);
      expect(loadRoksalPriceList().isDemo).toBe(true);
    });

    it('ob pokvarjenem zapisu vrne privzeti cenik', () => {
      globalThis.localStorage.setItem(PRICE_LIST_STORAGE_KEY, '{napaka');
      expect(loadRoksalPriceList().isDemo).toBe(true);
    });

    it('ob neveljavnih shranjenih vrednostih vrne privzeti cenik', () => {
      globalThis.localStorage.setItem(
        PRICE_LIST_STORAGE_KEY,
        JSON.stringify({ ...DEFAULT_ROKSAL_PRICE_LIST, profilePricePerM2: -10 })
      );
      expect(loadRoksalPriceList().profilePricePerM2).toBe(
        DEFAULT_ROKSAL_PRICE_LIST.profilePricePerM2
      );
    });

    it('reset izbriše shranjeni cenik', () => {
      saveRoksalPriceList({ ...DEFAULT_ROKSAL_PRICE_LIST, label: 'Test' });
      resetRoksalPriceList();
      expect(globalThis.localStorage.getItem(PRICE_LIST_STORAGE_KEY)).toBeNull();
      expect(loadRoksalPriceList().isDemo).toBe(true);
    });

    it('ob nedosegljivi shrambi vrne privzeti cenik in ne shrani', () => {
      (globalThis as { localStorage?: Storage }).localStorage = {
        getItem: () => {
          throw new Error('shramba ni dosegljiva');
        },
        setItem: () => {
          throw new Error('shramba ni dosegljiva');
        },
        removeItem: () => {
          throw new Error('shramba ni dosegljiva');
        }
      } as unknown as Storage;

      expect(loadRoksalPriceList().isDemo).toBe(true);
      expect(saveRoksalPriceList({ ...DEFAULT_ROKSAL_PRICE_LIST, isDemo: false })).toBe(false);
      expect(() => resetRoksalPriceList()).not.toThrow();
    });
  });
});
