/**
 * Mera3D Pro - Geometry & Measurement Tests
 * 
 * Regresijski testi za geometrijske izračune in meritve.
 */

import { describe, it, expect } from 'vitest';
import { calculateFencePlan, calculateStairsPlan, calculateTerrainPlan } from '../utils/geometry';
import { calculateScaleFromReference, calculateRealDistance, assessMeasurementReliability } from '../utils/cv';

describe('Geometry Calculations', () => {
  describe('Fence Plan', () => {
    it('Test: Osnovni izračun ravnega segmenta', () => {
      const segments = [
        { startPoint: [0, 0] as [number, number], endPoint: [3000, 0] as [number, number], heightChange: 0 }
      ];
      
      const result = calculateFencePlan(segments, {
        panelWidth: 200,
        panelHeight: 1000,
        postWidth: 50,
        maxGap: 10,
        mountingStyle: 'level',
        slopeThreshold: 5
      });
      
      expect(result.totalLength).toBeCloseTo(3000, 0);
      expect(result.totalPanels).toBeGreaterThan(0);
      expect(result.totalPosts).toBeGreaterThan(0);
    });

    it('Test: Izračun z višinsko razliko', () => {
      const segments = [
        { startPoint: [0, 0] as [number, number], endPoint: [3000, 0] as [number, number], heightChange: 500 }
      ];
      
      const result = calculateFencePlan(segments, {
        panelWidth: 200,
        panelHeight: 1000,
        postWidth: 50,
        maxGap: 10,
        mountingStyle: 'stepped',
        slopeThreshold: 5
      });
      
      expect(result.totalHeightChange).toBe(500);
    });
  });

  describe('Stairs Plan', () => {
    it('Test: Osnovni izračun stopnic', () => {
      const result = calculateStairsPlan(10, 2000, 3000, 900);
      
      expect(result.numSteps).toBe(10);
      expect(result.totalRise).toBe(2000);
      expect(result.totalRun).toBe(3000);
      expect(result.averageRise).toBeCloseTo(200, 0);
      expect(result.averageRun).toBeCloseTo(300, 0);
      expect(result.steps.length).toBe(10);
    });

    it('Test: Neveljavni parametri - nič stopnic', () => {
      expect(() => calculateStairsPlan(0, 2000, 3000, 900)).toThrow();
    });
  });

  describe('Terrain Plan', () => {
    it('Test: Osnovni izračun terena', () => {
      const points: [number, number, number][] = [
        [0, 0, 0],
        [1000, 0, 100],
        [2000, 0, 200]
      ];
      
      const result = calculateTerrainPlan(points);
      
      expect(result.segments.length).toBe(2);
      expect(result.totalHeightChange).toBe(200);
      expect(result.horizontalProjection).toBeCloseTo(2000, 0);
    });
  });
});

describe('Measurement Scale & Validation', () => {
  describe('Scale from Reference', () => {
    it('Test: Pravilen izračun merila', () => {
      const scale = calculateScaleFromReference(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        2.0 // 2 metra
      );
      
      expect(scale).not.toBeNull();
      expect(scale).toBeCloseTo(0.02, 4); // 2m / 100px = 0.02 m/px
    });

    it('Test: Zavrnitev negativne razdalje', () => {
      const scale = calculateScaleFromReference(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        -1.0
      );
      
      expect(scale).toBeNull();
    });

    it('Test: Zavrnitev enake točke', () => {
      const scale = calculateScaleFromReference(
        { x: 50, y: 50 },
        { x: 50, y: 50 },
        1.0
      );
      
      expect(scale).toBeNull();
    });

    it('Test: Zavrnitev NaN vhodnih podatkov', () => {
      const scale = calculateScaleFromReference(
        { x: NaN, y: 0 },
        { x: 100, y: 0 },
        1.0
      );
      
      expect(scale).toBeNull();
    });
  });

  describe('Real Distance Calculation', () => {
    it('Test: Pravilen izračun razdalje', () => {
      const distance = calculateRealDistance(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        0.02 // 0.02 m/px
      );
      
      expect(distance).not.toBeNull();
      expect(distance).toBeCloseTo(2.0, 2); // 100px * 0.02 = 2m
    });

    it('Test: Zavrnitev neveljavnega merila', () => {
      const distance = calculateRealDistance(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        -0.02
      );
      
      expect(distance).toBeNull();
    });
  });

  describe('Measurement Reliability', () => {
    it('Test: Zanesljiva meritev - srednja velikost', () => {
      const result = assessMeasurementReliability(
        200, // pixelDistance
        1920, // imageWidth
        1080, // imageHeight
        300 // referenceDistance
      );
      
      expect(result.reliability).toBeGreaterThan(0.5);
      expect(result.warnings.length).toBe(0);
    });

    it('Test: Nezanesljiva meritev - zelo majhna', () => {
      const result = assessMeasurementReliability(
        10, // pixelDistance - zelo majhna
        1920,
        1080,
        300
      );
      
      expect(result.reliability).toBeLessThan(1.0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('Test: Neveljavni vhodni podatki', () => {
      const result = assessMeasurementReliability(
        NaN,
        1920,
        1080,
        300
      );
      
      expect(result.reliability).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
