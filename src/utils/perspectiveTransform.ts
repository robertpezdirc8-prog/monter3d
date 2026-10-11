/**
 * Mera3D Pro - Perspective Transform Module
 * 
 * Uses OpenCV.js for perspective warping of fence areas on photos.
 * User marks 4 corners of a planar surface, and this module creates
 * a perspective-aligned preview of that area.
 * 
 * ⚠️ LIMITATIONS:
 * - 2D perspective alignment does NOT reconstruct depth
 * - No photorealistic occlusion handling
 * - Accuracy depends on correct corner marking
 * - For true 3D reconstruction, use COLMAP (separate process)
 */

import { loadOpenCV, imageToMat, matToImageData, type OpenCV, type OpenCVMat } from './opencvLoader';

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
  /** Estimated real-world width in mm (if scale is known) */
  estimatedWidthMm?: number;
  /** Estimated real-world height in mm (if scale is known) */
  estimatedHeightMm?: number;
}

/**
 * Compute perspective transform from 4 source corners to a rectangular output.
 * 
 * @param sourceCorners - 4 corners marked by user on the photo
 * @param outputWidth - Desired output width in pixels
 * @param outputHeight - Desired output height in pixels
 * @returns 3x3 transform matrix as flat array [9 elements]
 */
export function computePerspectiveMatrix(
  sourceCorners: PerspectiveCorners,
  outputWidth: number,
  outputHeight: number
): number[] {
  // Destination corners (rectangle)
  const dst = [
    { x: 0, y: 0 },                          // top-left
    { x: outputWidth - 1, y: 0 },            // top-right
    { x: outputWidth - 1, y: outputHeight - 1 }, // bottom-right
    { x: 0, y: outputHeight - 1 }            // bottom-left
  ];
  
  const src = [
    sourceCorners.topLeft,
    sourceCorners.topRight,
    sourceCorners.bottomRight,
    sourceCorners.bottomLeft
  ];
  
  // Solve the 8-parameter perspective transform using DLT
  // This is a direct linear transformation (DLT) algorithm
  return solvePerspectiveDLT(src, dst);
}

/**
 * DLT algorithm for perspective transform estimation
 * Solves the system of 8 equations for 8 unknowns
 */
function solvePerspectiveDLT(
  src: { x: number; y: number }[],
  dst: { x: number; y: number }[]
): number[] {
  // Build the 8x9 matrix A for the DLT system Ah = 0
  // Each point correspondence gives 2 equations
  const A: number[][] = [];
  
  for (let i = 0; i < 4; i++) {
    const sx = src[i].x, sy = src[i].y;
    const dx = dst[i].x, dy = dst[i].y;
    
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy, -dx]);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy, -dy]);
  }
  
  // Solve using SVD (simplified - use the last column of V)
  // For a well-conditioned system with 4 points, this gives exact solution
  const h = solveHomogeneous8x9(A);
  
  if (!h) {
    // Fallback to identity
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  
  // Normalize so h[8] = 1
  const scale = h[8];
  if (Math.abs(scale) < 1e-10) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }
  
  return h.map(v => v / scale);
}

/**
 * Solve 8x9 homogeneous system using Gaussian elimination with pivoting
 */
function solveHomogeneous8x9(A: number[][]): number[] | null {
  const m = A.length;  // 8
  const n = A[0].length; // 9
  
  // Create augmented matrix copy
  const mat = A.map(row => [...row]);
  
  // Forward elimination with partial pivoting
  for (let col = 0; col < Math.min(m, n - 1); col++) {
    // Find pivot
    let maxVal = Math.abs(mat[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(mat[row][col]) > maxVal) {
        maxVal = Math.abs(mat[row][col]);
        maxRow = row;
      }
    }
    
    if (maxVal < 1e-10) return null; // Singular
    
    // Swap rows
    [mat[col], mat[maxRow]] = [mat[maxRow], mat[col]];
    
    // Eliminate below
    for (let row = col + 1; row < m; row++) {
      const factor = mat[row][col] / mat[col][col];
      for (let j = col; j < n; j++) {
        mat[row][j] -= factor * mat[col][j];
      }
    }
  }
  
  // Back substitution - set last variable to 1 and solve
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
 * Apply perspective warp to an image using OpenCV.js
 * 
 * @param imageSource - HTMLImageElement or data URL
 * @param corners - 4 corners of the area to warp
 * @param outputWidth - Output width in pixels (default: auto from aspect ratio)
 * @param outputHeight - Output height in pixels (default: auto from aspect ratio)
 */
export async function warpPerspective(
  imageSource: HTMLImageElement | string,
  corners: PerspectiveCorners,
  outputWidth?: number,
  outputHeight?: number
): Promise<PerspectiveResult> {
  const cv = await loadOpenCV();
  
  // Load image
  let img: HTMLImageElement;
  if (typeof imageSource === 'string') {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageSource;
    });
  } else {
    img = imageSource;
  }
  
  // Calculate output dimensions if not specified
  if (!outputWidth || !outputHeight) {
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
    
    const avgWidth = (widthTop + widthBottom) / 2;
    const avgHeight = (heightLeft + heightRight) / 2;
    
    outputWidth = outputWidth || Math.round(avgWidth);
    outputHeight = outputHeight || Math.round(avgHeight);
  }
  
  // Create OpenCV Mat from image
  const srcMat = imageToMat(cv, img);
  const dstMat = new cv.Mat(outputHeight, outputWidth, cv.CV_8UC4);
  
  try {
    // Create source points matrix
    const srcPoints = new cv.Mat(4, 1, cv.CV_32FC2);
    srcPoints.data32F[0] = corners.topLeft.x;
    srcPoints.data32F[1] = corners.topLeft.y;
    srcPoints.data32F[2] = corners.topRight.x;
    srcPoints.data32F[3] = corners.topRight.y;
    srcPoints.data32F[4] = corners.bottomRight.x;
    srcPoints.data32F[5] = corners.bottomRight.y;
    srcPoints.data32F[6] = corners.bottomLeft.x;
    srcPoints.data32F[7] = corners.bottomLeft.y;
    
    // Create destination points matrix (rectangle)
    const dstPoints = new cv.Mat(4, 1, cv.CV_32FC2);
    dstPoints.data32F[0] = 0;
    dstPoints.data32F[1] = 0;
    dstPoints.data32F[2] = outputWidth - 1;
    dstPoints.data32F[3] = 0;
    dstPoints.data32F[4] = outputWidth - 1;
    dstPoints.data32F[5] = outputHeight - 1;
    dstPoints.data32F[6] = 0;
    dstPoints.data32F[7] = outputHeight - 1;
    
    // Compute perspective transform matrix
    const transformMatrix = cv.getPerspectiveTransform(srcPoints, dstPoints);
    
    // Apply perspective warp
    cv.warpPerspective(srcMat, dstMat, transformMatrix, 
      new cv.Size(outputWidth, outputHeight), 
      cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());
    
    // Extract transform matrix values
    const matrixValues: number[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        matrixValues.push(transformMatrix.doubleAt(i, j));
      }
    }
    
    // Convert result to ImageData
    const imageData = matToImageData(cv, dstMat);
    
    // Clean up
    srcPoints.delete();
    dstPoints.delete();
    transformMatrix.delete();
    
    return {
      imageData,
      width: outputWidth,
      height: outputHeight,
      transformMatrix: matrixValues
    };
  } finally {
    srcMat.delete();
    dstMat.delete();
  }
}

/**
 * Compute measurement error for perspective transform test case.
 * Given known real-world dimensions and pixel coordinates,
 * compute the error in millimeters.
 * 
 * @param knownWidthMm - Known real width in mm
 * @param knownHeightMm - Known real height in mm
 * @param pixelToMmRatioX - Horizontal pixel to mm ratio
 * @param pixelToMmRatioY - Vertical pixel to mm ratio
 * @param measuredWidthPx - Measured width in warped pixels
 * @param measuredHeightPx - Measured height in warped pixels
 * @returns Error in mm for width and height
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
