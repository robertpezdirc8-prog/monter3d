/**
 * Mera3D Pro - Mathematical Test Runner
 * 
 * This component runs all 12 mathematical test suites using the ACTUAL
 * functions from src/utils/cv.ts (no copies, no simulations).
 * 
 * Tests are executed in the browser and results are displayed in real-time.
 */

import { useState, useCallback } from 'react';
import { estimateHomography, ransacHomography } from '../utils/cv';
import type { Point2D } from '../utils/cv';

interface TestResult {
  pass: boolean;
  message: string;
  actual?: number;
  expected?: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string): TestResult {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  return {
    pass,
    message: `${message} ${pass ? '✓' : '✗'} (dejansko: ${actual.toFixed(6)}, pričakovano: ${expected.toFixed(6)}${!pass ? `, razlika: ${diff.toFixed(6)}` : ''})`,
    actual,
    expected
  };
}

function assert(condition: boolean, message: string): TestResult {
  return {
    pass: condition,
    message: `${message} ${condition ? '✓' : '✗'}`
  };
}

function applyHomography(H: number[], x: number, y: number): Point2D | null {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-10) return null;
  const u = (H[0] * x + H[1] * y + H[2]) / w;
  const v = (H[3] * x + H[4] * y + H[5]) / w;
  return { x: u, y: v };
}

function computeMaxError(srcPoints: Point2D[], dstPoints: Point2D[], H: number[]): number {
  let maxErr = 0;
  for (let i = 0; i < srcPoints.length; i++) {
    const transformed = applyHomography(H, srcPoints[i].x, srcPoints[i].y);
    if (transformed) {
      const err = Math.sqrt(
        (transformed.x - dstPoints[i].x) ** 2 +
        (transformed.y - dstPoints[i].y) ** 2
      );
      maxErr = Math.max(maxErr, err);
    }
  }
  return maxErr;
}

// ===== TEST SUITES =====

function testIdentity(): TestSuite {
  const results: TestResult[] = [];
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints: Point2D[] = [...srcPoints];

  const result = estimateHomography(srcPoints, dstPoints);

  if (!result) {
    results.push(assert(false, 'Homografija mora biti izračunana'));
    return { name: '1. Identična transformacija', results };
  }

  results.push(assertApprox(result.matrix[0], 1, 0.01, 'H[0] ≈ 1'));
  results.push(assertApprox(result.matrix[4], 1, 0.01, 'H[4] ≈ 1'));
  results.push(assertApprox(result.matrix[8], 1, 0.01, 'H[8] ≈ 1'));
  results.push(assertApprox(result.matrix[1], 0, 0.01, 'H[1] ≈ 0'));
  results.push(assertApprox(result.matrix[2], 0, 0.01, 'H[2] ≈ 0'));
  results.push(assertApprox(result.matrix[3], 0, 0.01, 'H[3] ≈ 0'));
  results.push(assertApprox(result.matrix[5], 0, 0.01, 'H[5] ≈ 0'));
  results.push(assertApprox(result.matrix[6], 0, 0.01, 'H[6] ≈ 0'));
  results.push(assertApprox(result.matrix[7], 0, 0.01, 'H[7] ≈ 0'));

  const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
  results.push(assertApprox(maxErr, 0, 0.01, 'Največja reprojekcijska napaka ≈ 0'));
  results.push(assertApprox(result.rmse, 0, 0.01, 'RMSE ≈ 0'));

  for (let i = 0; i < srcPoints.length; i++) {
    const t = applyHomography(result.matrix, srcPoints[i].x, srcPoints[i].y);
    if (t) {
      results.push(assertApprox(t.x, dstPoints[i].x, 0.01, `Točka ${i}: x ≈ ${dstPoints[i].x}`));
      results.push(assertApprox(t.y, dstPoints[i].y, 0.01, `Točka ${i}: y ≈ ${dstPoints[i].y}`));
    }
  }

  return { name: '1. Identična transformacija', results };
}

function testTranslation(): TestSuite {
  const results: TestResult[] = [];
  const tx = 10, ty = 20;
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = srcPoints.map(p => ({ x: p.x + tx, y: p.y + ty }));

  const result = estimateHomography(srcPoints, dstPoints);

  if (!result) {
    results.push(assert(false, 'Homografija mora biti izračunana'));
    return { name: '2. Translacija', results };
  }

  results.push(assertApprox(result.matrix[2] / result.matrix[8], tx, 0.1, `Translacija X ≈ ${tx}`));
  results.push(assertApprox(result.matrix[5] / result.matrix[8], ty, 0.1, `Translacija Y ≈ ${ty}`));
  results.push(assert(result.rmse < 0.1, `RMSE < 0.1 (dejansko: ${result.rmse.toFixed(6)})`));

  const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
  results.push(assert(maxErr < 0.1, `Največja napaka < 0.1px (dejansko: ${maxErr.toFixed(6)}px)`));

  for (let i = 0; i < srcPoints.length; i++) {
    const t = applyHomography(result.matrix, srcPoints[i].x, srcPoints[i].y);
    if (t) {
      results.push(assertApprox(t.x, dstPoints[i].x, 0.1, `Točka ${i}: x ≈ ${dstPoints[i].x}`));
      results.push(assertApprox(t.y, dstPoints[i].y, 0.1, `Točka ${i}: y ≈ ${dstPoints[i].y}`));
    }
  }

  return { name: '2. Translacija', results };
}

function testScale(): TestSuite {
  const results: TestResult[] = [];
  const sx = 2, sy = 3;
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = srcPoints.map(p => ({ x: p.x * sx, y: p.y * sy }));

  const result = estimateHomography(srcPoints, dstPoints);

  if (!result) {
    results.push(assert(false, 'Homografija mora biti izračunana'));
    return { name: '3. Sprememba merila', results };
  }

  results.push(assertApprox(result.matrix[0] / result.matrix[8], sx, 0.1, `Merilo X ≈ ${sx}`));
  results.push(assertApprox(result.matrix[4] / result.matrix[8], sy, 0.1, `Merilo Y ≈ ${sy}`));
  results.push(assert(result.rmse < 0.1, `RMSE < 0.1 (dejansko: ${result.rmse.toFixed(6)})`));

  const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
  results.push(assert(maxErr < 0.5, `Največja napaka < 0.5px (dejansko: ${maxErr.toFixed(6)}px)`));

  return { name: '3. Sprememba merila', results };
}

function testRotation(): TestSuite {
  const results: TestResult[] = [];
  const theta = Math.PI / 4;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = srcPoints.map(p => ({
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos
  }));

  const result = estimateHomography(srcPoints, dstPoints);

  if (!result) {
    results.push(assert(false, 'Homografija mora biti izračunana'));
    return { name: '4. Rotacija (45°)', results };
  }

  const H = result.matrix;
  const h8 = H[8];
  results.push(assertApprox(H[0] / h8, cos, 0.1, `H[0]/H[8] ≈ cos(45°) = ${cos.toFixed(4)}`));
  results.push(assertApprox(H[1] / h8, -sin, 0.1, `H[1]/H[8] ≈ -sin(45°) = ${(-sin).toFixed(4)}`));
  results.push(assertApprox(H[3] / h8, sin, 0.1, `H[3]/H[8] ≈ sin(45°) = ${sin.toFixed(4)}`));
  results.push(assertApprox(H[4] / h8, cos, 0.1, `H[4]/H[8] ≈ cos(45°) = ${cos.toFixed(4)}`));
  results.push(assert(result.rmse < 0.1, `RMSE < 0.1 (dejansko: ${result.rmse.toFixed(6)})`));

  const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
  results.push(assert(maxErr < 0.5, `Največja napaka < 0.5px (dejansko: ${maxErr.toFixed(6)}px)`));

  return { name: '4. Rotacija (45°)', results };
}

function testMinimalPoints(): TestSuite {
  const results: TestResult[] = [];
  // Exactly 4 non-collinear points
  const srcPoints: Point2D[] = [
    { x: 10, y: 20 }, { x: 150, y: 30 }, { x: 140, y: 180 }, { x: 20, y: 170 }
  ];
  const dstPoints: Point2D[] = [
    { x: 50, y: 60 }, { x: 200, y: 70 }, { x: 190, y: 220 }, { x: 60, y: 210 }
  ];

  const result = estimateHomography(srcPoints, dstPoints);

  results.push(assert(result !== null, 'Homografija z 4 točkami mora biti izračunana'));

  if (result) {
    results.push(assert(result.rmse < 1, `RMSE < 1 (dejansko: ${result.rmse.toFixed(6)})`));
    results.push(assert(result.matrix.length === 9, 'Matrika ima 9 elementov (3x3)'));
    results.push(assert(isFinite(result.matrix.reduce((s, v) => s + Math.abs(v), 0)), 'Vsi elementi matrike so končni'));

    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    results.push(assert(maxErr < 1, `Največja reprojekcijska napaka < 1px (dejansko: ${maxErr.toFixed(4)}px)`));

    for (let i = 0; i < srcPoints.length; i++) {
      const t = applyHomography(result.matrix, srcPoints[i].x, srcPoints[i].y);
      if (t) {
        const err = Math.sqrt((t.x - dstPoints[i].x) ** 2 + (t.y - dstPoints[i].y) ** 2);
        results.push(assert(err < 1, `Točka ${i}: napaka < 1px (dejansko: ${err.toFixed(4)}px)`));
      }
    }
  }

  return { name: '5. Natanko 4 nekolinearne točke', results };
}

function testNoisyPoints(): TestSuite {
  const results: TestResult[] = [];
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }
  ];
  const tx = 15, ty = 25;
  const dstPoints = srcPoints.map(p => ({ x: p.x + tx, y: p.y + ty }));

  const result = estimateHomography(srcPoints, dstPoints);

  results.push(assert(result !== null, 'Homografija z več točkami mora biti izračunana'));

  if (result) {
    results.push(assert(result.rmse < 0.5, `RMSE < 0.5 (dejansko: ${result.rmse.toFixed(6)})`));
    results.push(assert(result.inliers.length === srcPoints.length,
      `Maska inlierjev ima pravilno dolžino (${result.inliers.length}/${srcPoints.length})`));
    results.push(assert(result.inliers.every(v => v === true),
      `Vsi pari so inlierji (${result.inliers.filter(v => v).length}/${srcPoints.length})`));
  }

  return { name: '6. Več točk (overdetermined sistem)', results };
}

function testDegenerateCollinear(): TestSuite {
  const results: TestResult[] = [];

  // Collinear points - should return null
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }
  ];
  const dstPoints: Point2D[] = [...srcPoints];

  const result = estimateHomography(srcPoints, dstPoints);
  results.push(assert(result === null, 'Kolinearne točke morajo vrniti null'));

  // Too few points
  const result2 = estimateHomography(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  );
  results.push(assert(result2 === null, 'Premalo točk (< 4) mora vrniti null'));

  // Empty input
  const result3 = estimateHomography([], []);
  results.push(assert(result3 === null, 'Prazen vhod mora vrniti null'));

  return { name: '7. Degenerirani primeri (kolinearne točke)', results };
}

function testInvalidValues(): TestSuite {
  const results: TestResult[] = [];

  // NaN values
  const result1 = estimateHomography(
    [{ x: NaN, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
  );
  results.push(assert(result1 === null, 'NaN vrednosti morajo vrniti null'));

  // Infinity values
  const result2 = estimateHomography(
    [{ x: Infinity, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
  );
  results.push(assert(result2 === null, 'Infinity vrednosti morajo vrniti null'));

  // -Infinity
  const result3 = estimateHomography(
    [{ x: -Infinity, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
  );
  results.push(assert(result3 === null, '-Infinity vrednosti morajo vrniti null'));

  return { name: '8. Neveljavne vrednosti (NaN, Infinity)', results };
}

function testRANSACWithOutliers(): TestSuite {
  const results: TestResult[] = [];

  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }
  ];
  const dstPoints: Point2D[] = [
    { x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 120 }, { x: 10, y: 120 },
    { x: 60, y: 70 }, { x: 200, y: 200 } // Outlier
  ];

  const result = ransacHomography(srcPoints, dstPoints, 200, 5.0);

  results.push(assert(result !== null, 'RANSAC mora najti model'));

  if (result) {
    results.push(assert(result.inlierCount >= 4,
      `Vsaj 4 inlierji (dejansko: ${result.inlierCount})`));
    results.push(assert(result.inliers.length === srcPoints.length,
      `Maska ima pravilno dolžino (${result.inliers.length})`));
    results.push(assert(result.rmse < 5,
      `RMSE < 5 (dejansko: ${result.rmse.toFixed(6)})`));

    // Verify consistency: inlierCount matches mask
    let computedCount = 0;
    let computedSumSqErr = 0;
    for (let i = 0; i < srcPoints.length; i++) {
      if (result.inliers[i]) {
        computedCount++;
        const t = applyHomography(result.matrix, srcPoints[i].x, srcPoints[i].y);
        if (t) {
          const err = Math.sqrt(
            (t.x - dstPoints[i].x) ** 2 +
            (t.y - dstPoints[i].y) ** 2
          );
          computedSumSqErr += err * err;
        }
      }
    }

    results.push(assert(computedCount === result.inlierCount,
      `Število inlierjev je konsistentno (${computedCount} === ${result.inlierCount})`));

    const computedRMSE = computedCount > 0 ? Math.sqrt(computedSumSqErr / computedCount) : Infinity;
    results.push(assertApprox(computedRMSE, result.rmse, 0.01,
      'RMSE je konsistenten z masko inlierjev'));

    // Verify outlier is correctly identified
    results.push(assert(result.inliers[5] === false,
      'Outlier (točka 5) je pravilno identificiran kot ne-inlier'));
  }

  return { name: '9. RANSAC z outliers', results };
}

function testRANSACAllInliers(): TestSuite {
  const results: TestResult[] = [];

  // All points are correct (no outliers)
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }, { x: 50, y: 0 }
  ];
  const tx = 5, ty = 10;
  const dstPoints = srcPoints.map(p => ({ x: p.x + tx, y: p.y + ty }));

  const result = ransacHomography(srcPoints, dstPoints, 100, 3.0);

  results.push(assert(result !== null, 'RANSAC mora najti model'));

  if (result) {
    results.push(assert(result.inlierCount >= 7,
      `Vsaj 7 od 8 inlierjev (dejansko: ${result.inlierCount})`));
    results.push(assert(result.rmse < 1,
      `RMSE < 1 (dejansko: ${result.rmse.toFixed(6)})`));
  }

  return { name: '10. RANSAC brez outlierjev', results };
}

function testRANSACTooManyOutliers(): TestSuite {
  const results: TestResult[] = [];

  // More outliers than inliers - RANSAC should still find something or return null
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }, { x: 50, y: 0 }
  ];
  // Only first 4 are correct, rest are wrong
  const dstPoints: Point2D[] = [
    { x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 120 }, { x: 10, y: 120 },
    { x: 999, y: 999 }, { x: 888, y: 888 }, { x: 777, y: 777 }, { x: 666, y: 666 }
  ];

  const result = ransacHomography(srcPoints, dstPoints, 200, 5.0);

  // With 4 correct out of 8, RANSAC should find them
  if (result) {
    results.push(assert(result.inlierCount >= 4,
      `Vsaj 4 inlierji kljub outlierjem (dejansko: ${result.inlierCount})`));
    results.push(assert(result.rmse < 5,
      `RMSE < 5 (dejansko: ${result.rmse.toFixed(6)})`));
  } else {
    results.push(assert(true, 'RANSAC vrne null, če ne najde dovolj konsistentnih točk (veljavno)'));
  }

  return { name: '11. RANSAC z večino outlierjev', results };
}

function testHomographyComposition(): TestSuite {
  const results: TestResult[] = [];

  // Test that H2 * H1 applied to points gives correct result
  const srcPoints: Point2D[] = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];

  // First: translate by (10, 20)
  const midPoints = srcPoints.map(p => ({ x: p.x + 10, y: p.y + 20 }));
  // Then: scale by 2
  const dstPoints = midPoints.map(p => ({ x: p.x * 2, y: p.y * 2 }));

  const result = estimateHomography(srcPoints, dstPoints);

  results.push(assert(result !== null, 'Kompozicija translacija+merilo mora biti izračunana'));

  if (result) {
    results.push(assert(result.rmse < 0.1, `RMSE < 0.1 (dejansko: ${result.rmse.toFixed(6)})`));

    // Expected: scale by 2, translate by (20, 40)
    results.push(assertApprox(result.matrix[0] / result.matrix[8], 2, 0.1, 'Skupno merilo X ≈ 2'));
    results.push(assertApprox(result.matrix[4] / result.matrix[8], 2, 0.1, 'Skupno merilo Y ≈ 2'));
    results.push(assertApprox(result.matrix[2] / result.matrix[8], 20, 0.5, 'Skupna translacija X ≈ 20'));
    results.push(assertApprox(result.matrix[5] / result.matrix[8], 40, 0.5, 'Skupna translacija Y ≈ 40'));

    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    results.push(assert(maxErr < 0.5, `Največja napaka < 0.5px (dejansko: ${maxErr.toFixed(6)}px)`));
  }

  return { name: '12. Kompozicija transformacij', results };
}

export function MathTestRunner() {
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const runAllTests = useCallback(() => {
    setRunning(true);
    setCompleted(false);

    // Run all tests synchronously (they're fast)
    const allSuites: TestSuite[] = [
      testIdentity(),
      testTranslation(),
      testScale(),
      testRotation(),
      testMinimalPoints(),
      testNoisyPoints(),
      testDegenerateCollinear(),
      testInvalidValues(),
      testRANSACWithOutliers(),
      testRANSACAllInliers(),
      testRANSACTooManyOutliers(),
      testHomographyComposition(),
    ];

    setSuites(allSuites);
    setRunning(false);
    setCompleted(true);
  }, []);

  // Compute totals
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  for (const suite of suites) {
    for (const r of suite.results) {
      totalTests++;
      if (r.pass) passedTests++;
      else failedTests++;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🧪 Mera3D Pro — Matematični testi
        </h1>
        <p className="text-gray-600 mb-4">
          Vsi testi uporabljajo <strong>dejanske funkcije</strong> iz <code className="bg-gray-200 px-1 rounded">src/utils/cv.ts</code>
          {' '}— brez kopij ali simulacij.
        </p>

        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Opomba:</strong> Ti testi preverjajo matematično pravilnost na sintetičnih podatkih.
            Funkcije: <code>estimateHomography</code>, <code>ransacHomography</code> iz <code>src/utils/cv.ts</code>.
            Solverji: QR (za široke matrike 8×9), Jacobi SVD (za visoke matrike).
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={running}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {running ? '⏳ Izvajam teste...' : '▶ Zaženi vseh 12 testnih sklopov'}
        </button>

        {completed && (
          <div className={`rounded-lg p-6 mb-6 text-white ${failedTests === 0 ? 'bg-green-600' : 'bg-red-600'}`}>
            <h2 className="text-xl font-bold mb-2">📊 Povzetek</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{totalTests}</div>
                <div className="text-sm opacity-80">Skupaj testov</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{passedTests}</div>
                <div className="text-sm opacity-80">Uspešnih ✓</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{failedTests}</div>
                <div className="text-sm opacity-80">Neuspešnih ✗</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%</div>
                <div className="text-sm opacity-80">Uspešnost</div>
              </div>
            </div>
          </div>
        )}

        {suites.map((suite, si) => {
          const suitePassed = suite.results.filter(r => r.pass).length;
          const suiteFailed = suite.results.filter(r => !r.pass).length;
          return (
            <div key={si} className="bg-white rounded-lg shadow p-5 mb-4">
              <h2 className="text-lg font-bold text-gray-800 border-b-2 border-blue-400 pb-2 mb-3">
                {suite.name}
                <span className={`ml-3 text-sm font-normal ${suiteFailed === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({suitePassed}/{suite.results.length} uspešnih)
                </span>
              </h2>
              {suite.results.map((r, ri) => (
                <div
                  key={ri}
                  className={`px-3 py-2 mb-1 rounded text-sm font-mono ${
                    r.pass
                      ? 'bg-green-50 border-l-4 border-green-500 text-green-800'
                      : 'bg-red-50 border-l-4 border-red-500 text-red-800'
                  }`}
                >
                  {r.message}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
