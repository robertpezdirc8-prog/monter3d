// Mera3D Pro - Standalone Test Runner
// Run with: node test-runner.mjs
// This file contains inline implementations for testing

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  } else {
    testsFailed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertApprox(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    testsPassed++;
    console.log(`  ✓ ${message} (dejansko: ${actual.toFixed(4)}, pričakovano: ${expected.toFixed(4)})`);
  } else {
    testsFailed++;
    console.error(`  ✗ ${message} (dejansko: ${actual.toFixed(4)}, pričakovano: ${expected.toFixed(4)}, razlika: ${diff.toFixed(4)})`);
  }
}

// ===== INLINE IMPLEMENTATIONS =====

function gaussianElimination(A, b) {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
    
    if (Math.abs(aug[i][i]) < 1e-10) return null;
    
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }
  
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }
  return x;
}

function vectorNorm(v) {
  let sum = 0;
  for (const x of v) sum += x * x;
  return Math.sqrt(sum);
}

function normalize(v) {
  const norm = vectorNorm(v);
  if (norm > 0) for (let i = 0; i < v.length; i++) v[i] /= norm;
}

function matMul3x3(A, B) {
  const C = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
      }
    }
  }
  return C;
}

function solveHomogeneousSystem(A) {
  const m = A.length;
  const n = A[0].length;
  
  if (m < 4 || n !== 9) return null;
  
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (!isFinite(A[i][j])) return null;
    }
  }
  
  const ATA = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < m; k++) {
        ATA[i][j] += A[k][i] * A[k][j];
      }
    }
  }
  
  const diagSum = ATA.reduce((sum, row, i) => sum + Math.abs(row[i]), 0);
  if (diagSum < 1e-10) return null;
  
  let v = new Array(n).fill(0);
  v[0] = 1;
  normalize(v);
  
  const reg = 1e-8;
  for (let i = 0; i < n; i++) ATA[i][i] += reg;
  
  let prevV = [...v];
  let _converged = false;
  for (let iter = 0; iter < 300; iter++) {
    const w = gaussianElimination(ATA, v);
    if (!w) return null;
    
    const currentNorm = vectorNorm(w);
    if (!isFinite(currentNorm) || currentNorm < 1e-15) return null;
    
    for (let i = 0; i < n; i++) w[i] /= currentNorm;
    
    let dotProduct = 0;
    for (let i = 0; i < n; i++) dotProduct += prevV[i] * w[i];
    const angleChange = Math.acos(Math.min(1, Math.max(-1, Math.abs(dotProduct))));
    
    if (iter > 20 && angleChange < 1e-10) {
      _converged = true;
      v = w;
      break;
    }
    
    prevV = [...w];
    v = w;
  }
  
  if (!v || v.some(x => !isFinite(x))) return null;
  return v;
}

function estimateHomography(srcPoints, dstPoints) {
  if (srcPoints.length < 4) return null;
  
  const n = srcPoints.length;
  
  const srcMean = { x: 0, y: 0 };
  const dstMean = { x: 0, y: 0 };
  for (let i = 0; i < n; i++) {
    srcMean.x += srcPoints[i].x;
    srcMean.y += srcPoints[i].y;
    dstMean.x += dstPoints[i].x;
    dstMean.y += dstPoints[i].y;
  }
  srcMean.x /= n; srcMean.y /= n;
  dstMean.x /= n; dstMean.y /= n;
  
  let srcScale = 0, dstScale = 0;
  for (let i = 0; i < n; i++) {
    srcScale += Math.sqrt((srcPoints[i].x - srcMean.x) ** 2 + (srcPoints[i].y - srcMean.y) ** 2);
    dstScale += Math.sqrt((dstPoints[i].x - dstMean.x) ** 2 + (dstPoints[i].y - dstMean.y) ** 2);
  }
  srcScale = (srcScale > 0) ? (n * Math.SQRT2) / srcScale : 1;
  dstScale = (dstScale > 0) ? (n * Math.SQRT2) / dstScale : 1;
  
  const srcNorm = srcPoints.map(p => ({
    x: (p.x - srcMean.x) * srcScale,
    y: (p.y - srcMean.y) * srcScale
  }));
  const dstNorm = dstPoints.map(p => ({
    x: (p.x - dstMean.x) * dstScale,
    y: (p.y - dstMean.y) * dstScale
  }));
  
  const A = [];
  for (let i = 0; i < n; i++) {
    const x = srcNorm[i].x, y = srcNorm[i].y;
    const u = dstNorm[i].x, v = dstNorm[i].y;
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  const h = solveHomogeneousSystem(A);
  if (!h) return null;
  
  const T_src = [srcScale, 0, -srcMean.x * srcScale, 0, srcScale, -srcMean.y * srcScale, 0, 0, 1];
  const T_dst_inv = [1/dstScale, 0, dstMean.x, 0, 1/dstScale, dstMean.y, 0, 0, 1];
  
  const H_temp = matMul3x3(T_dst_inv, h);
  const H = matMul3x3(H_temp, T_src);
  
  if (Math.abs(H[8]) < 1e-10) return null;
  const scale = H[8];
  const H_normalized = H.map(v => v / scale);
  
  const inliers = [];
  let sumSquaredError = 0;
  let inlierCount = 0;
  const threshold = 3.0;
  
  for (let i = 0; i < n; i++) {
    const x = srcPoints[i].x, y = srcPoints[i].y;
    const w = H_normalized[6] * x + H_normalized[7] * y + H_normalized[8];
    
    if (Math.abs(w) < 1e-10 || !isFinite(w)) {
      inliers.push(false);
      continue;
    }
    
    const u = (H_normalized[0] * x + H_normalized[1] * y + H_normalized[2]) / w;
    const v = (H_normalized[3] * x + H_normalized[4] * y + H_normalized[5]) / w;
    
    if (!isFinite(u) || !isFinite(v)) {
      inliers.push(false);
      continue;
    }
    
    const err = Math.sqrt((u - dstPoints[i].x) ** 2 + (v - dstPoints[i].y) ** 2);
    const isInlier = err < threshold;
    inliers.push(isInlier);
    
    if (isInlier) {
      sumSquaredError += err * err;
      inlierCount++;
    }
  }
  
  const rmse = inlierCount > 0 ? Math.sqrt(sumSquaredError / inlierCount) : Infinity;
  return { matrix: H_normalized, inliers, rmse };
}

function calculateFencePlan(segments, config) {
  const fenceSegments = [];
  let totalPanels = 0;
  let totalPosts = 0;
  let totalLength = 0;
  let totalHeightChange = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const dx = seg.endPoint[0] - seg.startPoint[0];
    const dy = seg.endPoint[1] - seg.startPoint[1];
    const length = Math.sqrt(dx * dx + dy * dy);
    
    totalLength += length;
    totalHeightChange += seg.heightChange;

    const effectiveWidth = config.panelWidth + config.postWidth;
    const numPanels = Math.max(1, Math.round(length / effectiveWidth));
    const numPosts = numPanels + 1;

    fenceSegments.push({
      id: `seg-${i}`,
      startPoint: seg.startPoint,
      endPoint: seg.endPoint,
      length,
      heightChange: seg.heightChange,
      numPanels,
      numPosts
    });

    totalPanels += numPanels;
    totalPosts += numPosts;
  }

  return {
    totalLength,
    totalHeightChange,
    segments: fenceSegments,
    totalPanels,
    totalPosts
  };
}

function validateMeasurementForEstimate(status, scaleSource) {
  if (status === 'invalid') {
    return { canInclude: false };
  }
  if (status === 'warning') {
    if (scaleSource === 'unknown' || scaleSource === 'normalized') {
      return { canInclude: false };
    }
    return { canInclude: true };
  }
  if (scaleSource === 'unknown' || scaleSource === 'normalized' || scaleSource === 'demo') {
    return { canInclude: false };
  }
  return { canInclude: true };
}

function buildCostEstimate(materials, labor, taxRate, measurements) {
  const subtotal = materials.reduce((sum, m) => {
    if (!isFinite(m.totalPrice) || m.totalPrice < 0) return sum;
    return sum + m.totalPrice;
  }, 0);
  
  let laborTotal = 0;
  if (labor && isFinite(labor.hours) && isFinite(labor.rate)) {
    laborTotal = labor.hours * labor.rate;
  }
  
  const validTaxRate = (isFinite(taxRate) && taxRate >= 0) ? taxRate : 0;
  const beforeTax = subtotal + laborTotal;
  const tax = beforeTax * validTaxRate;
  
  let validMeasurements = 0;
  let invalidMeasurements = 0;
  let warningMeasurements = 0;
  
  if (measurements) {
    for (const m of measurements) {
      const validation = validateMeasurementForEstimate(m.status, m.scaleSource);
      if (!validation.canInclude) {
        if (m.status === 'invalid') invalidMeasurements++;
        else warningMeasurements++;
      } else {
        validMeasurements++;
      }
    }
  }

  return {
    materials,
    subtotal,
    tax,
    taxRate: validTaxRate,
    total: beforeTax + tax,
    validMeasurements,
    invalidMeasurements,
    warningMeasurements
  };
}

// ===== TESTS =====

console.log('========================================');
console.log('Mera3D Pro - Test Runner');
console.log('========================================\n');

// Test 1: Homography - identity
console.log('Test 1: Homografija - identiteta');
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

// Test 2: Homography - translation
console.log('\nTest 2: Homografija - translacija');
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

// Test 3: Degenerate cases
console.log('\nTest 3: Degenerirani primeri');
{
  const result1 = estimateHomography(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  );
  assert(result1 === null, 'Premalo točk (< 4) = null');
}

// Test 4: Sequential fence segments
console.log('\nTest 4: Zaporedni segmenti ograje');
{
  const segments = [
    { startPoint: [0, 0], endPoint: [5, 0], heightChange: 0 },
    { startPoint: [5, 0], endPoint: [8, 0], heightChange: 0 },
    { startPoint: [8, 0], endPoint: [12, 0], heightChange: 0 }
  ];
  
  const config = { panelWidth: 1.8, panelHeight: 1.5, postWidth: 0.06 };
  const plan = calculateFencePlan(segments, config);
  
  assert(plan.totalLength === 12, `Skupna dolžina: 12m (dejansko: ${plan.totalLength}m)`);
  assert(plan.segments.length === 3, `3 segmenti (dejansko: ${plan.segments.length})`);
  assert(plan.segments[0].endPoint[0] === plan.segments[1].startPoint[0], 
    'Segment 1 se poveže na segment 2');
  assert(plan.segments[1].endPoint[0] === plan.segments[2].startPoint[0], 
    'Segment 2 se poveže na segment 3');
}

// Test 5: Invalid measurements excluded
console.log('\nTest 5: Neveljavne meritve izključene iz predračuna');
{
  const materials = [
    { id: '1', name: 'Panel', totalPrice: 500 }
  ];
  
  const invalidMeasurements = [
    { status: 'invalid', scaleSource: 'demo' },
    { status: 'invalid', scaleSource: 'unknown' }
  ];
  
  const estimate1 = buildCostEstimate(materials, { hours: 8, rate: 35 }, 0.22, invalidMeasurements);
  
  assert(estimate1.invalidMeasurements === 2, `2 neveljavni (dejansko: ${estimate1.invalidMeasurements})`);
  assert(estimate1.validMeasurements === 0, `0 veljavnih (dejansko: ${estimate1.validMeasurements})`);
  assert(estimate1.subtotal === 500, `Subtotal je 500`);
  
  const validMeasurements = [
    { status: 'verified', scaleSource: 'manual_reference' },
    { status: 'verified', scaleSource: 'calibration_marker' }
  ];
  
  const estimate2 = buildCostEstimate(materials, { hours: 8, rate: 35 }, 0.22, validMeasurements);
  
  assert(estimate2.validMeasurements === 2, `2 veljavni (dejansko: ${estimate2.validMeasurements})`);
  assert(estimate2.total === estimate1.total, `Končni znesek je enak`);
}

// Test 6: NaN and Infinity protection
console.log('\nTest 6: Zaščita pred NaN in Infinity');
{
  const invalidMaterials = [
    { id: '1', name: 'Panel', totalPrice: NaN },
    { id: '2', name: 'Post', totalPrice: Infinity }
  ];
  
  const estimate = buildCostEstimate(invalidMaterials, { hours: 8, rate: 35 }, 0.22, []);
  
  assert(estimate.subtotal === 0, `Subtotal je 0 za neveljavne materiale`);
  assert(isFinite(estimate.total), 'Total je končen');
  assert(!isNaN(estimate.total), 'Total ni NaN');
}

// Summary
console.log('\n========================================');
console.log(`REZULTATI: ${testsPassed} uspešnih, ${testsFailed} neuspešnih`);
console.log('========================================');

if (testsFailed > 0) {
  process.exit(1);
}
