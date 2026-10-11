/**
 * Mera3D Pro - Actual Mathematical Tests
 * 
 * These tests ACTUALLY RUN and verify the mathematical functions.
 * Results are logged to console and displayed in the UI.
 */

import { 
  calculateScaleFromReference, 
  calculateRealDistance, 
  assessMeasurementReliability,
  estimateHomography,
  ransacHomography
} from '../utils/cv';
import type { Point2D } from '../utils/cv';

export interface TestResult {
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export function runActualTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: calculateScaleFromReference - basic case
  try {
    const scale = calculateScaleFromReference(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      2.0
    );
    const expected = 0.02; // 2m / 100px = 0.02 m/px
    const passed = scale !== null && Math.abs(scale - expected) < 0.0001;
    results.push({
      name: 'calculateScaleFromReference: osnovni primer (100px = 2m)',
      passed,
      expected,
      actual: scale
    });
  } catch (e) {
    results.push({ name: 'calculateScaleFromReference: osnovni primer', passed: false, error: String(e) });
  }

  // Test 2: calculateScaleFromReference - invalid distance
  try {
    const scale = calculateScaleFromReference(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      -1.0
    );
    const passed = scale === null;
    results.push({
      name: 'calculateScaleFromReference: negativna razdalja → null',
      passed,
      expected: null,
      actual: scale
    });
  } catch (e) {
    results.push({ name: 'calculateScaleFromReference: negativna razdalja', passed: false, error: String(e) });
  }

  // Test 3: calculateScaleFromReference - same points
  try {
    const scale = calculateScaleFromReference(
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      1.0
    );
    const passed = scale === null; // pixelDistance < 1
    results.push({
      name: 'calculateScaleFromReference: enaki točki → null',
      passed,
      expected: null,
      actual: scale
    });
  } catch (e) {
    results.push({ name: 'calculateScaleFromReference: enaki točki', passed: false, error: String(e) });
  }

  // Test 4: calculateScaleFromReference - NaN input
  try {
    const scale = calculateScaleFromReference(
      { x: NaN, y: 0 },
      { x: 100, y: 0 },
      1.0
    );
    const passed = scale === null;
    results.push({
      name: 'calculateScaleFromReference: NaN točka → null',
      passed,
      expected: null,
      actual: scale
    });
  } catch (e) {
    results.push({ name: 'calculateScaleFromReference: NaN točka', passed: false, error: String(e) });
  }

  // Test 5: calculateRealDistance - basic case
  try {
    const distance = calculateRealDistance(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      0.02 // 0.02 m/px
    );
    const expected = 2.0; // 100px * 0.02 = 2m
    const passed = distance !== null && Math.abs(distance - expected) < 0.0001;
    results.push({
      name: 'calculateRealDistance: osnovni primer (100px * 0.02 = 2m)',
      passed,
      expected,
      actual: distance
    });
  } catch (e) {
    results.push({ name: 'calculateRealDistance: osnovni primer', passed: false, error: String(e) });
  }

  // Test 6: calculateRealDistance - invalid scale
  try {
    const distance = calculateRealDistance(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      -0.02
    );
    const passed = distance === null;
    results.push({
      name: 'calculateRealDistance: negativen scale → null',
      passed,
      expected: null,
      actual: distance
    });
  } catch (e) {
    results.push({ name: 'calculateRealDistance: negativen scale', passed: false, error: String(e) });
  }

  // Test 7: calculateRealDistance - NaN point
  try {
    const distance = calculateRealDistance(
      { x: NaN, y: 0 },
      { x: 100, y: 0 },
      0.02
    );
    const passed = distance === null;
    results.push({
      name: 'calculateRealDistance: NaN točka → null',
      passed,
      expected: null,
      actual: distance
    });
  } catch (e) {
    results.push({ name: 'calculateRealDistance: NaN točka', passed: false, error: String(e) });
  }

  // Test 8: assessMeasurementReliability - good measurement
  try {
    const result = assessMeasurementReliability(
      200, // pixelDistance
      1000, // imageWidth
      800, // imageHeight
      300 // referenceDistance
    );
    const passed = result.reliability > 0.7 && result.warnings.length === 0;
    results.push({
      name: 'assessMeasurementReliability: dobra meritev (reliability > 0.7)',
      passed,
      expected: '> 0.7',
      actual: result.reliability
    });
  } catch (e) {
    results.push({ name: 'assessMeasurementReliability: dobra meritev', passed: false, error: String(e) });
  }

  // Test 9: assessMeasurementReliability - small measurement
  try {
    const result = assessMeasurementReliability(
      10, // pixelDistance (very small)
      1000, // imageWidth
      800, // imageHeight
      300 // referenceDistance
    );
    const passed = result.reliability < 0.7 && result.warnings.length > 0;
    results.push({
      name: 'assessMeasurementReliability: majhna meritev (reliability < 0.7)',
      passed,
      expected: '< 0.7',
      actual: result.reliability
    });
  } catch (e) {
    results.push({ name: 'assessMeasurementReliability: majhna meritev', passed: false, error: String(e) });
  }

  // Test 10: assessMeasurementReliability - invalid image dimensions
  try {
    const result = assessMeasurementReliability(
      100,
      0, // invalid width
      800,
      200
    );
    const passed = result.reliability === 0;
    results.push({
      name: 'assessMeasurementReliability: neveljavna širina → reliability = 0',
      passed,
      expected: 0,
      actual: result.reliability
    });
  } catch (e) {
    results.push({ name: 'assessMeasurementReliability: neveljavna širina', passed: false, error: String(e) });
  }

  // Test 11: estimateHomography - identity
  try {
    const srcPoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];
    const dstPoints = [...srcPoints];
    const result = estimateHomography(srcPoints, dstPoints);
    
    const passed = result !== null && 
                   result.matrix.length === 9 &&
                   Math.abs(result.matrix[0] - 1) < 0.01 &&
                   Math.abs(result.matrix[4] - 1) < 0.01 &&
                   Math.abs(result.matrix[8] - 1) < 0.01;
    
    results.push({
      name: 'estimateHomography: identiteta (4 točke)',
      passed,
      expected: 'H ≈ I',
      actual: result ? `H[0]=${result.matrix[0].toFixed(3)}, H[4]=${result.matrix[4].toFixed(3)}` : 'null'
    });
  } catch (e) {
    results.push({ name: 'estimateHomography: identiteta', passed: false, error: String(e) });
  }

  // Test 12: estimateHomography - translation
  try {
    const srcPoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];
    const dstPoints = srcPoints.map(p => ({ x: p.x + 10, y: p.y + 20 }));
    const result = estimateHomography(srcPoints, dstPoints);
    
    const passed = result !== null && 
                   result.rmse < 0.5;
    
    results.push({
      name: 'estimateHomography: translacija (10, 20)',
      passed,
      expected: 'RMSE < 0.5',
      actual: result ? `RMSE=${result.rmse.toFixed(4)}` : 'null'
    });
  } catch (e) {
    results.push({ name: 'estimateHomography: translacija', passed: false, error: String(e) });
  }

  // Test 13: estimateHomography - collinear points (should fail)
  try {
    const srcPoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 }
    ];
    const result = estimateHomography(srcPoints, srcPoints);
    const passed = result === null;
    results.push({
      name: 'estimateHomography: kolinearne točke → null',
      passed,
      expected: null,
      actual: result
    });
  } catch (e) {
    results.push({ name: 'estimateHomography: kolinearne točke', passed: false, error: String(e) });
  }

  // Test 14: ransacHomography - with outliers
  try {
    const srcPoints: Point2D[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 50, y: 50 },
      { x: 200, y: 200 } // outlier
    ];
    const dstPoints = [
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 110, y: 120 },
      { x: 10, y: 120 },
      { x: 60, y: 70 },
      { x: 999, y: 999 } // outlier destination
    ];
    
    const result = ransacHomography(srcPoints, dstPoints, 100, 5.0);
    const passed = result !== null && result.inlierCount >= 4;
    
    results.push({
      name: 'ransacHomography: z outlierji (vsaj 4 inlierji)',
      passed,
      expected: '>= 4 inlierji',
      actual: result ? `${result.inlierCount} inlierjev` : 'null'
    });
  } catch (e) {
    results.push({ name: 'ransacHomography: z outlierji', passed: false, error: String(e) });
  }

  // Test 15: End-to-end measurement test
  try {
    // Simulate: reference is 2m, spans 200px. Measure 150px segment.
    const refPoint1: Point2D = { x: 100, y: 200 };
    const refPoint2: Point2D = { x: 300, y: 200 };
    const realRefDistance = 2.0; // meters
    
    const scale = calculateScaleFromReference(refPoint1, refPoint2, realRefDistance);
    
    const measurePoint1: Point2D = { x: 100, y: 300 };
    const measurePoint2: Point2D = { x: 250, y: 300 };
    
    const measuredDistance = scale !== null ? calculateRealDistance(measurePoint1, measurePoint2, scale) : null;
    const expectedDistance = 1.5; // 150px * 0.01 m/px = 1.5m
    
    const passed = measuredDistance !== null && Math.abs(measuredDistance - expectedDistance) < 0.01;
    
    results.push({
      name: 'End-to-end: referenca 2m/200px, meritev 150px → 1.5m',
      passed,
      expected: expectedDistance,
      actual: measuredDistance
    });
  } catch (e) {
    results.push({ name: 'End-to-end meritev', passed: false, error: String(e) });
  }

  return results;
}
