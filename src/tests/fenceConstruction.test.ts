/**
 * Mera3D Pro - Fence Construction Tests
 * 
 * Dejanski testi za izračune konstrukcije ograje.
 * Testi pokrivajo vse profile, orientacije in tehnične omejitve.
 */

import { describe, it, expect } from 'vitest';
import { calculateFenceConstruction, validateFenceConfiguration } from '../utils/fenceConstruction';
import { ROKSAL_PROFILES } from '../data/roksalCatalog';

describe('Fence Construction Calculator', () => {
  const polna57 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-57-32')!;
  const polna100 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-100')!;
  const polna128 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-128')!;
  const romb67 = ROKSAL_PROFILES.find(p => p.id === 'romb-deska-67')!;
  const deska150 = ROKSAL_PROFILES.find(p => p.id === 'deska-150')!;
  const kubo = ROKSAL_PROFILES.find(p => p.id === 'kubo-80-42')!;

  describe('Robni primeri - razmiki desk', () => {
    it('Test: Dolžina 121mm, širina 100mm, razmik 20mm - ne sme biti veljavno', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 121,
        boardSpacing: 20
      });
      
      // 121mm ne more pokriti z 100mm desko + 20mm razmikom
      // Ena deska (100mm) pusti 21mm nepokritega
      // Dve deski (200mm) presežeta 121mm
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Test: Ena deska brez razmika - veljavno', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 100,
        boardSpacing: 0
      });
      
      expect(result.numberOfBoards).toBe(1);
      expect(result.actualBoardSpacing).toBe(0);
      expect(result.valid).toBe(true);
    });

    it('Test: Več desk pri minimalnem razmiku (5mm)', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 1000,
        boardSpacing: 5
      });
      
      expect(result.numberOfBoards).toBeGreaterThan(1);
      expect(result.actualBoardSpacing).toBeGreaterThanOrEqual(5);
      expect(result.actualBoardSpacing).toBeLessThanOrEqual(30);
    });

    it('Test: Več desk pri maksimalnem razmiku (30mm)', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 1000,
        boardSpacing: 30
      });
      
      expect(result.numberOfBoards).toBeGreaterThan(1);
      expect(result.actualBoardSpacing).toBeLessThanOrEqual(30);
    });

    it('Test: Pokritost robov - deske morajo pokriti celotno dolžino', () => {
      const lengths = [500, 1000, 1500, 2000, 2500];
      
      for (const length of lengths) {
        const result = calculateFenceConstruction({
          profile: polna128,
          orientation: 'vertical',
          fenceHeight: 1000,
          fenceLength: length,
          boardSpacing: 20
        });
        
        // Preveri pokritost
        const coveredLength = result.numberOfBoards * result.effectiveWidth + 
                             (result.numberOfBoards - 1) * result.actualBoardSpacing;
        
        // Dovoljena napaka: 1mm
        expect(Math.abs(coveredLength - length)).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Izračun stebričkov', () => {
    it('Test: Dolžina 3000mm, max razmak 1500mm - 3 stebrički', () => {
      const result = calculateFenceConstruction({
        profile: polna57,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.numberOfPosts).toBe(3);
      expect(result.actualPostSpacing).toBe(1500);
      expect(result.postSpacingValid).toBe(true);
    });

    it('Test: Dolžina 3500mm, max razmak 1500mm - 3 stebrički, manjši razmak', () => {
      const result = calculateFenceConstruction({
        profile: polna57,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 3500,
        boardSpacing: 20
      });
      
      // 3500mm / 1500mm = 2.33 -> 3 stebrički
      // Dejanski razmak: 3500 / 2 = 1750mm (presega max!)
      // Pravilno: 4 stebrički, razmak 1167mm
      expect(result.numberOfPosts).toBeGreaterThanOrEqual(3);
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1500);
    });

    it('Test: Dolžina 5800mm, max razmak 1800mm - pravilen izračun', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 5800,
        boardSpacing: 20
      });
      
      // 5800mm / 1800mm = 3.22 -> 4 stebrički
      // Dejanski razmak: 5800 / 3 = 1933mm (presega max!)
      // Pravilno: 5 stebričkov, razmak 1450mm
      expect(result.numberOfPosts).toBeGreaterThanOrEqual(4);
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1800);
    });

    it('Test: Uporabniški razmak stebričkov', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20,
        postSpacing: 1000
      });
      
      expect(result.actualPostSpacing).toBe(1000);
      expect(result.numberOfPosts).toBe(4); // 0, 1000, 2000, 3000
    });
  });

  describe('Načrt rezanja', () => {
    it('Test: 3 kosi po 1200mm iz 2200mm profila - 3 deske, ne 2', () => {
      const result = calculateFenceConstruction({
        profile: polna128, // dolžina 2200mm
        orientation: 'vertical',
        fenceHeight: 1200, // vsaka deska 1200mm
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      // Iz 2200mm profila lahko izrežemo samo 1 kos 1200mm
      expect(result.cutsPerProfile).toBe(1);
      
      // Če potrebujemo 3 kose po 1200mm, potrebujemo 3 profile
      expect(result.profilesNeeded).toBe(3);
    });

    it('Test: Optimizacija razreza - 2 kosa po 1000mm iz 2200mm', () => {
      const result = calculateFenceConstruction({
        profile: polna128, // dolžina 2200mm
        orientation: 'vertical',
        fenceHeight: 1000, // vsaka deska 1000mm
        fenceLength: 2000,
        boardSpacing: 20
      });
      
      // Iz 2200mm profila lahko izrežemo 2 kosa 1000mm
      expect(result.cutsPerProfile).toBe(2);
    });

    it('Test: Odpad pri rezanju', () => {
      const result = calculateFenceConstruction({
        profile: polna128,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      // Odpad mora biti >= 0
      expect(result.waste).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Tehnična združljivost', () => {
    it('Test: ROMB 67 brez aluminijaste cevi - neveljavno', () => {
      const result = calculateFenceConstruction({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1000,
        boardSpacing: 20
      });
      
      // ROMB vedno zahteva aluminijasto cev
      expect(result.requiresAluminumTube).toBe(true);
    });

    it('Test: POLNA 100 prečno - nedovoljena orientacija', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'horizontal', // nedovoljeno
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Test: DESKA 150 pokončno - nedovoljena orientacija', () => {
      const result = calculateFenceConstruction({
        profile: deska150,
        orientation: 'vertical', // nedovoljeno
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Test: Razmak stebričkov presega maksimum', () => {
      const result = calculateFenceConstruction({
        profile: polna57,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20,
        postSpacing: 2000 // presega max 1500mm
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('presega'))).toBe(true);
    });

    it('Test: KUBO uporablja svoja pravila', () => {
      const result = calculateFenceConstruction({
        profile: kubo,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 2000,
        boardSpacing: 40
      });
      
      // KUBO ima max razmak 1200mm brez ojačitve
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1200);
    });
  });

  describe('Pokončne ograje - razmiki nosilcev', () => {
    it('Test: POLNA 57/32 - max 1000mm med nosilci', () => {
      const result = calculateFenceConstruction({
        profile: polna57,
        orientation: 'vertical',
        fenceHeight: 1500,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.beamSpacing).toBeLessThanOrEqual(1000);
    });

    it('Test: POLNA 100 - max 800mm med nosilci', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1200,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.beamSpacing).toBeLessThanOrEqual(800);
    });

    it('Test: POLNA 128 - max 1000mm med nosilci', () => {
      const result = calculateFenceConstruction({
        profile: polna128,
        orientation: 'vertical',
        fenceHeight: 1500,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.beamSpacing).toBeLessThanOrEqual(1000);
    });

    it('Test: ROMB 67 - max 1100mm med nosilci', () => {
      const result = calculateFenceConstruction({
        profile: romb67,
        orientation: 'vertical',
        fenceHeight: 1500,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.beamSpacing).toBeLessThanOrEqual(1100);
    });
  });

  describe('Prečne ograje - razmiki stebričkov', () => {
    it('Test: ROMB 67 prečno 1450mm - veljavno', () => {
      const result = calculateFenceConstruction({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1450,
        boardSpacing: 20
      });
      
      expect(result.valid).toBe(true);
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1450);
    });

    it('Test: ROMB 67 prečno 1600mm - zahteva dodatno povezavo', () => {
      const validation = validateFenceConfiguration({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1600,
        boardSpacing: 20,
        postSpacing: 1600
      });
      
      expect(validation.warnings.some(w => 
        w.includes('145') || w.includes('dodatna') || w.includes('povezava')
      )).toBe(true);
    });

    it('Test: ROMB 67 prečno 1800mm - zahteva dodaten stebriček', () => {
      const validation = validateFenceConfiguration({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1800,
        boardSpacing: 20,
        postSpacing: 1800
      });
      
      expect(validation.errors.length > 0 || 
             validation.warnings.some(w => w.includes('180') || w.includes('stebriček'))
      ).toBe(true);
    });

    it('Test: DESKA 150 prečno 1300mm - veljavno', () => {
      const result = calculateFenceConstruction({
        profile: deska150,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1300,
        boardSpacing: 20
      });
      
      expect(result.valid).toBe(true);
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1300);
    });

    it('Test: DESKA 150 prečno 1400mm - neveljavno', () => {
      const validation = validateFenceConfiguration({
        profile: deska150,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1400,
        boardSpacing: 20,
        postSpacing: 1400
      });
      
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
