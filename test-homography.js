// Mera3D Pro - Homography Mathematical Tests
// Run with: node test-homography.js
// Tests the actual implementation in src/utils/cv.ts

import { estimateHomography, ransacHomography } from './src/utils/cv.ts';

let testsPassed = 0;
let testsFailed = 0;

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    testsPassed++;
    console.log(`✓ ${message}`);
    console.log(`  Dejansko: ${actual.toFixed(6)}, Pričakovano: ${expected.toFixed(6)}`);
    return true;
  } else {
    testsFailed++;
    console.log(`✗ ${message}`);
    console.log(`  Dejansko: ${actual.toFixed(6)}, Pričakovano: ${expected.toFixed(6)}, Razlika: ${diff.toFixed(6)}`);
    return false;
  }
}

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
    return true;
  } else {
    testsFailed++;
    console.log(`✗ ${message}`);
    return false;
  }
}

function applyHomography(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  if (Math.abs(w) < 1e-10) return null;
  const u = (H[0] * x + H[1] * y + H[2]) / w;
  const v = (H[3] * x + H[4] * y + H[5]) / w;
  return { x: u, y: v };
}

function computeMaxError(srcPoints, dstPoints, H) {
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

console.log('========================================');
console.log('Mera3D Pro - Homography Mathematical Tests');
console.log('========================================\n');

// Test 1: Identity transformation (4 points)
console.log('Test 1: Identična transformacija (4 točke)');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = [...srcPoints];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    assertApprox(result.matrix[0], 1, 0.01, 'H[0] ≈ 1');
    assertApprox(result.matrix[4], 1, 0.01, 'H[4] ≈ 1');
    assertApprox(result.matrix[8], 1, 0.01, 'H[8] ≈ 1');
    assertApprox(result.matrix[1], 0, 0.01, 'H[1] ≈ 0');
    assertApprox(result.matrix[2], 0, 0.01, 'H[2] ≈ 0');
    
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    assertApprox(maxErr, 0, 0.01, 'Največja reprojekcijska napaka ≈ 0');
    assertApprox(result.rmse, 0, 0.01, 'RMSE ≈ 0');
  }
}

// Test 2: Translation (4 points)
console.log('\nTest 2: Translacija (4 točke)');
{
  const tx = 10, ty = 20;
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = srcPoints.map(p => ({ x: p.x + tx, y: p.y + ty }));
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    assertApprox(result.matrix[2], tx, 0.1, `H[2] ≈ ${tx} (translacija X)`);
    assertApprox(result.matrix[5], ty, 0.1, `H[5] ≈ ${ty} (translacija Y)`);
    
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    assert(maxErr < 0.1, `Največja reprojekcijska napaka < 0.1 (dejansko: ${maxErr.toFixed(6)})`);
    assert(result.rmse < 0.1, `RMSE < 0.1 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Test 3: Scale transformation (4 points)
console.log('\nTest 3: Sprememba merila (4 točke)');
{
  const sx = 2, sy = 3;
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = srcPoints.map(p => ({ x: p.x * sx, y: p.y * sy }));
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    assertApprox(result.matrix[0], sx, 0.1, `H[0] ≈ ${sx} (merilo X)`);
    assertApprox(result.matrix[4], sy, 0.1, `H[4] ≈ ${sy} (merilo Y)`);
    
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    assert(maxErr < 0.1, `Največja reprojekcijska napaka < 0.1 (dejansko: ${maxErr.toFixed(6)})`);
    assert(result.rmse < 0.1, `RMSE < 0.1 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Test 4: Perspective transformation (4 points)
console.log('\nTest 4: Perspektivna transformacija (4 točke)');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = [
    { x: 10, y: 10 }, { x: 110, y: 15 }, { x: 105, y: 110 }, { x: 5, y: 105 }
  ];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    assert(maxErr < 0.5, `Največja reprojekcijska napaka < 0.5 (dejansko: ${maxErr.toFixed(6)})`);
    assert(result.rmse < 0.5, `RMSE < 0.5 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Test 5: Multiple points with small noise
console.log('\nTest 5: Več točk z majhnim šumom (7 točk)');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }
  ];
  const tx = 15, ty = 25;
  const noise = 0.5;
  const dstPoints = srcPoints.map((p, i) => ({
    x: p.x + tx + (i % 2 === 0 ? noise : -noise),
    y: p.y + ty + (i % 3 === 0 ? noise : -noise)
  }));
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    assert(result.inliers.length === srcPoints.length, `Vsi pari so inlierji (${result.inliers.length}/${srcPoints.length})`);
    assert(result.rmse < 2, `RMSE < 2 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Test 6: Degenerate/collinear points
console.log('\nTest 6: Degenerirane/kolinearne točke');
{
  // Collinear points
  const srcPoints = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }
  ];
  const dstPoints = [...srcPoints];
  
  const result = estimateHomography(srcPoints, dstPoints);
  assert(result === null, 'Kolinearne točke morajo vrniti null');
  
  // Too few points
  const result2 = estimateHomography(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  );
  assert(result2 === null, 'Premalo točk (< 4) mora vrniti null');
}

// Test 7: Invalid coordinates
console.log('\nTest 7: Neveljavne koordinate');
{
  // NaN values
  const result1 = estimateHomography(
    [{ x: NaN, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
  );
  assert(result1 === null, 'NaN vrednosti morajo vrniti null');
  
  // Infinity values
  const result2 = estimateHomography(
    [{ x: Infinity, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]
  );
  assert(result2 === null, 'Infinity vrednosti morajo vrniti null');
}

// Test 8: RANSAC with known outliers
console.log('\nTest 8: RANSAC z znanimi napačnimi ujemanji');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }
  ];
  const tx = 10, ty = 20;
  const dstPoints = [
    { x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 120 }, { x: 10, y: 120 },
    { x: 60, y: 70 }, { x: 200, y: 200 } // Outlier
  ];
  
  const result = ransacHomography(srcPoints, dstPoints, 100, 5.0);
  
  if (!result) {
    assert(false, 'RANSAC mora najti model');
  } else {
    assert(result.inlierCount >= 4, `Vsaj 4 inlierji (dejansko: ${result.inlierCount})`);
    assert(result.inliers.length === srcPoints.length, `Maska ima pravilno dolžino (${result.inliers.length})`);
    assert(result.rmse < 5, `RMSE < 5 (dejansko: ${result.rmse.toFixed(6)})`);
    
    // Verify consistency: matrix, inliers, count, RMSE describe same model
    let computedCount = 0;
    let computedSumSqErr = 0;
    for (let i = 0; i < srcPoints.length; i++) {
      if (result.inliers[i]) {
        computedCount++;
        const transformed = applyHomography(result.matrix, srcPoints[i].x, srcPoints[i].y);
        if (transformed) {
          const err = Math.sqrt(
            (transformed.x - dstPoints[i].x) ** 2 +
            (transformed.y - dstPoints[i].y) ** 2
          );
          computedSumSqErr += err * err;
        }
      }
    }
    
    assert(computedCount === result.inlierCount, `Število inlierjev je konsistentno (${computedCount} === ${result.inlierCount})`);
    
    const computedRMSE = Math.sqrt(computedSumSqErr / computedCount);
    assertApprox(computedRMSE, result.rmse, 0.01, 'RMSE je konsistenten z masko inlierjev');
    
    // Check that outlier (index 5) is correctly identified
    assert(result.inliers[5] === false, 'Outlier (index 5) je pravilno označen kot ne-inlier');
  }
}

// Test 9: Equal column norms with non-zero dot product
console.log('\nTest 9: Enaka norma stolpcev z neničelnim skalarnim produktom');
{
  // Create points that will result in columns with equal norms
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }, { x: 50, y: 50 }
  ];
  const dstPoints = [
    { x: 10, y: 10 }, { x: 110, y: 10 }, { x: 60, y: 110 }, { x: 60, y: 60 }
  ];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    assert(maxErr < 0.5, `Največja reprojekcijska napaka < 0.5 (dejansko: ${maxErr.toFixed(6)})`);
    assert(result.rmse < 0.5, `RMSE < 0.5 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Test 10: Nearly collinear points
console.log('\nTest 10: Skoraj kolinearni pari točk');
{
  // Points that are nearly collinear (should be rejected or have high error)
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0.001 }, { x: 200, y: 0.002 }, { x: 300, y: 0.003 }
  ];
  const dstPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0.001 }, { x: 200, y: 0.002 }, { x: 300, y: 0.003 }
  ];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  // Should either return null (rejected) or have very high error
  if (result === null) {
    assert(true, 'Skoraj kolinearne točke pravilno zavrnjene');
  } else {
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    // If not rejected, error should be high
    assert(maxErr > 1 || result.rmse > 1, 
      `Skoraj kolinearne točke: visoka napaka (maxErr: ${maxErr.toFixed(6)}, RMSE: ${result.rmse.toFixed(6)})`);
  }
}

// Test 11: Known perspective transformation
console.log('\nTest 11: Znana perspektivna transformacija');
{
  // Known perspective transformation (projective)
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  // Apply known perspective transformation
  const H_true = [
    1.2, 0.1, 10,
    0.05, 1.1, 20,
    0.001, 0.002, 1
  ];
  
  const dstPoints = srcPoints.map(p => {
    const w = H_true[6] * p.x + H_true[7] * p.y + H_true[8];
    return {
      x: (H_true[0] * p.x + H_true[1] * p.y + H_true[2]) / w,
      y: (H_true[3] * p.x + H_true[4] * p.y + H_true[5]) / w
    };
  });
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  if (!result) {
    assert(false, 'Homografija mora biti izračunana');
  } else {
    const maxErr = computeMaxError(srcPoints, dstPoints, result.matrix);
    assert(maxErr < 0.01, `Največja reprojekcijska napaka < 0.01 (dejansko: ${maxErr.toFixed(6)})`);
    assert(result.rmse < 0.01, `RMSE < 0.01 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Test 12: RANSAC with multiple outliers
console.log('\nTest 12: RANSAC z več napačnimi ujemanji');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
    { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 25 }, { x: 50, y: 0 }
  ];
  const tx = 15, ty = 25;
  const dstPoints = [
    { x: 15, y: 25 }, { x: 115, y: 25 }, { x: 115, y: 125 }, { x: 15, y: 125 },
    { x: 65, y: 75 }, { x: 200, y: 200 }, { x: 300, y: 300 }, { x: 500, y: 500 }
  ];
  // Outliers: indices 5, 6, 7
  
  const result = ransacHomography(srcPoints, dstPoints, 200, 5.0);
  
  if (!result) {
    assert(false, 'RANSAC mora najti model');
  } else {
    assert(result.inlierCount >= 4, `Vsaj 4 inlierji (dejansko: ${result.inlierCount})`);
    assert(result.inlierCount <= 5, `Največ 5 inlierjev (dejansko: ${result.inlierCount})`);
    
    // Check that outliers are correctly identified
    assert(result.inliers[5] === false, 'Outlier 5 pravilno označen');
    assert(result.inliers[6] === false, 'Outlier 6 pravilno označen');
    assert(result.inliers[7] === false, 'Outlier 7 pravilno označen');
    
    assert(result.rmse < 5, `RMSE < 5 (dejansko: ${result.rmse.toFixed(6)})`);
  }
}

// Summary
console.log('\n========================================');
console.log('POVZETEK');
console.log('========================================');
console.log(`Uspešnih testov: ${testsPassed}`);
console.log(`Neuspešnih testov: ${testsFailed}`);
console.log(`Skupaj testov: ${testsPassed + testsFailed}`);
console.log(`Uspešnost: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
  console.log('\n✓ VSI TESTI USPEŠNI');
  process.exit(0);
} else {
  console.log('\n✗ NEKATERI TESTI NEUSPEŠNI');
  process.exit(1);
}
