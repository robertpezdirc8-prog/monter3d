// Mera3D Pro - Node.js test runner
// Zaženi z: node --experimental-vm-modules test-runner.mjs

import { toGrayscale, gaussianBlur, harrisCornerDetection, computeDescriptors, crossCheckMatch, estimateHomography, ransacHomography, assessImageQuality } from './src/utils/cv.ts';
import { calculateFencePlan, calculateStairsPlan, estimateFenceMaterials, buildCostEstimate, validateMeasurementForEstimate, formatMeasurement, exportMeasurementsCSV } from './src/utils/geometry.ts';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
  }
}

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    testsPassed++;
    console.log(`✓ ${message} (dejansko: ${actual.toFixed(4)}, pričakovano: ${expected.toFixed(4)})`);
  } else {
    testsFailed++;
    console.error(`✗ ${message} (dejansko: ${actual.toFixed(4)}, pričakovano: ${expected.toFixed(4)}, razlika: ${diff.toFixed(4)})`);
  }
}

console.log('========================================');
console.log('Mera3D Pro - Node.js Test Runner');
console.log('========================================\n');

// Test 1: Grayscale
console.log('=== Test 1: Grayscale ===');
{
  const imageData = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
  imageData.data[0] = 255; imageData.data[1] = 0; imageData.data[2] = 0; imageData.data[3] = 255;
  imageData.data[4] = 0; imageData.data[5] = 255; imageData.data[6] = 0; imageData.data[7] = 255;
  imageData.data[8] = 0; imageData.data[9] = 0; imageData.data[10] = 255; imageData.data[11] = 255;
  imageData.data[12] = 128; imageData.data[13] = 128; imageData.data[14] = 128; imageData.data[15] = 255;
  
  const gray = toGrayscale(imageData);
  
  assertApprox(gray[0], 76.245, 0.01, 'Rdeča piksla');
  assertApprox(gray[1], 149.685, 0.01, 'Zelena piksla');
  assertApprox(gray[2], 29.88, 0.01, 'Modra piksla');
  assertApprox(gray[3], 128, 0.01, 'Siva piksla');
}

// Test 2: Gaussian blur
console.log('\n=== Test 2: Gaussian blur ===');
{
  const gray = new Float32Array([100, 200, 100, 200]);
  const blurred = gaussianBlur(gray, 2, 2, 1.0);
  
  assert(blurred.length === 4, 'Pravilna dolžina');
  assert(blurred[0] >= 100 && blurred[0] <= 200, 'Vrednosti v obsegu');
}

// Test 3: Harris
console.log('\n=== Test 3: Harris corner detection ===');
{
  const gray = new Float32Array(100 * 100);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      if (x < 50 && y < 50) gray[y * 100 + x] = 255;
      else gray[y * 100 + x] = 0;
    }
  }
  
  const features = harrisCornerDetection(gray, 100, 100, 5, 0.04, 0.01, 4);
  
  assert(features.length > 0, `Zaznanih ${features.length} značilk`);
  assert(features.length <= 16, 'Max 16 za 4x4 mrežo');
}

// Test 4: Homography - identity
console.log('\n=== Test 4: Homography - identiteta ===');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = [...srcPoints];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  assert(result !== null, 'Homografija uspešna');
  if (result) {
    assertApprox(result.matrix[0], 1, 0.01, 'H[0] ≈ 1');
    assertApprox(result.matrix[4], 1, 0.01, 'H[4] ≈ 1');
    assertApprox(result.matrix[8], 1, 0.01, 'H[8] ≈ 1');
    assert(result.rmse < 1, `RMSE < 1 (${result.rmse.toFixed(4)})`);
  }
}

// Test 5: Homography - translation
console.log('\n=== Test 5: Homography - translacija ===');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }
  ];
  const dstPoints = [
    { x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 120 }, { x: 10, y: 120 }
  ];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  assert(result !== null, 'Translacija uspešna');
  if (result) {
    assertApprox(result.matrix[2], 10, 0.5, 'H[2] ≈ 10');
    assertApprox(result.matrix[5], 20, 0.5, 'H[5] ≈ 20');
  }
}

// Test 6: RANSAC
console.log('\n=== Test 6: RANSAC z outliers ===');
{
  const srcPoints = [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 },
    { x: 0, y: 100 }, { x: 50, y: 50 }, { x: 25, y: 75 }
  ];
  const dstPoints = [
    { x: 10, y: 10 }, { x: 110, y: 10 }, { x: 110, y: 110 },
    { x: 10, y: 110 }, { x: 60, y: 60 }, { x: 200, y: 200 }
  ];
  
  const result = ransacHomography(srcPoints, dstPoints, 100, 5.0);
  
  assert(result !== null, 'RANSAC uspešen');
  if (result) {
    assert(result.inlierCount >= 4, `Inlierji: ${result.inlierCount}`);
    assert(result.rmse < 10, `RMSE: ${result.rmse.toFixed(2)}`);
  }
}

// Test 7: Degenerirani primeri
console.log('\n=== Test 7: Degenerirani primeri ===');
{
  const result1 = estimateHomography(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  );
  assert(result1 === null, 'Premalo točk (< 4) = null');
}

// Test 8: Fence plan
console.log('\n=== Test 8: Načrt ograje ===');
{
  const segments = [
    { startPoint: [0, 0], endPoint: [5, 0], heightChange: 0 },
    { startPoint: [5, 0], endPoint: [10, 0], heightChange: 1 }
  ];
  
  const config = {
    panelWidth: 1.8, panelHeight: 1.5, postWidth: 0.06,
    maxGap: 0.12, mountingStyle: 'stepped', slopeThreshold: 5
  };
  
  const plan = calculateFencePlan(segments, config);
  
  assert(plan.totalLength === 10, `Dolžina: ${plan.totalLength}m`);
  assert(plan.totalHeightChange === 1, `Višina: ${plan.totalHeightChange}m`);
  assert(plan.segments.length === 2, `Segmenti: ${plan.segments.length}`);
}

// Test 9: Stairs plan
console.log('\n=== Test 9: Načrt stopnic ===');
{
  const plan = calculateStairsPlan(5, 1.2, 2.5, 0.9);
  
  assert(plan.numSteps === 5, `Stopnice: ${plan.numSteps}`);
  assertApprox(plan.totalRise, 1.2, 0.01, 'Višina: 1.2m');
  assertApprox(plan.averageRise, 0.24, 0.01, 'Povp. stopnica: 0.24m');
}

// Test 10: Cost estimate
console.log('\n=== Test 10: Predračun z validacijo ===');
{
  const materials = [
    { id: '1', name: 'Panel', category: 'panels', quantity: 10, unit: 'kos', unitPrice: 50, totalPrice: 500 }
  ];
  
  const measurements = [
    { status: 'verified', scaleSource: 'manual_reference' },
    { status: 'warning', scaleSource: 'unknown' },
    { status: 'invalid', scaleSource: 'demo' }
  ];
  
  const estimate = buildCostEstimate(materials, { hours: 8, rate: 35 }, 0.22, measurements);
  
  assert(estimate.validMeasurements === 1, `Preverjene: ${estimate.validMeasurements}`);
  assert(estimate.warningMeasurements === 1, `Opozorila: ${estimate.warningMeasurements}`);
  assert(estimate.invalidMeasurements === 1, `Neveljavne: ${estimate.invalidMeasurements}`);
  assert(estimate.subtotal === 500, `Subtotal: ${estimate.subtotal}`);
  assert(estimate.total > 500, `Total: ${estimate.total.toFixed(2)}`);
}

// Test 11: Validation
console.log('\n=== Test 11: Validacija meritev ===');
{
  const v1 = validateMeasurementForEstimate('verified', 'manual_reference');
  assert(v1.canInclude === true, 'Preverjena + manual_reference = da');
  
  const v2 = validateMeasurementForEstimate('invalid', 'manual_reference');
  assert(v2.canInclude === false, 'Neveljavna = ne');
  
  const v3 = validateMeasurementForEstimate('verified', 'demo');
  assert(v3.canInclude === false, 'Preverjena + demo = ne');
}

// Test 12: Format
console.log('\n=== Test 12: Formatiranje ===');
{
  const f1 = formatMeasurement(5.123, 'm', 2.5);
  assert(f1.includes('5.123'), 'Vsebuje vrednost');
  assert(f1.includes('m'), 'Vsebuje enoto');
}

// Summary
console.log('\n========================================');
console.log(`REZULTATI: ${testsPassed} uspešnih, ${testsFailed} neuspešnih`);
console.log('========================================');

if (testsFailed > 0) {
  process.exit(1);
}
