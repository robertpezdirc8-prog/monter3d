/**
 * Mera3D Pro - Perspective Transform Tests
 * 
 * Tests for perspective warping with known coordinates.
 * Verifies geometric accuracy of the DLT algorithm and JS fallback.
 */

import { describe, it, expect } from 'vitest';
import { computePerspectiveMatrix, computeMeasurementError, warpPerspective } from '../utils/perspectiveTransform';

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
      
      expect(matrix).toHaveLength(9);
      expect(matrix[0]).toBeCloseTo(1, 1);
      expect(matrix[4]).toBeCloseTo(1, 1);
      expect(matrix[8]).toBeCloseTo(1, 1);
      expect(matrix[1]).toBeCloseTo(0, 1);
      expect(matrix[2]).toBeCloseTo(0, 1);
      expect(matrix[3]).toBeCloseTo(0, 1);
      expect(matrix[5]).toBeCloseTo(0, 1);
    });

    it('Test: Scale transform - small square to large rectangle', () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 50, y: 0 },
        bottomRight: { x: 50, y: 50 },
        bottomLeft: { x: 0, y: 50 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 200, 200);
      
      expect(matrix).toHaveLength(9);
      expect(matrix[0]).toBeCloseTo(4, 0);
      expect(matrix[4]).toBeCloseTo(4, 0);
    });

    it('Test: Translation transform', () => {
      const corners = {
        topLeft: { x: 100, y: 100 },
        topRight: { x: 200, y: 100 },
        bottomRight: { x: 200, y: 200 },
        bottomLeft: { x: 100, y: 200 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 100, 100);
      
      expect(matrix).toHaveLength(9);
      expect(matrix[0]).toBeCloseTo(1, 0);
      expect(matrix[4]).toBeCloseTo(1, 0);
    });

    it('Test: Perspective distortion - trapezoid to rectangle', () => {
      const corners = {
        topLeft: { x: 50, y: 20 },
        topRight: { x: 150, y: 20 },
        bottomRight: { x: 180, y: 180 },
        bottomLeft: { x: 20, y: 180 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 160, 160);
      
      expect(matrix).toHaveLength(9);
      expect(matrix.some(v => Math.abs(v) > 0.001)).toBe(true);
      expect(matrix[8]).toBeCloseTo(1, 3);
    });
  });

  describe('Corner Validation', () => {
    it('Test: Reject collinear points', () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 50, y: 0 },
        bottomRight: { x: 100, y: 0 },
        bottomLeft: { x: 0, y: 100 }
      };
      
      // Create a test image
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 200, 200);
      
      const img = new Image();
      img.src = canvas.toDataURL();
      
      // Should throw for collinear points
      expect(async () => {
        await warpPerspective(img, corners, 100, 100, true);
      }).rejects.toThrow();
    });

    it('Test: Reject duplicate points', () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 0, y: 0 }, // Same as topLeft
        bottomRight: { x: 100, y: 100 },
        bottomLeft: { x: 0, y: 100 }
      };
      
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'blue';
      ctx.fillRect(0, 0, 200, 200);
      
      const img = new Image();
      img.src = canvas.toDataURL();
      
      expect(async () => {
        await warpPerspective(img, corners, 100, 100, true);
      }).rejects.toThrow();
    });

    it('Test: Reject NaN coordinates', () => {
      const corners = {
        topLeft: { x: NaN, y: 0 },
        topRight: { x: 100, y: 0 },
        bottomRight: { x: 100, y: 100 },
        bottomLeft: { x: 0, y: 100 }
      };
      
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'green';
      ctx.fillRect(0, 0, 200, 200);
      
      const img = new Image();
      img.src = canvas.toDataURL();
      
      expect(async () => {
        await warpPerspective(img, corners, 100, 100, true);
      }).rejects.toThrow();
    });
  });

  describe('JS Fallback Warp', () => {
    it('Test: Warp produces valid output dimensions', async () => {
      const corners = {
        topLeft: { x: 10, y: 10 },
        topRight: { x: 190, y: 10 },
        bottomRight: { x: 190, y: 190 },
        bottomLeft: { x: 10, y: 190 }
      };
      
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(50, 50, 100, 100);
      
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = canvas.toDataURL();
      });
      
      const result = await warpPerspective(img, corners, 100, 100, true);
      
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(result.imageData.width).toBe(100);
      expect(result.imageData.height).toBe(100);
      expect(result.engine).toBe('js-fallback');
      expect(result.transformMatrix).toHaveLength(9);
    });

    it('Test: Warp preserves color content', async () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 100, y: 0 },
        bottomRight: { x: 100, y: 100 },
        bottomLeft: { x: 0, y: 100 }
      };
      
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 100, 100);
      
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = canvas.toDataURL();
      });
      
      const result = await warpPerspective(img, corners, 50, 50, true);
      
      // Center pixel should be red
      const centerIdx = (25 * 50 + 25) * 4;
      expect(result.imageData.data[centerIdx]).toBeGreaterThan(200); // R
      expect(result.imageData.data[centerIdx + 1]).toBeLessThan(50); // G
      expect(result.imageData.data[centerIdx + 2]).toBeLessThan(50); // B
    });

    it('Test: Output dimensions are limited', async () => {
      const corners = {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 100, y: 0 },
        bottomRight: { x: 100, y: 100 },
        bottomLeft: { x: 0, y: 100 }
      };
      
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 100, 100);
      
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = canvas.toDataURL();
      });
      
      // Request very large output - should be scaled down
      const result = await warpPerspective(img, corners, 5000, 5000, true);
      
      expect(result.width).toBeLessThanOrEqual(2048);
      expect(result.height).toBeLessThanOrEqual(2048);
    });
  });

  describe('Measurement Error', () => {
    it('Test: Perfect measurement - zero error', () => {
      const error = computeMeasurementError(1000, 1000, 10, 10, 100, 100);
      
      expect(error.widthErrorMm).toBeCloseTo(0, 5);
      expect(error.heightErrorMm).toBeCloseTo(0, 5);
      expect(error.totalErrorMm).toBeCloseTo(0, 5);
    });

    it('Test: Small measurement error - 5mm', () => {
      const error = computeMeasurementError(1000, 1000, 10, 10, 100.5, 100);
      
      expect(error.widthErrorMm).toBeCloseTo(5, 1);
      expect(error.heightErrorMm).toBeCloseTo(0, 5);
      expect(error.totalErrorMm).toBeCloseTo(5, 1);
    });

    it('Test: Larger measurement error - realistic scenario', () => {
      const error = computeMeasurementError(2000, 1000, 5, 5, 405, 202);
      
      expect(error.widthErrorMm).toBeCloseTo(25, 0);
      expect(error.heightErrorMm).toBeCloseTo(10, 0);
      expect(error.totalErrorMm).toBeCloseTo(Math.sqrt(25**2 + 10**2), 0);
    });

    it('Test: Error within acceptable tolerance for fence measurement', () => {
      const error = computeMeasurementError(3000, 1500, 3, 3, 1010, 505);
      
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
      expect(matrix[0]).toBeCloseTo(2, 0);
      expect(matrix[4]).toBeCloseTo(2, 0);
    });

    it('Test: Strongly tilted quadrilateral', () => {
      const corners = {
        topLeft: { x: 80, y: 10 },
        topRight: { x: 180, y: 30 },
        bottomRight: { x: 150, y: 180 },
        bottomLeft: { x: 20, y: 150 }
      };
      
      const matrix = computePerspectiveMatrix(corners, 160, 160);
      
      expect(matrix).toHaveLength(9);
      expect(matrix.every(v => isFinite(v))).toBe(true);
      expect(matrix[8]).toBeCloseTo(1, 3);
    });
  });
});
