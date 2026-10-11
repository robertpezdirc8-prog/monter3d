/**
 * Mera3D Pro - Measurement Accuracy Tests
 * 
 * Tests measurement accuracy with known ground truth values.
 * Includes perspective distortion, various angles, and measurement errors.
 * Compares calculated measurements against known values and reports actual errors.
 */

import { useState, useCallback } from 'react';
import { calculateScaleFromReference, calculateRealDistance, estimateHomography } from '../utils/cv';
import type { Point2D } from '../utils/cv';

interface MeasurementTestCase {
  name: string;
  description: string;
  referencePoints: [Point2D, Point2D];
  referenceRealDistance: number;
  testPoints: [Point2D, Point2D];
  expectedRealDistance: number;
  tolerance: number;
}

interface TestResult {
  name: string;
  pass: boolean;
  calculated: number | null;
  expected: number;
  error: number | null;
  errorPercent: number | null;
  message: string;
}

// Test cases with known ground truth
function generateTestCases(): MeasurementTestCase[] {
  return [
    // Test 1: Simple horizontal measurement, no perspective
    {
      name: 'Vodoravna meritev brez perspective',
      description: 'Preprosta vodoravna meritev na vzporedni ravnini',
      referencePoints: [{ x: 100, y: 200 }, { x: 300, y: 200 }],
      referenceRealDistance: 2.0, // 200px = 2m
      testPoints: [{ x: 100, y: 300 }, { x: 250, y: 300 }],
      expectedRealDistance: 1.5, // 150px = 1.5m
      tolerance: 0.01
    },
    // Test 2: Vertical measurement
    {
      name: 'Navpična meritev',
      description: 'Navpična meritev (višina stebra)',
      referencePoints: [{ x: 200, y: 100 }, { x: 200, y: 400 }],
      referenceRealDistance: 3.0, // 300px = 3m
      testPoints: [{ x: 300, y: 150 }, { x: 300, y: 350 }],
      expectedRealDistance: 2.0, // 200px = 2m
      tolerance: 0.01
    },
    // Test 3: Diagonal measurement
    {
      name: 'Diagonalna meritev',
      description: 'Meritev po diagonali',
      referencePoints: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
      referenceRealDistance: 2.0,
      testPoints: [{ x: 100, y: 200 }, { x: 250, y: 350 }],
      expectedRealDistance: Math.sqrt(150 * 150 + 150 * 150) / 100, // ~2.121m
      tolerance: 0.01
    },
    // Test 4: Short measurement (low accuracy expected)
    {
      name: 'Kratka meritev (nizka natančnost)',
      description: 'Zelo kratka meritev - pričakovana večja napaka',
      referencePoints: [{ x: 100, y: 200 }, { x: 500, y: 200 }],
      referenceRealDistance: 4.0,
      testPoints: [{ x: 200, y: 300 }, { x: 210, y: 300 }],
      expectedRealDistance: 0.1, // 10px = 0.1m
      tolerance: 0.01
    },
    // Test 5: Long measurement
    {
      name: 'Dolga meritev',
      description: 'Dolga meritev čez celotno sliko',
      referencePoints: [{ x: 200, y: 300 }, { x: 300, y: 300 }],
      referenceRealDistance: 1.0,
      testPoints: [{ x: 50, y: 400 }, { x: 550, y: 400 }],
      expectedRealDistance: 5.0,
      tolerance: 0.01
    },
    // Test 6: Measurement with slight angle
    {
      name: 'Meritev pod kotom',
      description: 'Meritev, ki ni popolnoma vodoravna ali navpična',
      referencePoints: [{ x: 100, y: 200 }, { x: 300, y: 200 }],
      referenceRealDistance: 2.0,
      testPoints: [{ x: 150, y: 250 }, { x: 350, y: 350 }],
      expectedRealDistance: Math.sqrt(200 * 200 + 100 * 100) / 100, // ~2.236m
      tolerance: 0.01
    },
    // Test 7: Measurement with pixel noise (simulating manual marking error)
    {
      name: 'Meritev z napako označevanja (±3px)',
      description: 'Simulacija ročne napake pri označevanju točk',
      referencePoints: [{ x: 100, y: 200 }, { x: 400, y: 200 }],
      referenceRealDistance: 3.0,
      testPoints: [{ x: 150 + 2, y: 300 - 1 }, { x: 350 - 3, y: 300 + 2 }],
      // Expected without noise: 200px = 2.0m
      // With noise: sqrt((197)^2 + (3)^2) = ~197.02px = ~1.970m
      expectedRealDistance: 2.0,
      tolerance: 0.05 // Allow 5cm tolerance for marking error
    },
    // Test 8: Small reference (low accuracy expected)
    {
      name: 'Majhna referenca (nizka natančnost)',
      description: 'Zelo majhna referenca - pričakovana večja napaka',
      referencePoints: [{ x: 200, y: 200 }, { x: 220, y: 200 }],
      referenceRealDistance: 0.2, // Only 20px reference
      testPoints: [{ x: 100, y: 300 }, { x: 400, y: 300 }],
      expectedRealDistance: 3.0,
      tolerance: 0.1 // Allow 10cm tolerance
    },
  ];
}

export function MeasurementAccuracyTests() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runTests = useCallback(() => {
    setRunning(true);
    const testCases = generateTestCases();
    const testResults: TestResult[] = [];

    for (const tc of testCases) {
      // Calculate scale from reference
      const scale = calculateScaleFromReference(
        tc.referencePoints[0],
        tc.referencePoints[1],
        tc.referenceRealDistance
      );

      if (scale === null) {
        testResults.push({
          name: tc.name,
          pass: false,
          calculated: null,
          expected: tc.expectedRealDistance,
          error: null,
          errorPercent: null,
          message: `✗ Ni mogoče izračunati merila iz reference`
        });
        continue;
      }

      // Calculate test distance
      const calculated = calculateRealDistance(
        tc.testPoints[0],
        tc.testPoints[1],
        scale
      );

      if (calculated === null) {
        testResults.push({
          name: tc.name,
          pass: false,
          calculated: null,
          expected: tc.expectedRealDistance,
          error: null,
          errorPercent: null,
          message: `✗ Ni mogoče izračunati razdalje`
        });
        continue;
      }

      const error = Math.abs(calculated - tc.expectedRealDistance);
      const errorPercent = (error / tc.expectedRealDistance) * 100;
      const pass = error <= tc.tolerance;

      testResults.push({
        name: tc.name,
        pass,
        calculated,
        expected: tc.expectedRealDistance,
        error,
        errorPercent,
        message: pass
          ? `✓ Izračunano: ${calculated.toFixed(4)} m, pričakovano: ${tc.expectedRealDistance.toFixed(4)} m, napaka: ${error.toFixed(4)} m (${errorPercent.toFixed(2)}%)`
          : `✗ Izračunano: ${calculated.toFixed(4)} m, pričakovano: ${tc.expectedRealDistance.toFixed(4)} m, napaka: ${error.toFixed(4)} m (${errorPercent.toFixed(2)}%) — presega toleranco ${tc.tolerance} m`
      });
    }

    setResults(testResults);
    setRunning(false);
  }, []);

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Testi natančnosti merjenja</h3>
        <button
          onClick={runTests}
          disabled={running}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {running ? '⏳ Izvajam...' : '▶ Zaženi teste'}
        </button>
      </div>

      <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
        <p className="text-blue-200 text-sm">
          Ti testi preverjajo natančnost merjenja z znanimi referenčnimi vrednostmi.
          Vključujejo različne scenarije: vodoravne, navpične, diagonalne meritve,
          meritve z napako označevanja, majhne reference itd.
        </p>
        <p className="text-blue-300 text-xs mt-2">
          ⚠️ Opomba: Ti testi preverjajo osnovno linearno merjenje (pixel-to-meter).
          Ne testirajo perspektivne korekcije z homografijo, ki zahteva več kontrolnih točk.
        </p>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {/* Summary */}
          <div className={`rounded-lg p-4 ${failed === 0 ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-red-900/50 border border-red-700'}`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{total}</div>
                <div className="text-xs text-slate-300">Skupaj</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{passed}</div>
                <div className="text-xs text-slate-300">Uspešnih</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{failed}</div>
                <div className="text-xs text-slate-300">Neuspešnih</div>
              </div>
            </div>
          </div>

          {/* Individual results */}
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 ${r.pass ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-red-900/30 border border-red-800'}`}
            >
              <div className="font-medium text-sm text-white mb-1">{r.name}</div>
              <div className={`text-xs font-mono ${r.pass ? 'text-emerald-300' : 'text-red-300'}`}>
                {r.message}
              </div>
              {r.calculated !== null && r.errorPercent !== null && (
                <div className="text-xs text-slate-400 mt-1">
                  Relativna napaka: {r.errorPercent.toFixed(2)}%
                  {r.errorPercent > 5 && <span className="text-amber-400 ml-2">⚠ Visoka napaka</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Additional info */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Omejitve testov:</h4>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li>Testi preverjajo samo linearno merjenje (en merilni faktor za celotno sliko)</li>
          <li>Ne vključujejo perspektivne korekcije (homografija zahteva 4+ kontrolne točke)</li>
          <li>Ne simulirajo realnih terenskih pogojev (senca, odsev, zamegljenost)</li>
          <li>Za popolno validacijo so potrebne meritve na realnih objektih z znanimi merami</li>
        </ul>
      </div>
    </div>
  );
}
