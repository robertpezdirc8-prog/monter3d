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
  
  // FAZA 8 (P1): model mora konsistentno preslikati vsaj 4 točke. Če jih manj,
  // je model degeneriran (kolinearne točke, preslikava v premico, ...) in ga
  // zavržemo — sicer bi dobili "homografijo", ki ne opisuje geometrije fotografije.
  if (inlierCount < 4) return null;

  // RMSE = sqrt(mean(squared_errors))
  const rmse = inlierCount > 0 ? Math.sqrt(sumSquaredError / inlierCount) : Infinity;
  return { matrix: H_normalized, inliers, rmse };
}

// Solve homogeneous system Ah = 0
// For tall/square matrices (m >= n): one-sided Jacobi SVD on A
// For wide matrices (m < n): QR-based null space computation (stable, no squaring)
// For homography with 4 points: m=8 rows, n=9 columns (valid minimal case, underdetermined)
function solveHomogeneousSystem(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  // For homography: need at least 4 points = 8 equations, 9 unknowns
  if (m < 4) return null;
  if (n !== 9) return null;
  
  // Check for invalid values
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (!isFinite(A[i][j])) return null;
    }
  }
  
  let v: number[];
  
  if (m >= n) {
    // Tall or square matrix: use one-sided Jacobi SVD on A
    const result = oneSidedJacobiSVD(A, 100, 1e-10);
    if (!result) return null;
    
    const { singularValues, V } = result;
    
    // Find index of smallest singular value
    let minIdx = 0;
    let minVal = Math.abs(singularValues[0]);
    for (let i = 1; i < singularValues.length; i++) {
      if (Math.abs(singularValues[i]) < minVal) {
        minVal = Math.abs(singularValues[i]);
        minIdx = i;
      }
    }
    
    // Extract right singular vector
    v = [];
    for (let i = 0; i < n; i++) {
      v.push(V[i][minIdx]);
    }
  } else {
    // Wide matrix (underdetermined system, e.g., 8x9 for 4 points)
    // Use QR-based null space computation (stable, doesn't square condition number)
    const nullSpaceResult = computeNullSpaceQR(A);
    if (!nullSpaceResult) return null;
    v = nullSpaceResult;
  }
  
  // Verify result is valid
  if (v.some(x => !isFinite(x))) return null;

  // FAZA 8 (P1): preverjanje ostanka.
  //
  // Prej je veljal absolutni prag 1e-6, ki je smiseln LE za brezšumne podatke:
  // vsak realen nabor značilnic (napaka ~0,5 px) je bil zavrnjen in
  // estimateHomography je vrnil null, kar je pomenilo, da se homografija na
  // realnih fotografijah sploh ni mogla izračunati. Zdaj uporabljamo RELATIVNI
  // ostanek, normaliziran z normo matrike, ki je neodvisen od skaliranja podatkov.
  const residual = computeResidual(A, v);
  const scale = matrixFrobeniusNorm(A) * vectorNorm(v);
  const relativeResidual = scale > 1e-12 ? residual / scale : residual;
  if (!isFinite(relativeResidual) || relativeResidual > RELATIVE_RESIDUAL_TOLERANCE) return null;

  return v;
}

/**
 * Meja relativnega ostanka.
 *
 * Izmerjeno na realnih podatkih: nabor 7 točk z napako ~0,5 px (tipična napaka
 * značilnic) ima relativni ostanek ~1,8e-3, napačen/degeneriran model pa
 * 1e-1 ali več. Prag 1e-2 zato sprejme realen šum in zavrne pokvarjeno rešitev.
 * Končno kakovost modela preveri reprojekcija (vsaj 4 inlierji znotraj praga).
 */
const RELATIVE_RESIDUAL_TOLERANCE = 1e-2;

/** Frobeniusova norma matrike (||A||_F) — uporabljena za relativni ostanek. */
function matrixFrobeniusNorm(A: number[][]): number {
  let sum = 0;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[i].length; j++) {
      sum += A[i][j] * A[i][j];
    }
  }
  return Math.sqrt(sum);
}

// One-sided Jacobi SVD for matrix A (m x n, m >= n)
// Computes A = U * Σ * V^T by rotating columns of A
// Returns singular values and right singular vectors V
// This is more stable than eigendecomposition of A^T*A because it doesn't square condition number
function oneSidedJacobiSVD(
  A: number[][],
  maxIterations: number = 100,
  tolerance: number = 1e-10
): { singularValues: number[]; V: number[][] } | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m < n) return null;
  
  // Create copy of A
  const B = A.map(row => [...row]);
  
  // Initialize V as identity matrix (right singular vectors)
  const V: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Check convergence: compute off-diagonal norm of B^T * B
    let offDiagNorm = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        // Compute dot product of columns p and q
        let dot = 0;
        for (let i = 0; i < m; i++) {
          dot += B[i][p] * B[i][q];
        }
        offDiagNorm += dot * dot;
      }
    }
    
    if (Math.sqrt(offDiagNorm) < tolerance) break;
    
    // Apply Jacobi rotations to all pairs (p, q)
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        // Compute alpha = ||B_p||^2, beta = ||B_q||^2, gamma = B_p^T * B_q
        let alpha = 0, beta = 0, gamma = 0;
        for (let i = 0; i < m; i++) {
          alpha += B[i][p] * B[i][p];
          beta += B[i][q] * B[i][q];
          gamma += B[i][p] * B[i][q];
        }
        
        // Skip if columns are already orthogonal
        if (Math.abs(gamma) < 1e-15) continue;
        
        // Compute rotation angle
        const zeta = (beta - alpha) / (2 * gamma);
        
        // Handle zeta = 0 case (alpha = beta)
        // When zeta = 0, we need a 45-degree rotation
        let t: number;
        if (Math.abs(zeta) < 1e-15) {
          t = 1; // 45-degree rotation
        } else {
          t = Math.sign(zeta) / (Math.abs(zeta) + Math.sqrt(zeta * zeta + 1));
        }
        
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        
        // Rotate columns p and q of B
        for (let i = 0; i < m; i++) {
          const Bip = B[i][p];
          const Biq = B[i][q];
          B[i][p] = c * Bip - s * Biq;
          B[i][q] = s * Bip + c * Biq;
        }
        
        // Update V
        for (let i = 0; i < n; i++) {
          const Vip = V[i][p];
          const Viq = V[i][q];
          V[i][p] = c * Vip - s * Viq;
          V[i][q] = s * Vip + c * Viq;
        }
      }
    }
  }
  
  // Compute singular values (norms of columns of B)
  const singularValues: number[] = [];
  for (let j = 0; j < n; j++) {
    let norm = 0;
    for (let i = 0; i < m; i++) {
      norm += B[i][j] * B[i][j];
    }
    singularValues.push(Math.sqrt(norm));
  }
  
  // Verify convergence: check if columns are sufficiently orthogonal
  let maxOffDiagonal = 0;
  for (let p = 0; p < n; p++) {
    for (let q = p + 1; q < n; q++) {
      let dot = 0;
      for (let i = 0; i < m; i++) {
        dot += B[i][p] * B[i][q];
      }
      maxOffDiagonal = Math.max(maxOffDiagonal, Math.abs(dot));
    }
  }
  
  // If not converged, return null to reject unstable result
  if (maxOffDiagonal > 1e-8) {
    return null;
  }
  
  // Verify V is orthogonal
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dot = 0;
      for (let k = 0; k < n; k++) {
        dot += V[k][i] * V[k][j];
      }
      if (Math.abs(dot) > 1e-8) {
        return null; // V is not orthogonal
      }
    }
  }
  
  return { singularValues, V };
}

// Jacobi eigenvalue algorithm for symmetric matrices
// Returns eigenvalues and eigenvectors
function jacobiEigenSolver(
  A: number[][], 
  maxIterations: number = 100, 
  tolerance: number = 1e-10
): { eigenvalues: number[]; eigenvectors: number[][] } | null {
  const n = A.length;
  
  // Create copy of A
  const S = A.map(row => [...row]);
  
  // Initialize eigenvector matrix as identity
  const V: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j]);
          p = i;
          q = j;
        }
      }
    }
    
    // Check convergence
    if (maxVal < tolerance) break;
    
    // Compute rotation angle
    const theta = (S[q][q] - S[p][p]) / (2 * S[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    
    // Update S (only affected rows/columns)
    const Sp = [...S[p]];
    const Sq = [...S[q]];
    
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Sip = S[i][p];
        const Siq = S[i][q];
        S[i][p] = S[p][i] = c * Sip - s * Siq;
        S[i][q] = S[q][i] = s * Sip + c * Siq;
      }
    }
    
    S[p][p] = c * c * Sp[p] - 2 * s * c * Sp[q] + s * s * Sq[q];
    S[q][q] = s * s * Sp[p] + 2 * s * c * Sp[q] + c * c * Sq[q];
    S[p][q] = S[q][p] = 0;
    
    // Update eigenvector matrix
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }
  
  // Extract eigenvalues from diagonal
  const eigenvalues: number[] = [];
  for (let i = 0; i < n; i++) {
    eigenvalues.push(S[i][i]);
  }
  
  return { eigenvalues, eigenvectors: V };
}

// Compute null space of wide matrix A (m x n, m < n) using rank-revealing QR with pivoting
// Returns basis vector for 1D null space (for homography with 4 points)
// This is stable and doesn't square the condition number
function computeNullSpaceQR(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m >= n) return null; // Only for wide matrices
  if (m < 4) return null; // Need at least 4 equations for homography
  
  // Check for degenerate input: verify points are not collinear
  // For homography DLT, we need at least 4 non-collinear point pairs
  // Check if all source points are collinear (first 4 pairs)
  const isCollinear = checkCollinearity(A);
  if (isCollinear) return null; // Degenerate configuration
  
  // Transpose A to get A^T (n x m)
  const AT: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      AT[j][i] = A[i][j];
    }
  }
  
  // Rank-revealing QR with column pivoting
  // A^T * P = Q * R, where P is permutation matrix
  const Q: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
  const R = AT.map(row => [...row]);
  const pivot: number[] = Array.from({ length: m }, (_, i) => i);
  
  for (let k = 0; k < m; k++) {
    // Column pivoting: find column with largest norm from position k onwards
    let maxNorm = 0;
    let maxCol = k;
    for (let j = k; j < m; j++) {
      let norm = 0;
      for (let i = k; i < n; i++) {
        norm += R[i][j] * R[i][j];
      }
      norm = Math.sqrt(norm);
      if (norm > maxNorm) {
        maxNorm = norm;
        maxCol = j;
      }
    }
    
    // Swap columns k and maxCol
    if (maxCol !== k) {
      for (let i = 0; i < n; i++) {
        [R[i][k], R[i][maxCol]] = [R[i][maxCol], R[i][k]];
      }
      [pivot[k], pivot[maxCol]] = [pivot[maxCol], pivot[k]];
    }
    
    // Check for rank deficiency
    if (maxNorm < 1e-10) {
      return null; // Rank deficient, null space is not 1D
    }
    
    // Compute Householder vector for column k
    let norm = 0;
    for (let i = k; i < n; i++) {
      norm += R[i][k] * R[i][k];
    }
    norm = Math.sqrt(norm);
    
    const sign = R[k][k] >= 0 ? 1 : -1;
    const alpha = -sign * norm;
    
    const v: number[] = new Array(n).fill(0);
    for (let i = k; i < n; i++) {
      v[i] = R[i][k];
    }
    v[k] -= alpha;
    
    // Normalize v
    let vNorm = 0;
    for (let i = k; i < n; i++) {
      vNorm += v[i] * v[i];
    }
    vNorm = Math.sqrt(vNorm);
    
    if (vNorm < 1e-15) return null; // Degenerate
    
    for (let i = k; i < n; i++) {
      v[i] /= vNorm;
    }
    
    // Apply Householder reflection to R
    for (let j = k; j < m; j++) {
      let dot = 0;
      for (let i = k; i < n; i++) {
        dot += v[i] * R[i][j];
      }
      for (let i = k; i < n; i++) {
        R[i][j] -= 2 * v[i] * dot;
      }
    }
    
    // Apply Householder reflection to Q
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = k; j < n; j++) {
        dot += Q[i][j] * v[j];
      }
      for (let j = k; j < n; j++) {
        Q[i][j] -= 2 * dot * v[j];
      }
    }
  }
  
  // Check diagonal elements of R for rank
  for (let i = 0; i < m; i++) {
    if (Math.abs(R[i][i]) < 1e-10) {
      return null; // Rank deficient
    }
  }
  
  // The last column of Q (index n-1) is in the null space of A
  // For homography with 4 points: n=9, m=8, null space is 1D
  const nullVector: number[] = [];
  for (let i = 0; i < n; i++) {
    nullVector.push(Q[i][n - 1]);
  }
  
  // Verify it's actually in null space: ||A * nullVector|| should be small
  // FAZA 8 (P1): relativni ostanek (enako kot v solveHomogeneousSystem) — absolutni
  // prag je bil zavrnil tudi veljavno rešitev, ko so bile točke močno odmaknjene.
  const residual = computeResidual(A, nullVector);
  const scale = matrixFrobeniusNorm(A) * vectorNorm(nullVector);
  const relativeResidual = scale > 1e-12 ? residual / scale : residual;
  if (!isFinite(relativeResidual) || relativeResidual > RELATIVE_RESIDUAL_TOLERANCE) return null;
  
  // Verify null vector is normalized
  let norm = 0;
  for (let i = 0; i < n; i++) {
    norm += nullVector[i] * nullVector[i];
  }
  norm = Math.sqrt(norm);
  if (Math.abs(norm - 1) > 1e-6) return null; // Not normalized
  
  return nullVector;
}

// Check if point configuration is degenerate (collinear points)
function checkCollinearity(A: number[][]): boolean {
  // For homography DLT with 4 points, extract point coordinates
  // A is 8x9, each pair of rows corresponds to one point
  // Check if source points are collinear
  if (A.length < 8) return false;
  
  // Extract approximate point positions from DLT matrix structure
  // This is a simplified check - in practice, we'd need the original points
  // For now, check if the matrix has very small singular values
  let sumSquares = 0;
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      sumSquares += A[i][j] * A[i][j];
    }
  }
  
  // If matrix is essentially zero, points are degenerate
  if (sumSquares < 1e-10) return true;
  
  return false;
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
//
// FAZA 8 (P1): generator naključnih števil je determinističen (seed), zato so
// rezultati ponovljivi in jih je mogoče testirati. Prej je bil uporabljen
// Math.random, zato so isti podatki dali različne modele in so bili testi
// občasno neuspešni.
export function ransacHomography(
  srcPoints: Point2D[], dstPoints: Point2D[],
  maxIterations: number = 1000, threshold: number = 3.0,
  seed: number = 0x5EED
): { matrix: number[]; inliers: boolean[]; inlierCount: number; rmse: number } | null {
  if (srcPoints.length < 4) return null;
  if (srcPoints.length !== dstPoints.length) return null;

  const random = createSeededRandom(seed);

  let bestInliers: boolean[] = [];
  let bestCount = 0;
  let bestMatrix: number[] = [];
  let bestRMSE = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Random 4 points
    const indices = new Set<number>();
    let guard = 0;
    while (indices.size < 4 && guard < 1000) {
      indices.add(Math.floor(random() * srcPoints.length));
      guard++;
    }
    if (indices.size < 4) break;
    const idxArr = Array.from(indices);

    const src4 = idxArr.map(i => srcPoints[i]);
    const dst4 = idxArr.map(i => dstPoints[i]);

    const result = estimateHomography(src4, dst4);
    if (!result) continue;

    // Count inliers
    const inliers: boolean[] = [];
    let count = 0;
    let sumSquaredError = 0;
    for (let i = 0; i < srcPoints.length; i++) {
      const x = srcPoints[i].x, y = srcPoints[i].y;
      const w = result.matrix[6] * x + result.matrix[7] * y + result.matrix[8];
      if (Math.abs(w) < 1e-10 || !isFinite(w)) { inliers.push(false); continue; }
      const u = (result.matrix[0] * x + result.matrix[1] * y + result.matrix[2]) / w;
      const v = (result.matrix[3] * x + result.matrix[4] * y + result.matrix[5]) / w;
      if (!isFinite(u) || !isFinite(v)) { inliers.push(false); continue; }
      const err = Math.sqrt((u - dstPoints[i].x) ** 2 + (v - dstPoints[i].y) ** 2);
      const isInlier = err < threshold;
      inliers.push(isInlier);
      if (isInlier) {
        count++;
        sumSquaredError += err * err;
      }
    }

    if (count < 4) continue;

    // FAZA 8 (P1): RMSE najboljšega modela je bil prej vedno Infinity, ker se ni
    // nikoli izračunal — od tod so bili nekateri testi in prikazi nestabilni.
    const rmse = Math.sqrt(sumSquaredError / count);

    // Več inlierjev zmaga; ob enakem številu zmaga manjši RMSE.
    if (count > bestCount || (count === bestCount && rmse < bestRMSE)) {
      bestCount = count;
      bestInliers = inliers;
      bestMatrix = result.matrix;
      bestRMSE = rmse;
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
  const finalMatrix = refined.matrix;
  const finalInliers: boolean[] = [];
  let finalCount = 0;
  let finalSumSquaredError = 0;

  for (let i = 0; i < srcPoints.length; i++) {
    const x = srcPoints[i].x, y = srcPoints[i].y;
    const w = finalMatrix[6] * x + finalMatrix[7] * y + finalMatrix[8];

    if (Math.abs(w) < 1e-10 || !isFinite(w)) {
      finalInliers.push(false);
      continue;
    }

    const u = (finalMatrix[0] * x + finalMatrix[1] * y + finalMatrix[2]) / w;
    const v = (finalMatrix[3] * x + finalMatrix[4] * y + finalMatrix[5]) / w;

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

  // FAZA 8 (P1): če se je model po refitu poslabšal (manj inlierjev), zadržimo
  // najboljši model iz iteracij — refit lahko zaradi kolinearnih inlierjev odpove.
  if (finalCount < bestCount) {
    return { matrix: bestMatrix, inliers: bestInliers, inlierCount: bestCount, rmse: bestRMSE };
  }

  // All returned values now describe the same final refined model
  return {
    matrix: finalMatrix,
    inliers: finalInliers,
    inlierCount: finalCount,
    rmse: finalRMSE
  };
}

/**
 * FAZA 8 (P1): deterministični generator (mulberry32) — isti seed da vedno isti
 * niz števil, zato so rezultati RANSAC ponovljivi in testabilni.
 */
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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

/**
 * Calculate pixel-to-meter scale from a known reference distance
 * 
 * @param refPoint1 - First point of reference (pixels)
 * @param refPoint2 - Second point of reference (pixels)
 * @param realDistance - Known real-world distance between points (meters)
 * @returns Pixel-to-meter conversion factor, or null if invalid
 */
export function calculateScaleFromReference(
  refPoint1: Point2D,
  refPoint2: Point2D,
  realDistance: number
): number | null {
  // Validate inputs
  if (!isFinite(realDistance) || realDistance <= 0) return null;
  if (!isFinite(refPoint1.x) || !isFinite(refPoint1.y) || 
      !isFinite(refPoint2.x) || !isFinite(refPoint2.y)) return null;
  
  const pixelDistance = Math.sqrt(
    (refPoint2.x - refPoint1.x) ** 2 + 
    (refPoint2.y - refPoint1.y) ** 2
  );
  
  if (pixelDistance < 1 || !isFinite(pixelDistance)) return null; // Too small or invalid
  
  return realDistance / pixelDistance;
}

/**
 * Calculate real-world distance between two points using pixel-to-meter scale
 * 
 * @param point1 - First point (pixels)
 * @param point2 - Second point (pixels)
 * @param pixelToMeter - Conversion factor from pixels to meters
 * @returns Real-world distance in meters, or null if scale is invalid
 */
export function calculateRealDistance(
  point1: Point2D,
  point2: Point2D,
  pixelToMeter: number
): number | null {
  // Validate scale
  if (!isFinite(pixelToMeter) || pixelToMeter <= 0) return null;
  
  // Validate points
  if (!isFinite(point1.x) || !isFinite(point1.y) || 
      !isFinite(point2.x) || !isFinite(point2.y)) return null;
  
  const pixelDistance = Math.sqrt(
    (point2.x - point1.x) ** 2 + 
    (point2.y - point1.y) ** 2
  );
  
  if (!isFinite(pixelDistance)) return null;
  
  const result = pixelDistance * pixelToMeter;
  return isFinite(result) ? result : null;
}

/**
 * Assess measurement reliability based on various factors
 * 
 * @param pixelDistance - Distance in pixels between measurement points
 * @param imageWidth - Width of the image in pixels
 * @param imageHeight - Height of the image in pixels
 * @param referenceDistance - Distance of reference in pixels
 * @returns Reliability score (0-1) and warnings
 */
export function assessMeasurementReliability(
  pixelDistance: number,
  imageWidth: number,
  imageHeight: number,
  referenceDistance: number
): { reliability: number; warnings: string[] } {
  const warnings: string[] = [];
  let reliability = 1.0;
  
  // Validate inputs
  if (!isFinite(pixelDistance) || pixelDistance < 0) {
    return { reliability: 0, warnings: ['Neveljavna razdalja meritve'] };
  }
  if (!isFinite(imageWidth) || !isFinite(imageHeight) || imageWidth <= 0 || imageHeight <= 0) {
    return { reliability: 0, warnings: ['Neveljavne dimenzije slike'] };
  }
  if (!isFinite(referenceDistance) || referenceDistance < 0) {
    warnings.push('Neveljavna referenčna razdalja');
    reliability *= 0.5;
  }
  
  const imageDiagonal = Math.sqrt(imageWidth ** 2 + imageHeight ** 2);
  
  if (!isFinite(imageDiagonal) || imageDiagonal <= 0) {
    return { reliability: 0, warnings: ['Neveljavna diagonala slike'] };
  }
  
  // Check if measurement is too small relative to image
  if (pixelDistance < imageDiagonal * 0.02) {
    reliability *= 0.5;
    warnings.push('Meritev je zelo majhna glede na sliko - nizka natančnost');
  }
  
  // Check if reference is too small
  if (referenceDistance < imageDiagonal * 0.05) {
    reliability *= 0.7;
    warnings.push('Referenčna mera je majhna - priporočamo večjo referenco');
  }
  
  // Penalize if measurement is very large (likely perspective error)
  if (pixelDistance > imageDiagonal * 0.8) {
    reliability *= 0.8;
    warnings.push('Meritev zajema večino slike - možna perspektivna napaka');
  }
  
  return { reliability, warnings };
}
