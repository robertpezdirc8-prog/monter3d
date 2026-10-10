// Mera3D Pro - Computer Vision Utilities
// Classical CV only - no neural networks

export interface Point2D { x: number; y: number; }
export interface FeatureDescriptor {
  point: Point2D;
  response: number;
  scale: number;
  angle: number;
  descriptor: Uint8Array;
}
export interface MatchResult {
  queryIdx: number;
  trainIdx: number;
  distance: number;
}

// Convert image to grayscale
export function toGrayscale(imageData: ImageData): Float32Array {
  const gray = new Float32Array(imageData.width * imageData.height);
  for (let i = 0; i < gray.length; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

// Gaussian blur
export function gaussianBlur(gray: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const kernel = new Float32Array(kernelSize);
  const half = Math.floor(kernelSize / 2);
  let sum = 0;
  for (let i = 0; i < kernelSize; i++) {
    const x = i - half;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

  // Horizontal pass
  const temp = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const sx = Math.min(Math.max(x + k, 0), width - 1);
        val += gray[y * width + sx] * kernel[k + half];
      }
      temp[y * width + x] = val;
    }
  }

  // Vertical pass
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val = 0;
      for (let k = -half; k <= half; k++) {
        const sy = Math.min(Math.max(y + k, 0), height - 1);
        val += temp[sy * width + x] * kernel[k + half];
      }
      result[y * width + x] = val;
    }
  }
  return result;
}

// Harris corner detection on grid
export function harrisCornerDetection(
  gray: Float32Array, width: number, height: number,
  blockSize: number = 5, k: number = 0.04, threshold: number = 0.01,
  gridSize: number = 8
): FeatureDescriptor[] {
  const blurred = gaussianBlur(gray, width, height, 1.0);
  const Ix = new Float32Array(width * height);
  const Iy = new Float32Array(width * height);

  // Sobel gradients
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      Ix[idx] = (blurred[idx + 1] - blurred[idx - 1]) / 2;
      Iy[idx] = (blurred[idx + width] - blurred[idx - width]) / 2;
    }
  }

  const half = Math.floor(blockSize / 2);
  const cellW = Math.floor(width / gridSize);
  const cellH = Math.floor(height / gridSize);
  const features: FeatureDescriptor[] = [];

  for (let cy = 0; cy < gridSize; cy++) {
    for (let cx = 0; cx < gridSize; cx++) {
      const startX = cx * cellW;
      const startY = cy * cellH;
      let bestResponse = 0;
      let bestPoint: Point2D = { x: 0, y: 0 };

      for (let y = startY + half; y < startY + cellH - half; y++) {
        for (let x = startX + half; x < startX + cellW - half; x++) {
          let A = 0, B = 0, C = 0;
          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              const idx = (y + dy) * width + (x + dx);
              A += Ix[idx] * Ix[idx];
              B += Iy[idx] * Iy[idx];
              C += Ix[idx] * Iy[idx];
            }
          }
          const det = A * B - C * C;
          const trace = A + B;
          const response = det - k * trace * trace;

          if (response > bestResponse && response > threshold * 1e8) {
            bestResponse = response;
            bestPoint = { x, y };
          }
        }
      }

      if (bestResponse > 0) {
        features.push({
          point: bestPoint,
          response: bestResponse,
          scale: blockSize,
          angle: Math.atan2(Iy[bestPoint.y * width + bestPoint.x], Ix[bestPoint.y * width + bestPoint.x]),
          descriptor: new Uint8Array(32) // placeholder
        });
      }
    }
  }
  return features;
}

// FAST corner detection
export function fastCornerDetection(
  gray: Float32Array, width: number, height: number,
  threshold: number = 20, gridSize: number = 8
): FeatureDescriptor[] {
  const circle = [
    [0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1],
    [2, 2], [1, 3], [0, 3], [-1, 3], [-2, 2], [-3, 1],
    [-3, 0], [-3, -1], [-2, -2], [-1, -3]
  ];
  
  const cellW = Math.floor(width / gridSize);
  const cellH = Math.floor(height / gridSize);
  const features: FeatureDescriptor[] = [];

  for (let cy = 0; cy < gridSize; cy++) {
    for (let cx = 0; cx < gridSize; cx++) {
      const startX = cx * cellW + 3;
      const startY = cy * cellH + 3;
      let bestScore = 0;
      let bestPoint: Point2D = { x: 0, y: 0 };

      for (let y = startY; y < startY + cellH - 3 && y < height - 3; y++) {
        for (let x = startX; x < startX + cellW - 3 && x < width - 3; x++) {
          const center = gray[y * width + x];
          let brighter = 0, darker = 0;
          
          for (const [dx, dy] of circle) {
            const px = x + dx, py = y + dy;
            const val = gray[py * width + px];
            if (val > center + threshold) brighter++;
            else if (val < center - threshold) darker++;
          }

          const score = Math.max(brighter, darker);
          if (score >= 9 && score > bestScore) {
            bestScore = score;
            bestPoint = { x, y };
          }
        }
      }

      if (bestScore >= 9) {
        features.push({
          point: bestPoint,
          response: bestScore,
          scale: 3,
          angle: 0,
          descriptor: new Uint8Array(32)
        });
      }
    }
  }
  return features;
}

// ORB-like descriptor computation (BRIEF pattern)
export function computeDescriptors(
  gray: Float32Array, width: number, height: number,
  features: FeatureDescriptor[], patchSize: number = 31
): void {
  // Simple BRIEF-like pattern pairs
  const pairs = [];
  const seed = 42;
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < 256; i++) {
    pairs.push([
      Math.floor(rand() * patchSize) - patchSize / 2,
      Math.floor(rand() * patchSize) - patchSize / 2,
      Math.floor(rand() * patchSize) - patchSize / 2,
      Math.floor(rand() * patchSize) - patchSize / 2
    ]);
  }

  const half = Math.floor(patchSize / 2);
  for (const f of features) {
    const desc = new Uint8Array(32);
    for (let i = 0; i < 256; i++) {
      const [x1, y1, x2, y2] = pairs[i];
      const px1 = Math.min(Math.max(Math.round(f.point.x + x1), 0), width - 1);
      const py1 = Math.min(Math.max(Math.round(f.point.y + y1), 0), height - 1);
      const px2 = Math.min(Math.max(Math.round(f.point.x + x2), 0), width - 1);
      const py2 = Math.min(Math.max(Math.round(f.point.y + y2), 0), height - 1);
      
      if (gray[py1 * width + px1] < gray[py2 * width + px2]) {
        desc[Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
    f.descriptor = desc;
  }
}

// Hamming distance for binary descriptors
function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = a[i] ^ b[i];
    while (xor) { dist++; xor &= xor - 1; }
  }
  return dist;
}

// BF matching with ratio test
export function bruteForceMatch(
  features1: FeatureDescriptor[], features2: FeatureDescriptor[],
  ratioThreshold: number = 0.75
): MatchResult[] {
  const matches: MatchResult[] = [];
  
  for (let i = 0; i < features1.length; i++) {
    let bestDist = Infinity, secondBest = Infinity;
    let bestIdx = -1;
    
    for (let j = 0; j < features2.length; j++) {
      const dist = hammingDistance(features1[i].descriptor, features2[j].descriptor);
      if (dist < bestDist) {
        secondBest = bestDist;
        bestDist = dist;
        bestIdx = j;
      } else if (dist < secondBest) {
        secondBest = dist;
      }
    }
    
    if (bestIdx >= 0 && bestDist < ratioThreshold * secondBest) {
      matches.push({ queryIdx: i, trainIdx: bestIdx, distance: bestDist });
    }
  }
  return matches;
}

// Cross-check matching
export function crossCheckMatch(
  features1: FeatureDescriptor[], features2: FeatureDescriptor[],
  ratioThreshold: number = 0.75
): MatchResult[] {
  const fwd = bruteForceMatch(features1, features2, ratioThreshold);
  const bwd = bruteForceMatch(features2, features1, ratioThreshold);
  
  const bwdMap = new Map<number, number>();
  for (const m of bwd) bwdMap.set(m.queryIdx, m.trainIdx);
  
  return fwd.filter(m => bwdMap.get(m.trainIdx) === m.queryIdx);
}

// Estimate homography using DLT (Direct Linear Transform)
export function estimateHomography(
  srcPoints: Point2D[], dstPoints: Point2D[]
): { matrix: number[]; inliers: boolean[]; rmse: number } | null {
  if (srcPoints.length < 4) return null;
  
  const n = srcPoints.length;
  
  // Normalize points for numerical stability
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
  
  // Normalized points
  const srcNorm = srcPoints.map(p => ({
    x: (p.x - srcMean.x) * srcScale,
    y: (p.y - srcMean.y) * srcScale
  }));
  const dstNorm = dstPoints.map(p => ({
    x: (p.x - dstMean.x) * dstScale,
    y: (p.y - dstMean.y) * dstScale
  }));
  
  // Build A matrix for DLT (Ah = 0)
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x = srcNorm[i].x, y = srcNorm[i].y;
    const u = dstNorm[i].x, v = dstNorm[i].y;
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  // Solve Ah = 0 using eigenvalue decomposition of A^T * A
  const h = solveHomogeneousSystem(A);
  if (!h) return null;
  
  // Denormalize: H = T_dst^-1 * H_norm * T_src
  const T_src = [srcScale, 0, -srcMean.x * srcScale, 0, srcScale, -srcMean.y * srcScale, 0, 0, 1];
  const T_dst_inv = [1/dstScale, 0, dstMean.x, 0, 1/dstScale, dstMean.y, 0, 0, 1];
  
  const H_norm = h;
  const H_temp = matMul3x3(T_dst_inv, H_norm);
  const H = matMul3x3(H_temp, T_src);
  
  // Normalize so H[8] = 1, but check for near-zero values
  if (Math.abs(H[8]) < 1e-10) {
    // H[8] is too small - this indicates a degenerate or invalid solution
    return null;
  }
  const scale = H[8];
  const H_normalized = H.map((v: number) => v / scale);
  
  // Compute inliers and RMSE
  const inliers: boolean[] = [];
  let sumSquaredError = 0;
  let inlierCount = 0;
  const threshold = 3.0;
  
  for (let i = 0; i < n; i++) {
    const x = srcPoints[i].x, y = srcPoints[i].y;
    const w = H_normalized[6] * x + H_normalized[7] * y + H_normalized[8];
    
    // Check for division by zero or invalid w
    if (Math.abs(w) < 1e-10 || !isFinite(w)) {
      inliers.push(false);
      continue;
    }
    
    const u = (H_normalized[0] * x + H_normalized[1] * y + H_normalized[2]) / w;
    const v = (H_normalized[3] * x + H_normalized[4] * y + H_normalized[5]) / w;
    
    // Check for invalid projected coordinates
    if (!isFinite(u) || !isFinite(v)) {
      inliers.push(false);
      continue;
    }
    
    const err = Math.sqrt((u - dstPoints[i].x) ** 2 + (v - dstPoints[i].y) ** 2);
    const isInlier = err < threshold;
    inliers.push(isInlier);
    
    // RMSE: sum of squared errors, then divide, then sqrt
    if (isInlier) {
      sumSquaredError += err * err;
      inlierCount++;
    }
  }
  
  // RMSE = sqrt(mean(squared_errors))
  const rmse = inlierCount > 0 ? Math.sqrt(sumSquaredError / inlierCount) : Infinity;
  return { matrix: H_normalized, inliers, rmse };
}

// Solve homogeneous system Ah = 0 using inverse power iteration on A^T * A
// For homography with 4 points: m=8 rows, n=9 columns (valid minimal case)
// NOTE: This method squares the condition number. For better stability, SVD would be preferred,
// but requires external libraries. Current implementation includes stability checks.
function solveHomogeneousSystem(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  // For homography: need at least 4 points = 8 equations, 9 unknowns
  // m can be less than n (underdetermined system) - this is normal for DLT
  if (m < 4) return null; // Need at least 4 equations
  if (n !== 9) return null; // Homography has 9 parameters
  
  // Check for invalid values
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (!isFinite(A[i][j])) return null;
    }
  }
  
  // Compute A^T * A (n x n matrix)
  const ATA: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < m; k++) {
        ATA[i][j] += A[k][i] * A[k][j];
      }
    }
  }
  
  // Check matrix stability - compute approximate condition number
  const diagSum = ATA.reduce((sum, row, i) => sum + Math.abs(row[i]), 0);
  if (diagSum < 1e-10) return null; // Matrix is essentially zero
  
  // Find eigenvector with smallest eigenvalue using inverse power iteration
  // Start with deterministic initial vector (not random for reproducibility)
  let v = new Array(n).fill(0);
  v[0] = 1; // Start with [1, 0, 0, ...]
  normalize(v);
  
  // Add small regularization to make ATA invertible
  // This is necessary because ATA is singular for exact solutions
  const reg = 1e-8;
  for (let i = 0; i < n; i++) ATA[i][i] += reg;
  
  // Inverse power iteration (find eigenvector with smallest eigenvalue)
  let prevV = [...v];
  let converged = false;
  for (let iter = 0; iter < 300; iter++) {
    // Solve ATA * w = v using Gaussian elimination
    const w = gaussianElimination(ATA, v);
    if (!w) return null;
    
    // Normalize
    const currentNorm = vectorNorm(w);
    if (!isFinite(currentNorm) || currentNorm < 1e-15) return null;
    
    for (let i = 0; i < n; i++) w[i] /= currentNorm;
    
    // Check convergence: change in direction (not magnitude)
    // Use dot product to measure angle between consecutive vectors
    let dotProduct = 0;
    for (let i = 0; i < n; i++) dotProduct += prevV[i] * w[i];
    const angleChange = Math.acos(Math.min(1, Math.max(-1, Math.abs(dotProduct))));
    
    if (iter > 20 && angleChange < 1e-10) {
      converged = true;
      v = w;
      break;
    }
    
    prevV = [...w];
    v = w;
  }
  
  // Verify result is valid
  if (!v || v.some(x => !isFinite(x))) return null;
  if (!converged) {
    // Check if result is still reasonable
    const residual = computeResidual(A, v);
    if (residual > 1e-6) return null; // Poor solution
  }
  
  return v;
}

// Compute residual ||A * v|| for validation
function computeResidual(A: number[][], v: number[]): number {
  const m = A.length;
  const n = v.length;
  let sum = 0;
  for (let i = 0; i < m; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += A[i][j] * v[j];
    }
    sum += rowSum * rowSum;
  }
  return Math.sqrt(sum);
}

function vectorNorm(v: number[]): number {
  let sum = 0;
  for (const x of v) sum += x * x;
  return Math.sqrt(sum);
}

function normalize(v: number[]): void {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < v.length; i++) v[i] /= norm;
}

// Matrix multiplication for 3x3 matrices (stored as 9-element arrays)
function matMul3x3(A: number[], B: number[]): number[] {
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

// Simple least squares solver
function solveLeastSquares(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  if (m < n) return null;
  
  // A^T * A * x = A^T * b (b = last column)
  const ATA: number[][] = Array.from({ length: n - 1 }, () => new Array(n - 1).fill(0));
  const ATb: number[] = new Array(n - 1).fill(0);
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      for (let k = 0; k < m; k++) {
        ATA[i][j] += A[k][i] * A[k][j];
      }
    }
    for (let k = 0; k < m; k++) {
      ATb[i] += A[k][i] * A[k][n - 1];
    }
  }
  
  return gaussianElimination(ATA, ATb);
}

function gaussianElimination(A: number[][], b: number[]): number[] | null {
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

// RANSAC homography estimation
export function ransacHomography(
  srcPoints: Point2D[], dstPoints: Point2D[],
  maxIterations: number = 1000, threshold: number = 3.0
): { matrix: number[]; inliers: boolean[]; inlierCount: number; rmse: number } | null {
  if (srcPoints.length < 4) return null;
  
  let bestInliers: boolean[] = [];
  let bestCount = 0;
  let bestMatrix: number[] = [];
  let bestRMSE = Infinity;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Random 4 points
    const indices = new Set<number>();
    while (indices.size < 4) indices.add(Math.floor(Math.random() * srcPoints.length));
    const idxArr = Array.from(indices);
    
    const src4 = idxArr.map(i => srcPoints[i]);
    const dst4 = idxArr.map(i => dstPoints[i]);
    
    const result = estimateHomography(src4, dst4);
    if (!result) continue;
    
    // Count inliers
    const inliers: boolean[] = [];
    let count = 0;
    for (let i = 0; i < srcPoints.length; i++) {
      const x = srcPoints[i].x, y = srcPoints[i].y;
      const w = result.matrix[6] * x + result.matrix[7] * y + result.matrix[8];
      if (Math.abs(w) < 1e-10) { inliers.push(false); continue; }
      const u = (result.matrix[0] * x + result.matrix[1] * y + result.matrix[2]) / w;
      const v = (result.matrix[3] * x + result.matrix[4] * y + result.matrix[5]) / w;
      const err = Math.sqrt((u - dstPoints[i].x) ** 2 + (v - dstPoints[i].y) ** 2);
      const isInlier = err < threshold;
      inliers.push(isInlier);
      if (isInlier) count++;
    }
    
    if (count > bestCount) {
      bestCount = count;
      bestInliers = inliers;
      bestMatrix = result.matrix;
    }
  }
  
  if (bestCount < 4) return null;
  
  // Refit on all inliers
  const inlierSrc = srcPoints.filter((_, i) => bestInliers[i]);
  const inlierDst = dstPoints.filter((_, i) => bestInliers[i]);
  const refined = estimateHomography(inlierSrc, inlierDst);
  
  if (!refined) {
    // Refinement failed, return best model from RANSAC iterations
    return { matrix: bestMatrix, inliers: bestInliers, inlierCount: bestCount, rmse: bestRMSE };
  }
  
  // After refinement, recompute inliers, count, and RMSE for the final model
  bestMatrix = refined.matrix;
  const finalInliers: boolean[] = [];
  let finalCount = 0;
  let finalSumSquaredError = 0;
  
  for (let i = 0; i < srcPoints.length; i++) {
    const x = srcPoints[i].x, y = srcPoints[i].y;
    const w = bestMatrix[6] * x + bestMatrix[7] * y + bestMatrix[8];
    
    if (Math.abs(w) < 1e-10 || !isFinite(w)) {
      finalInliers.push(false);
      continue;
    }
    
    const u = (bestMatrix[0] * x + bestMatrix[1] * y + bestMatrix[2]) / w;
    const v = (bestMatrix[3] * x + bestMatrix[4] * y + bestMatrix[5]) / w;
    
    if (!isFinite(u) || !isFinite(v)) {
      finalInliers.push(false);
      continue;
    }
    
    const err = Math.sqrt((u - dstPoints[i].x) ** 2 + (v - dstPoints[i].y) ** 2);
    const isInlier = err < threshold;
    finalInliers.push(isInlier);
    
    if (isInlier) {
      finalSumSquaredError += err * err;
      finalCount++;
    }
  }
  
  const finalRMSE = finalCount > 0 ? Math.sqrt(finalSumSquaredError / finalCount) : Infinity;
  
  // All returned values now describe the same final refined model
  return { 
    matrix: bestMatrix, 
    inliers: finalInliers, 
    inlierCount: finalCount, 
    rmse: finalRMSE 
  };
}

// Image quality assessment
export function assessImageQuality(imageData: ImageData): {
  sharpness: number;
  brightness: number;
  contrast: number;
  blurScore: number;
  glareDetected: boolean;
  overallScore: number;
} {
  const { data, width, height } = imageData;
  const gray = toGrayscale(imageData);
  
  // Brightness
  let totalBrightness = 0;
  for (let i = 0; i < gray.length; i++) totalBrightness += gray[i];
  const brightness = totalBrightness / gray.length / 255;
  
  // Contrast (std dev)
  let variance = 0;
  for (let i = 0; i < gray.length; i++) {
    variance += (gray[i] - totalBrightness / gray.length) ** 2;
  }
  const contrast = Math.sqrt(variance / gray.length) / 128;
  
  // Sharpness (Laplacian variance)
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = gray[idx - 1] + gray[idx + 1] + gray[idx - width] + gray[idx + width] - 4 * gray[idx];
      laplacianSum += Math.abs(lap);
      laplacianSqSum += lap * lap;
      count++;
    }
  }
  const sharpness = Math.sqrt(laplacianSqSum / count - (laplacianSum / count) ** 2) / 100;
  
  // Glare detection
  let brightPixels = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] > 240) brightPixels++;
  }
  const glareDetected = brightPixels / gray.length > 0.15;
  
  // Blur score (inverse of sharpness, normalized)
  const blurScore = Math.max(0, 1 - sharpness * 2);
  
  // Overall score
  const brightnessScore = 1 - Math.abs(brightness - 0.5) * 2;
  const overallScore = Math.max(0, Math.min(1,
    0.35 * sharpness + 0.25 * brightnessScore + 0.25 * contrast + 0.15 * (glareDetected ? 0 : 1)
  ));
  
  return {
    sharpness: Math.min(1, sharpness),
    brightness,
    contrast: Math.min(1, contrast),
    blurScore,
    glareDetected,
    overallScore
  };
}

// Hough line detection
export function houghLineDetection(
  gray: Float32Array, width: number, height: number,
  threshold: number = 80
): { angle: number; rho: number; votes: number; isVertical: boolean }[] {
  const maxRho = Math.sqrt(width * width + height * height);
  const rhoResolution = 1;
  const thetaResolution = Math.PI / 180;
  const numRho = Math.ceil(2 * maxRho / rhoResolution);
  const numTheta = Math.ceil(Math.PI / thetaResolution);
  
  const accumulator = new Int32Array(numRho * numTheta);
  
  // Edge detection (simple gradient magnitude)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      const mag = Math.sqrt(gx * gx + gy * gy);
      
      if (mag > 30) {
        for (let t = 0; t < numTheta; t++) {
          const theta = t * thetaResolution;
          const rho = x * Math.cos(theta) + y * Math.sin(theta);
          const rIdx = Math.round((rho + maxRho) / rhoResolution);
          if (rIdx >= 0 && rIdx < numRho) {
            accumulator[rIdx * numTheta + t]++;
          }
        }
      }
    }
  }
  
  // Find peaks
  const lines: { angle: number; rho: number; votes: number; isVertical: boolean }[] = [];
  for (let r = 0; r < numRho; r++) {
    for (let t = 0; t < numTheta; t++) {
      if (accumulator[r * numTheta + t] > threshold) {
        const theta = t * thetaResolution;
        const rho = r * rhoResolution - maxRho;
        const isVertical = theta < Math.PI / 4 || theta > 3 * Math.PI / 4;
        lines.push({ angle: theta * 180 / Math.PI, rho, votes: accumulator[r * numTheta + t], isVertical });
      }
    }
  }
  
  return lines.sort((a, b) => b.votes - a.votes).slice(0, 20);
}

// Measure distance between two points on image with scale
export function measureDistance(
  p1: Point2D, p2: Point2D,
  pixelToMeter: number | null,
  source: string
): { pixelDistance: number; metricDistance: number | null; uncertainty: number } {
  const pixelDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  const metricDist = pixelToMeter ? pixelDist * pixelToMeter : null;
  
  // Uncertainty based on source
  let uncertainty = 0;
  if (source === 'calibration_marker') uncertainty = 1;
  else if (source === 'manual_reference') uncertainty = 2;
  else if (source === 'homography') uncertainty = 5;
  else if (source === 'demo') uncertainty = 15;
  else uncertainty = 20;
  
  return { pixelDistance: pixelDist, metricDistance: metricDist, uncertainty };
}

// Detect vanishing points from line intersections
export function detectVanishingPoints(
  lines: { angle: number; rho: number; votes: number; isVertical: boolean }[]
): { point: Point2D; confidence: number; type: 'vertical' | 'horizontal' }[] {
  const verticals = lines.filter(l => l.isVertical);
  const horizontals = lines.filter(l => !l.isVertical);
  
  const results: { point: Point2D; confidence: number; type: 'vertical' | 'horizontal' }[] = [];
  
  // Group lines by similar angle
  if (verticals.length >= 2) {
    const avgAngle = verticals.reduce((s, l) => s + l.angle, 0) / verticals.length;
    const variance = verticals.reduce((s, l) => s + (l.angle - avgAngle) ** 2, 0) / verticals.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance) / 10);
    results.push({
      point: { x: 0, y: -1000 / Math.tan(avgAngle * Math.PI / 180) },
      confidence,
      type: 'vertical'
    });
  }
  
  if (horizontals.length >= 2) {
    const avgAngle = horizontals.reduce((s, l) => s + l.angle, 0) / horizontals.length;
    const variance = horizontals.reduce((s, l) => s + (l.angle - avgAngle) ** 2, 0) / horizontals.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance) / 10);
    results.push({
      point: { x: 1000, y: 0 },
      confidence,
      type: 'horizontal'
    });
  }
  
  return results;
}
