/**
 * Mera3D Pro - Perspective Transform Module
 * 
 * Provides perspective warping with both OpenCV.js and pure JS fallback.
 * User marks 4 corners of a planar surface, and this module creates
 * a perspective-aligned preview of that area.
 * 
 * ⚠️ LIMITATIONS:
 * - 2D perspective alignment does NOT reconstruct depth
 * - No photorealistic occlusion handling
 * - Accuracy depends on correct corner marking
 * - For true 3D reconstruction, use COLMAP (separate process)
 */

import { loadOpenCV, isOpenCVLoaded, imageToMat, matToImageData } from './opencvLoader';

export interface PerspectiveCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

export interface PerspectiveResult {
  /** The warped image data */
  imageData: ImageData;
  /** Width of the output in pixels */
  width: number;
  /** Height of the output in pixels */
  height: number;
  /** The 3x3 perspective transform matrix */
  transformMatrix: number[];
  /** Which engine was used */
  engine: 'opencv' | 'js-fallback';
}

/**
 * Apply perspective warp to an image.
 * Uses OpenCV.js if available, otherwise falls back to pure JS implementation.
 */
export async function warpPerspective(
  imageSource: HTMLImageElement | string,
  corners: PerspectiveCorners,
  outputWidth?: number,
  outputHeight?: number,
  forceJS: boolean = false
): Promise<PerspectiveResult> {
  // Load image
  const img = typeof imageSource === 'string'
    ? await loadImage(imageSource)
    : imageSource;
  
  // Calculate output dimensions if not specified
  if (!outputWidth || !outputHeight) {
    const dims = computeOutputDimensions(corners);
    outputWidth = outputWidth || dims.width;
    outputHeight = outputHeight || dims.height;
  }
  
  // Validate and limit output dimensions
  validateOutputDimensions(outputWidth, outputHeight);
  
  // Limit to prevent memory issues
  const MAX_DIM = 2048;
  if (outputWidth > MAX_DIM || outputHeight > MAX_DIM) {
    const scale = Math.min(MAX_DIM / outputWidth, MAX_DIM / outputHeight);
    outputWidth = Math.round(outputWidth * scale);
    outputHeight = Math.round(outputHeight * scale);
  }
  
  // Try OpenCV.js first (unless forced to use JS)
  if (!forceJS && isOpenCVLoaded()) {
    try {
      return await warpPerspectiveOpenCV(img, corners, outputWidth, outputHeight);
    } catch (err) {
      console.warn('OpenCV.js warp failed, falling back to JS:', err);
    }
  }
  
  // Try loading OpenCV if not loaded yet
  if (!forceJS && !isOpenCVLoaded()) {
    try {
      await loadOpenCV();
      return await warpPerspectiveOpenCV(img, corners, outputWidth, outputHeight);
    } catch (err) {
      console.warn('OpenCV.js not available, using JS fallback:', err);
    }
  }
  
  // JS fallback
  return warpPerspectiveJSFallback(img, corners, outputWidth, outputHeight);
}

/**
 * Load image from URL/dataURL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

/**
 * Compute output dimensions from corners
 */
function computeOutputDimensions(corners: PerspectiveCorners): { width: number; height: number } {
  const widthTop = Math.sqrt(
    (corners.topRight.x - corners.topLeft.x) ** 2 + 
    (corners.topRight.y - corners.topLeft.y) ** 2
  );
  const widthBottom = Math.sqrt(
    (corners.bottomRight.x - corners.bottomLeft.x) ** 2 + 
    (corners.bottomRight.y - corners.bottomLeft.y) ** 2
  );
  const heightLeft = Math.sqrt(
    (corners.bottomLeft.x - corners.topLeft.x) ** 2 + 
    (corners.bottomLeft.y - corners.topLeft.y) ** 2
  );
  const heightRight = Math.sqrt(
    (corners.bottomRight.x - corners.topRight.x) ** 2 + 
    (corners.bottomRight.y - corners.topRight.y) ** 2
  );
  
  return {
    width: Math.max(1, Math.round((widthTop + widthBottom) / 2)),
    height: Math.max(1, Math.round((heightLeft + heightRight) / 2))
  };
}

/**
 * Validate output dimensions
 */
function validateOutputDimensions(width: number, height: number): void {
  if (!isFinite(width) || !isFinite(height)) {
    throw new Error('Output dimensions must be finite numbers');
  }
  if (width <= 0 || height <= 0) {
    throw new Error('Output dimensions must be positive');
  }
  if (width > 10000 || height > 10000) {
    throw new Error('Output dimensions too large (max 10000px)');
  }
}

/**
 * OpenCV.js implementation
 */
async function warpPerspectiveOpenCV(
  img: HTMLImageElement,
  corners: PerspectiveCorners,
  outputWidth: number,
  outputHeight: number
): Promise<PerspectiveResult> {
  const cv = await loadOpenCV();
  
  const srcMat = imageToMat(cv, img);
  const dstMat = new cv.Mat(outputHeight, outputWidth, cv.CV_8UC4);
  
  try {
    const srcPoints = new cv.Mat(4, 1, cv.CV_32FC2);
    srcPoints.data32F[0] = corners.topLeft.x;
    srcPoints.data32F[1] = corners.topLeft.y;
    srcPoints.data32F[2] = corners.topRight.x;
    srcPoints.data32F[3] = corners.topRight.y;
    srcPoints.data32F[4] = corners.bottomRight.x;
    srcPoints.data32F[5] = corners.bottomRight.y;
    srcPoints.data32F[6] = corners.bottomLeft.x;
    srcPoints.data32F[7] = corners.bottomLeft.y;
    
    const dstPoints = new cv.Mat(4, 1, cv.CV_32FC2);
    dstPoints.data32F[0] = 0;
    dstPoints.data32F[1] = 0;
    dstPoints.data32F[2] = outputWidth - 1;
    dstPoints.data32F[3] = 0;
    dstPoints.data32F[4] = outputWidth - 1;
    dstPoints.data32F[5] = outputHeight - 1;
    dstPoints.data32F[6] = 0;
    dstPoints.data32F[7] = outputHeight - 1;
    
    const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
    cv.warpPerspective(srcMat, dstMat, M, new cv.Size(outputWidth, outputHeight));
    
    const matrixValues: number[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        matrixValues.push(M.doubleAt(i, j));
      }
    }
    
    const imageData = matToImageData(cv, dstMat);
    
    srcPoints.delete();
    dstPoints.delete();
    M.delete();
    
    return { imageData, width: outputWidth, height: outputHeight, transformMatrix: matrixValues, engine: 'opencv' };
  } finally {
    srcMat.delete();
    dstMat.delete();
  }
}

/**
 * Pure JS fallback implementation with bilinear interpolation
 */
function warpPerspectiveJSFallback(
  img: HTMLImageElement,
  corners: PerspectiveCorners,
  outputWidth: number,
  outputHeight: number
): PerspectiveResult {
  // Validate corners
  validateCorners(corners);
  
  // Get source image data
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const srcImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Compute inverse homography (dst -> src)
  const dstCorners = [
    { x: 0, y: 0 },
    { x: outputWidth - 1, y: 0 },
    { x: outputWidth - 1, y: outputHeight - 1 },
    { x: 0, y: outputHeight - 1 }
  ];
  
  const srcCorners = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const H = solvePerspectiveDLT(dstCorners, srcCorners);
  
  // Create output
  const outputData = new Uint8ClampedArray(outputWidth * outputHeight * 4);
  const srcW = srcImageData.width;
  const srcH = srcImageData.height;
  const srcData = srcImageData.data;
  
  // For each output pixel, find source pixel via inverse transform
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const w = H[6] * x + H[7] * y + H[8];
      
      if (Math.abs(w) < 1e-10 || !isFinite(w)) {
        const idx = (y * outputWidth + x) * 4;
        outputData[idx] = outputData[idx + 1] = outputData[idx + 2] = outputData[idx + 3] = 0;
        continue;
      }
      
      const srcX = (H[0] * x + H[1] * y + H[2]) / w;
      const srcY = (H[3] * x + H[4] * y + H[5]) / w;
      
      if (!isFinite(srcX) || !isFinite(srcY) || srcX < 0 || srcX >= srcW - 1 || srcY < 0 || srcY >= srcH - 1) {
        const idx = (y * outputWidth + x) * 4;
        outputData[idx] = outputData[idx + 1] = outputData[idx + 2] = outputData[idx + 3] = 0;
        continue;
      }
      
      // Bilinear interpolation
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const dx = srcX - x0;
      const dy = srcY - y0;
      
      const i00 = (y0 * srcW + x0) * 4;
      const i01 = (y0 * srcW + x0 + 1) * 4;
      const i10 = ((y0 + 1) * srcW + x0) * 4;
      const i11 = ((y0 + 1) * srcW + x0 + 1) * 4;
      
      const dstIdx = (y * outputWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        outputData[dstIdx + c] = Math.round(
          srcData[i00 + c] * (1 - dx) * (1 - dy) +
          srcData[i01 + c] * dx * (1 - dy) +
          srcData[i10 + c] * (1 - dx) * dy +
          srcData[i11 + c] * dx * dy
        );
      }
    }
  }
  
  // Compute forward matrix for reference
  const forwardMatrix = computePerspectiveMatrix(corners, outputWidth, outputHeight);
  
  return {
    imageData: new ImageData(outputData, outputWidth, outputHeight),
    width: outputWidth,
    height: outputHeight,
    transformMatrix: forwardMatrix,
    engine: 'js-fallback'
  };
}

/**
 * Validate corners for degenerate cases
 */
function validateCorners(corners: PerspectiveCorners): void {
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  
  for (const p of pts) {
    if (!isFinite(p.x) || !isFinite(p.y)) {
      throw new Error('Invalid corner coordinates (NaN or Infinity)');
    }
  }
  
  // Check for duplicate points
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dist = Math.sqrt((pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2);
      if (dist < 1) {
        throw new Error(`Corners ${i} and ${j} are too close (distance: ${dist.toFixed(1)}px)`);
      }
    }
  }
  
  // Check for collinearity
  for (let i = 0; i < 4; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % 4];
    const p3 = pts[(i + 2) % 4];
    const area = Math.abs((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y));
    if (area < 1) {
      throw new Error('Points are collinear or near-collinear');
    }
  }
}

// ===== DLT / Homography computation =====

/**
 * Compute perspective transform matrix from 4 source corners to rectangle
 */
export function computePerspectiveMatrix(
  sourceCorners: PerspectiveCorners,
  outputWidth: number,
  outputHeight: number
): number[] {
  const dst = [
    { x: 0, y: 0 },
    { x: outputWidth - 1, y: 0 },
    { x: outputWidth - 1, y: outputHeight - 1 },
    { x: 0, y: outputHeight - 1 }
  ];
  
  const src = [
    sourceCorners.topLeft,
    sourceCorners.topRight,
    sourceCorners.bottomRight,
    sourceCorners.bottomLeft
  ];
  
  return solvePerspectiveDLT(src, dst);
}

/**
 * DLT algorithm for perspective transform estimation
 */
function solvePerspectiveDLT(
  src: { x: number; y: number }[],
  dst: { x: number; y: number }[]
): number[] {
  const A: number[][] = [];
  
  for (let i = 0; i < 4; i++) {
    const sx = src[i].x, sy = src[i].y;
    const dx = dst[i].x, dy = dst[i].y;
    
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy, -dx]);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy, -dy]);
  }
  
  const h = solveHomogeneous8x9(A);
  
  if (!h) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  
  const scale = h[8];
  if (Math.abs(scale) < 1e-10) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  
  return h.map(v => v / scale);
}

/**
 * Solve 8x9 homogeneous system using Gaussian elimination
 */
function solveHomogeneous8x9(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  const mat = A.map(row => [...row]);
  
  for (let col = 0; col < Math.min(m, n - 1); col++) {
    let maxVal = Math.abs(mat[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(mat[row][col]) > maxVal) {
        maxVal = Math.abs(mat[row][col]);
        maxRow = row;
      }
    }
    
    if (maxVal < 1e-10) return null;
    
    [mat[col], mat[maxRow]] = [mat[maxRow], mat[col]];
    
    for (let row = col + 1; row < m; row++) {
      const factor = mat[row][col] / mat[col][col];
      for (let j = col; j < n; j++) {
        mat[row][j] -= factor * mat[col][j];
      }
    }
  }
  
  const h = new Array(n).fill(0);
  h[n - 1] = 1;
  
  for (let i = m - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += mat[i][j] * h[j];
    }
    if (Math.abs(mat[i][i]) < 1e-10) return null;
    h[i] = -sum / mat[i][i];
  }
  
  return h;
}

/**
 * Compute measurement error
 */
export function computeMeasurementError(
  knownWidthMm: number,
  knownHeightMm: number,
  pixelToMmRatioX: number,
  pixelToMmRatioY: number,
  measuredWidthPx: number,
  measuredHeightPx: number
): { widthErrorMm: number; heightErrorMm: number; totalErrorMm: number } {
  const measuredWidthMm = measuredWidthPx * pixelToMmRatioX;
  const measuredHeightMm = measuredHeightPx * pixelToMmRatioY;
  
  const widthErrorMm = Math.abs(measuredWidthMm - knownWidthMm);
  const heightErrorMm = Math.abs(measuredHeightMm - knownHeightMm);
  const totalErrorMm = Math.sqrt(widthErrorMm ** 2 + heightErrorMm ** 2);
  
  return { widthErrorMm, heightErrorMm, totalErrorMm };
}
