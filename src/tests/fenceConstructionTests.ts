/**
 * Mera3D Pro - Fence Construction Tests
 * 
 * Automated tests for fence construction calculations.
 * Tests cover all profiles, orientations, and technical constraints.
 */

import { describe, it, expect } from 'vitest';
import { calculateFenceConstruction, validateFenceConfiguration } from '../utils/fenceConstruction';
import { ROKSAL_PROFILES } from '../data/roksalCatalog';

describe('Fence Construction Calculator', () => {
  // Get profiles
  const polna57 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-57-32')!;
  const polna100 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-100')!;
  const polna128 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-128')!;
  const romb67 = ROKSAL_PROFILES.find(p => p.id === 'romb-deska-67')!;
  const deska150 = ROKSAL_PROFILES.find(p => p.id === 'deska-150')!;

  describe('Vertical Fence Calculations', () => {
    it('Test 1: POLNA 57/32 vertical - beam and post spacing limits', () => {
      const result = calculateFenceConstruction({
        profile: polna57,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.numberOfBeams).toBeGreaterThanOrEqual(2);
      expect(result.beamSpacing).toBeLessThanOrEqual(1000); // max 100cm between beams
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1500); // max 150cm between posts
    });

    it('Test 2: POLNA 100 vertical - 80cm beam spacing limit', () => {
      const result = calculateFenceConstruction({
        profile: polna100,
        orientation: 'vertical',
        fenceHeight: 1200,
        fenceLength: 4000,
        boardSpacing: 20
      });
      
      expect(result.beamSpacing).toBeLessThanOrEqual(800); // max 80cm between beams
    });

    it('Test 3: POLNA 128 vertical - 100cm beam spacing limit', () => {
      const result = calculateFenceConstruction({
        profile: polna128,
        orientation: 'vertical',
        fenceHeight: 1500,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      expect(result.beamSpacing).toBeLessThanOrEqual(1000); // max 100cm between beams
    });
  });

  describe('Horizontal Fence Calculations', () => {
    it('Test 4: ROMB 67 horizontal 145cm - valid configuration', () => {
      const result = calculateFenceConstruction({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1450,
        boardSpacing: 20
      });
      
      expect(result.valid).toBe(true);
      expect(result.actualPostSpacing).toBeLessThanOrEqual(1450);
      expect(result.requiresAluminumTube).toBe(true);
    });

    it('Test 5: ROMB 67 horizontal 160cm - requires additional connection', () => {
      const validation = validateFenceConfiguration({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1600,
        boardSpacing: 20,
        postSpacing: 1600
      });
      
      // Should have warning about additional connection needed
      const hasWarning = validation.warnings.some(w => 
        w.includes('145') || w.includes('dodatna') || w.includes('povezava')
      );
      expect(hasWarning).toBe(true);
    });

    it('Test 6: ROMB 67 horizontal 180cm - requires additional post', () => {
      const validation = validateFenceConfiguration({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1800,
        boardSpacing: 20,
        postSpacing: 1800
      });
      
      // Should have error or warning about additional post needed
      const hasIssue = validation.errors.length > 0 || 
                       validation.warnings.some(w => 
                         w.includes('180') || w.includes('stebriček')
                       );
      expect(hasIssue).toBe(true);
    });

    it('Test 7: DESKA 150 horizontal 140cm - error (exceeds 130cm)', () => {
      const validation = validateFenceConfiguration({
        profile: deska150,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1400,
        boardSpacing: 20,
        postSpacing: 1400
      });
      
      // Should have error because 1400 > 1300
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Technical Requirements', () => {
    it('Test 8: ROMB 67 requires aluminum tube', () => {
      const result = calculateFenceConstruction({
        profile: romb67,
        orientation: 'horizontal',
        fenceHeight: 1000,
        fenceLength: 1000,
        boardSpacing: 20
      });
      
      // ROMB always requires aluminum tube
      expect(result.requiresAluminumTube).toBe(true);
    });

    it('Test 9: POLNA 100 horizontal - invalid orientation', () => {
      const validation = validateFenceConfiguration({
        profile: polna100, // only vertical
        orientation: 'horizontal', // invalid
        fenceHeight: 1000,
        fenceLength: 3000,
        boardSpacing: 20
      });
      
      // Should have error about invalid orientation
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Board Coverage', () => {
    it('Test 10: Multiple lengths - full coverage', () => {
      const lengths = [2000, 3500, 5000, 7500];
      
      for (const length of lengths) {
        const result = calculateFenceConstruction({
          profile: polna128,
          orientation: 'vertical',
          fenceHeight: 1000,
          fenceLength: length,
          boardSpacing: 20
        });
        
        // Check if boards cover the full length
        const coveredLength = result.numberOfBoards * polna128.width + 
                             (result.numberOfBoards - 1) * result.actualBoardSpacing;
        
        // Allow 1mm tolerance
        expect(Math.abs(coveredLength - length)).toBeLessThanOrEqual(1);
      }
    });
  });
});
