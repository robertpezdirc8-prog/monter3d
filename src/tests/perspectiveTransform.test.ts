/**
 * Mera3D Pro - Perspective Transform Tests
 * 
 * Tests for perspective warping with known coordinates.
 * Verifies geometric accuracy of the DLT algorithm.
 */

import { describe, it, expect } from 'vitest';
import { computePerspectiveMatrix, computeMeasurementError } from '../utils/perspectiveTransform';

describe('Perspective Transform', () => {
  describe('DLT Algorithm', () => {
    it('Test: Identity transform - square to square', () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 100, y: 0 },
        bottomRight: { x: 100, y: 100 },
        bottomLeft: { x: 0, y: 100 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 100, 100);
      
      // Should be close to identity matrix
      expect(matrix).toHaveLength(9);
      expect(matrix[0]).toBeCloseTo(1, 1); // h00
      expect(matrix[4]).toBeCloseTo(1, 1); // h11
      expect(matrix[8]).toBeCloseTo(1, 1); // h22
      expect(matrix[1]).toBeCloseTo(0, 1); // h01
      expect(matrix[2]).toBeCloseTo(0, 1); // h02
      expect(matrix[3]).toBeCloseTo(0, 1); // h10
      expect(matrix[5]).toBeCloseTo(0, 1); // h12
    });

    it('Test: Scale transform - small square to large rectangle', () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 50, y: 0 },
        bottomRight: { x: 50, y: 50 },
        bottomLeft: { x: 0, y: 50 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 200, 200);
      
      // Should scale by 4x (50 -> 200)
      expect(matrix).toHaveLength(9);
      expect(matrix[0]).toBeCloseTo(4, 0); // h00 ≈ 4
      expect(matrix[4]).toBeCloseTo(4, 0); // h11 ≈ 4
    });

    it('Test: Translation transform', () => {
      const corners = {
        topLeft: { x: 100, y: 100 },
        topRight: { x: 200, y: 100 },
        bottomRight: { x: 200, y: 200 },
        bottomLeft: { x: 100, y: 200 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 100, 100);
      
      // Should translate by (-100, -100)
      expect(matrix).toHaveLength(9);
      // Translation is encoded in h02 and h12
      expect(matrix[0]).toBeCloseTo(1, 0); // Scale X
      expect(matrix[4]).toBeCloseTo(1, 0); // Scale Y
    });

    it('Test: Perspective distortion - trapezoid to rectangle', () => {
      // Simulate a fence viewed at an angle (trapezoid shape)
      const corners = {
        topLeft: { x: 50, y: 20 },
        topRight: { x: 150, y: 20 },
        bottomRight: { x: 180, y: 180 },
        bottomLeft: { x: 20, y: 180 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 160, 160);
      
      // Matrix should be valid (not all zeros)
      expect(matrix).toHaveLength(9);
      expect(matrix.some(v => Math.abs(v) > 0.001)).toBe(true);
      
      // h22 should be normalized to 1
      expect(matrix[8]).toBeCloseTo(1, 3);
    });
  });

  describe('Measurement Error', () => {
    it('Test: Perfect measurement - zero error', () => {
      const error = computeMeasurementError(
        1000, // knownWidthMm
        1000, // knownHeightMm
        10,   // pixelToMmRatioX (10px = 1mm)
        10,   // pixelToMmRatioY
        100,  // measuredWidthPx
        100   // measuredHeightPx
      );
      
      expect(error.widthErrorMm).toBeCloseTo(0, 5);
      expect(error.heightErrorMm).toBeCloseTo(0, 5);
      expect(error.totalErrorMm).toBeCloseTo(0, 5);
    });

    it('Test: Small measurement error - 5mm', () => {
      const error = computeMeasurementError(
        1000, // knownWidthMm
        1000, // knownHeightMm
        10,   // pixelToMmRatioX
        10,   // pixelToMmRatioY
        100.5, // measuredWidthPx (0.5px error = 5mm)
        100   // measuredHeightPx
      );
      
      expect(error.widthErrorMm).toBeCloseTo(5, 1);
      expect(error.heightErrorMm).toBeCloseTo(0, 5);
      expect(error.totalErrorMm).toBeCloseTo(5, 1);
    });

    it('Test: Larger measurement error - realistic scenario', () => {
      // Simulate a fence measurement with perspective distortion
      const error = computeMeasurementError(
        2000, // knownWidthMm (2m fence)
        1000, // knownHeightMm (1m height)
        5,    // pixelToMmRatioX (5px = 1mm)
        5,    // pixelToMmRatioY
        405,  // measuredWidthPx (expected 400px, 5px error = 25mm)
        202   // measuredHeightPx (expected 200px, 2px error = 10mm)
      );
      
      expect(error.widthErrorMm).toBeCloseTo(25, 0);
      expect(error.heightErrorMm).toBeCloseTo(10, 0);
      // Total error is Euclidean distance
      expect(error.totalErrorMm).toBeCloseTo(Math.sqrt(25**2 + 10**2), 0);
    });

    it('Test: Error within acceptable tolerance for fence measurement', () => {
      // For fence installation, ±50mm is typically acceptable
      const error = computeMeasurementError(
        3000, // knownWidthMm (3m fence)
        1500, // knownHeightMm
        3,    // pixelToMmRatioX
        3,    // pixelToMmRatioY
        1010, // measuredWidthPx (expected 1000px, 10px = 30mm error)
        505   // measuredHeightPx (expected 500px, 5px = 15mm error)
      );
      
      // Both errors should be within ±50mm tolerance
      expect(error.widthErrorMm).toBeLessThan(50);
      expect(error.heightErrorMm).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('Test: Very small corners - should still produce valid matrix', () => {
      const corners = {
        topLeft: { x: 0.1, y: 0.1 },
        topRight: { x: 1.1, y: 0.1 },
        bottomRight: { x: 1.1, y: 1.1 },
        bottomLeft: { x: 0.1, y: 1.1 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 10, 10);
      
      expect(matrix).toHaveLength(9);
      expect(matrix.every(v => isFinite(v))).toBe(true);
    });

    it('Test: Non-square output dimensions', () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 100, y: 0 },
        bottomRight: { x: 100, y: 50 },
        bottomLeft: { x: 0, y: 50 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 200, 100);
      
      expect(matrix).toHaveLength(9);
      // Width scales 2x (100 -> 200), height scales 2x (50 -> 100)
      expect(matrix[0]).toBeCloseTo(2, 0);
      expect(matrix[4]).toBeCloseTo(2, 0);
    });
  });
});
