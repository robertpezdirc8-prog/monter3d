// Mera3D Pro - Automated Tests
// Run with: node --loader ts-node/esm src/tests/runTests.ts

import { toGrayscale, gaussianBlur, harrisCornerDetection, computeDescriptors, crossCheckMatch, estimateHomography, ransacHomography, assessImageQuality } from '../utils/cv';
import { calculateFencePlan, calculateStairsPlan, estimateFenceMaterials, buildCostEstimate, validateMeasurementForEstimate, formatMeasurement } from '../utils/geometry';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    testsPassed++;
    console.log(`✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`✗ ${message}`);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string): void {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    testsPassed++;
    console.log(`✓ ${message} (actual: ${actual.toFixed(4)}, expected: ${expected.toFixed(4)})`);
  } else {
    testsFailed++;
    console.error(`✗ ${message} (actual: ${actual.toFixed(4)}, expected: ${expected.toFixed(4)}, diff: ${diff.toFixed(4)})`);
  }
}

// Test 1: Grayscale conversion
function testGrayscale() {
  console.log('\n=== Test: Grayscale Conversion ===');
  const imageData = new ImageData(2, 2);
  imageData.data[0] = 255; imageData.data[1] = 0; imageData.data[2] = 0; imageData.data[3] = 255; // Red
  imageData.data[4] = 0; imageData.data[5] = 255; imageData.data[6] = 0; imageData.data[7] = 255; // Green
  imageData.data[8] = 0; imageData.data[9] = 0; imageData.data[10] = 255; imageData.data[11] = 255; // Blue
  imageData.data[12] = 128; imageData.data[13] = 128; imageData.data[14] = 128; imageData.data[15] = 255; // Gray
  
  const gray = toGrayscale(imageData);
  
  assertApprox(gray[0], 76.245, 0.01, 'Red pixel grayscale');
  assertApprox(gray[1], 149.685, 0.01, 'Green pixel grayscale');
  assertApprox(gray[2], 29.88, 0.01, 'Blue pixel grayscale');
  assertApprox(gray[3], 128, 0.01, 'Gray pixel grayscale');
}

// Test 2: Gaussian blur
function testGaussianBlur() {
  console.log('\n=== Test: Gaussian Blur ===');
  const gray = new Float32Array([100, 200, 100, 200]);
  const blurred = gaussianBlur(gray, 2, 2, 1.0);
  
  assert(blurred.length === 4, 'Blurred array has correct length');
  assert(blurred[0] >= 100 && blurred[0] <= 200, 'Blurred values are in valid range');
}

// Test 3: Harris corner detection
function testHarrisCornerDetection() {
  console.log('\n=== Test: Harris Corner Detection ===');
  const gray = new Float32Array(100 * 100);
  // Create a simple pattern with corners
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      if (x < 50 && y < 50) gray[y * 100 + x] = 255;
      else gray[y * 100 + x] = 0;
    }
  }
  
  const features = harrisCornerDetection(gray, 100, 100, 5, 0.04, 0.01, 4);
  
  assert(features.length > 0, `Detected ${features.length} features`);
  assert(features.length <= 16, 'Feature count is reasonable (max 16 for 4x4 grid)');
}

// Test 4: Homography estimation
function testHomography() {
  console.log('\n=== Test: Homography Estimation ===');
  
  // Identity transformation
  const srcPoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ];
  const dstPoints = [...srcPoints];
  
  const result = estimateHomography(srcPoints, dstPoints);
  
  assert(result !== null, 'Homography estimation succeeded');
  if (result) {
    assertApprox(result.matrix[0], 1, 0.01, 'H[0] ≈ 1 (identity)');
    assertApprox(result.matrix[4], 1, 0.01, 'H[4] ≈ 1 (identity)');
    assertApprox(result.matrix[8], 1, 0.01, 'H[8] ≈ 1 (identity)');
    assert(result.rmse < 1, `RMSE is small (${result.rmse.toFixed(4)})`);
  }
  
  // Translation
  const srcPoints2 = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ];
  const dstPoints2 = [
    { x: 10, y: 20 },
    { x: 110, y: 20 },
    { x: 110, y: 120 },
    { x: 10, y: 120 }
  ];
  
  const result2 = estimateHomography(srcPoints2, dstPoints2);
  assert(result2 !== null, 'Translation homography succeeded');
  if (result2) {
    assertApprox(result2.matrix[2], 10, 0.1, 'H[2] ≈ 10 (translation x)');
    assertApprox(result2.matrix[5], 20, 0.1, 'H[5] ≈ 20 (translation y)');
  }
}

// Test 5: RANSAC homography
function testRANSACHomography() {
  console.log('\n=== Test: RANSAC Homography ===');
  
  // Create points with some outliers
  const srcPoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
    { x: 50, y: 50 },
    { x: 25, y: 75 }
  ];
  const dstPoints = [
    { x: 10, y: 10 },
    { x: 110, y: 10 },
    { x: 110, y: 110 },
    { x: 10, y: 110 },
    { x: 60, y: 60 },
    { x: 200, y: 200 } // Outlier
  ];
  
  const result = ransacHomography(srcPoints, dstPoints, 100, 5.0);
  
  assert(result !== null, 'RANSAC succeeded');
  if (result) {
    assert(result.inlierCount >= 4, `Found ${result.inlierCount} inliers (>= 4)`);
    assert(result.inlierCount <= srcPoints.length, `Inlier count is reasonable`);
    assert(result.rmse < 10, `RMSE is acceptable (${result.rmse.toFixed(2)})`);
  }
}

// Test 6: Image quality assessment
function testImageQuality() {
  console.log('\n=== Test: Image Quality Assessment ===');
  
  const imageData = new ImageData(100, 100);
  // Create a sharp image with good contrast
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      const val = ((x + y) % 20 < 10) ? 255 : 0;
      imageData.data[idx] = val;
      imageData.data[idx + 1] = val;
      imageData.data[idx + 2] = val;
      imageData.data[idx + 3] = 255;
    }
  }
  
  const quality = assessImageQuality(imageData);
  
  assert(quality.sharpness > 0, `Sharpness detected (${quality.sharpness.toFixed(3)})`);
  assert(quality.brightness >= 0 && quality.brightness <= 1, 'Brightness in valid range');
  assert(quality.contrast >= 0 && quality.contrast <= 1, 'Contrast in valid range');
  assert(quality.overallScore >= 0 && quality.overallScore <= 1, 'Overall score in valid range');
}

// Test 7: Fence plan calculation
function testFencePlan() {
  console.log('\n=== Test: Fence Plan Calculation ===');
  
  const segments = [
    { startPoint: [0, 0] as [number, number], endPoint: [5, 0] as [number, number], heightChange: 0 },
    { startPoint: [5, 0] as [number, number], endPoint: [10, 0] as [number, number], heightChange: 1 }
  ];
  
  const config = {
    panelWidth: 1.8,
    panelHeight: 1.5,
    postWidth: 0.06,
    maxGap: 0.12,
    mountingStyle: 'stepped' as const,
    slopeThreshold: 5
  };
  
  const plan = calculateFencePlan(segments, config);
  
  assert(plan.totalLength === 10, `Total length is 10m (got ${plan.totalLength})`);
  assert(plan.totalHeightChange === 1, `Total height change is 1m (got ${plan.totalHeightChange})`);
  assert(plan.segments.length === 2, `Has 2 segments (got ${plan.segments.length})`);
  assert(plan.totalPanels > 0, `Has panels (${plan.totalPanels})`);
  assert(plan.totalPosts > 0, `Has posts (${plan.totalPosts})`);
}

// Test 8: Stairs plan calculation
function testStairsPlan() {
  console.log('\n=== Test: Stairs Plan Calculation ===');
  
  const plan = calculateStairsPlan(5, 1.2, 2.5, 0.9);
  
  assert(plan.numSteps === 5, `Has 5 steps (got ${plan.numSteps})`);
  assertApprox(plan.totalRise, 1.2, 0.01, 'Total rise is 1.2m');
  assertApprox(plan.totalRun, 2.5, 0.01, 'Total run is 2.5m');
  assertApprox(plan.averageRise, 0.24, 0.01, 'Average rise is 0.24m');
  assertApprox(plan.averageRun, 0.5, 0.01, 'Average run is 0.5m');
  assert(plan.steps.length === 5, `Has 5 step objects (got ${plan.steps.length})`);
}

// Test 9: Material estimation
function testMaterialEstimation() {
  console.log('\n=== Test: Material Estimation ===');
  
  const segments = [
    { startPoint: [0, 0] as [number, number], endPoint: [10, 0] as [number, number], heightChange: 0 }
  ];
  
  const config = {
    panelWidth: 1.8,
    panelHeight: 1.5,
    postWidth: 0.06,
    maxGap: 0.12,
    mountingStyle: 'level' as const,
    slopeThreshold: 5
  };
  
  const plan = calculateFencePlan(segments, config);
  const materials = estimateFenceMaterials(plan, {
    panelPricePerM2: 85,
    postPriceEach: 45,
    railPricePerM: 12,
    fastenerPriceEach: 0.5,
    endCapPriceEach: 8
  });
  
  assert(materials.length > 0, `Generated ${materials.length} material items`);
  assert(materials.every(m => m.quantity > 0), 'All quantities are positive');
  assert(materials.every(m => m.totalPrice > 0), 'All prices are positive');
}

// Test 10: Cost estimate with measurement validation
function testCostEstimate() {
  console.log('\n=== Test: Cost Estimate with Validation ===');
  
  const materials = [
    { id: '1', name: 'Panel', category: 'panels', quantity: 10, unit: 'kos', unitPrice: 50, totalPrice: 500 }
  ];
  
  const measurements = [
    { status: 'verified' as const, scaleSource: 'manual_reference' },
    { status: 'warning' as const, scaleSource: 'unknown' },
    { status: 'invalid' as const, scaleSource: 'demo' }
  ];
  
  const estimate = buildCostEstimate(materials, { hours: 8, rate: 35 }, 0.22, measurements);
  
  assert(estimate.validMeasurements === 1, `1 valid measurement (got ${estimate.validMeasurements})`);
  assert(estimate.warningMeasurements === 1, `1 warning measurement (got ${estimate.warningMeasurements})`);
  assert(estimate.invalidMeasurements === 1, `1 invalid measurement (got ${estimate.invalidMeasurements})`);
  assert(estimate.subtotal === 500, `Subtotal is 500 (got ${estimate.subtotal})`);
  assert(estimate.total > 500, `Total includes tax and labor`);
}

// Test 11: Measurement validation
function testMeasurementValidation() {
  console.log('\n=== Test: Measurement Validation ===');
  
  const v1 = validateMeasurementForEstimate('verified', 'manual_reference');
  assert(v1.canInclude === true, 'Verified with manual_reference can be included');
  
  const v2 = validateMeasurementForEstimate('invalid', 'manual_reference');
  assert(v2.canInclude === false, 'Invalid cannot be included');
  
  const v3 = validateMeasurementForEstimate('warning', 'unknown');
  assert(v3.canInclude === false, 'Warning with unknown scale cannot be included');
  
  const v4 = validateMeasurementForEstimate('verified', 'demo');
  assert(v4.canInclude === false, 'Verified with demo scale cannot be included');
}

// Test 12: Format measurement
function testFormatMeasurement() {
  console.log('\n=== Test: Format Measurement ===');
  
  const f1 = formatMeasurement(5.123, 'm', 2.5);
  assert(f1.includes('5.123'), 'Format includes value');
  assert(f1.includes('m'), 'Format includes unit');
  assert(f1.includes('2.5'), 'Format includes uncertainty');
  
  const f2 = formatMeasurement(45.6, '°', 1.2);
  assert(f2.includes('45.6'), 'Angle format includes value');
  assert(f2.includes('°'), 'Angle format includes degree symbol');
}

// Run all tests
console.log('========================================');
console.log('Mera3D Pro - Automated Test Suite');
console.log('========================================');

try {
  testGrayscale();
  testGaussianBlur();
  testHarrisCornerDetection();
  testHomography();
  testRANSACHomography();
  testImageQuality();
  testFencePlan();
  testStairsPlan();
  testMaterialEstimation();
  testCostEstimate();
  testMeasurementValidation();
  testFormatMeasurement();
} catch (error) {
  console.error('\n❌ Test suite crashed:', error);
  testsFailed++;
}

console.log('\n========================================');
console.log(`Test Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('========================================');

export { testsPassed, testsFailed };
