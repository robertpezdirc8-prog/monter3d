/**
 * Mera3D Pro - OpenCV.js Loader Module
 * 
 * Lazy-loads OpenCV.js WASM module for browser usage.
 * OpenCV.js is loaded on-demand to avoid blocking initial page load.
 * 
 * Size: ~25.4 MB minified, ~4.2 MB gzipped
 * License: Apache 2.0 (OpenCV 4.5.0+)
 * 
 * IMPORTANT: Always call mat.delete() on OpenCV Mat objects to free memory!
 */

// Use 'any' for OpenCV types since the library has complex overloaded constructors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenCV = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenCVMat = any;

// Singleton state
let cvInstance: OpenCV | null = null;
let loadPromise: Promise<OpenCV> | null = null;
let loadError: Error | null = null;

/**
 * Load OpenCV.js module lazily
 * Returns a promise that resolves when OpenCV is ready
 */
export async function loadOpenCV(): Promise<OpenCV> {
  // Return cached instance if already loaded
  if (cvInstance) return cvInstance;
  
  // Return existing promise if already loading
  if (loadPromise) return loadPromise;
  
  // Return error if previous load failed
  if (loadError) throw loadError;
  
  loadPromise = (async () => {
    try {
      // Dynamic import for lazy loading
      const cvModule = await import('@techstark/opencv-js');
      
      let cv: OpenCV;
      const defaultExport = cvModule.default;
      
      if (defaultExport instanceof Promise) {
        cv = await defaultExport;
      } else if (defaultExport && defaultExport.Mat) {
        cv = defaultExport;
      } else {
        // Wait for WASM runtime to initialize
        cv = defaultExport || cvModule;
        if (!cv.Mat) {
          await new Promise<void>((resolve) => {
            cv.onRuntimeInitialized = () => resolve();
          });
        }
      }
      
      cvInstance = cv;
      return cvInstance;
    } catch (err) {
      loadError = err instanceof Error ? err : new Error('Failed to load OpenCV.js');
      loadPromise = null; // Allow retry
      throw loadError;
    }
  })();
  
  return loadPromise;
}

/**
 * Check if OpenCV.js is already loaded
 */
export function isOpenCVLoaded(): boolean {
  return cvInstance !== null;
}

/**
 * Get the OpenCV instance (throws if not loaded)
 */
export function getOpenCV(): OpenCV {
  if (!cvInstance) {
    throw new Error('OpenCV.js not loaded. Call loadOpenCV() first.');
  }
  return cvInstance;
}

/**
 * Helper: Create an OpenCV Mat from an HTMLImageElement
 * Caller MUST call mat.delete() when done!
 */
export function imageToMat(cv: OpenCV, img: HTMLImageElement | HTMLCanvasElement): OpenCVMat {
  const canvas = document.createElement('canvas');
  canvas.width = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  canvas.height = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  const mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
  const data = mat.data as Uint8Array;
  data.set(new Uint8Array(imageData.data));
  return mat;
}

/**
 * Helper: Convert OpenCV Mat to ImageData
 */
export function matToImageData(cv: OpenCV, mat: OpenCVMat): ImageData {
  const channels = mat.channels();
  let imageData: ImageData;
  
  if (channels === 4) {
    imageData = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
  } else if (channels === 3) {
    // RGB to RGBA
    const rgba = new Uint8ClampedArray(mat.rows * mat.cols * 4);
    const rgb = mat.data;
    for (let i = 0; i < mat.rows * mat.cols; i++) {
      rgba[i * 4] = rgb[i * 3];
      rgba[i * 4 + 1] = rgb[i * 3 + 1];
      rgba[i * 4 + 2] = rgb[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
    imageData = new ImageData(rgba, mat.cols, mat.rows);
  } else {
    // Grayscale to RGBA
    const rgba = new Uint8ClampedArray(mat.rows * mat.cols * 4);
    const gray = mat.data;
    for (let i = 0; i < mat.rows * mat.cols; i++) {
      rgba[i * 4] = gray[i];
      rgba[i * 4 + 1] = gray[i];
      rgba[i * 4 + 2] = gray[i];
      rgba[i * 4 + 3] = 255;
    }
    imageData = new ImageData(rgba, mat.cols, mat.rows);
  }
  
  return imageData;
}

/**
 * Safe wrapper: ensures Mat is deleted after callback
 */
export function withMat<T>(factory: () => OpenCVMat, callback: (mat: OpenCVMat) => T): T {
  const mat = factory();
  try {
    return callback(mat);
  } finally {
    mat.delete();
  }
}

/**
 * Safe wrapper for multiple Mats
 */
export function withMats<T>(mats: OpenCVMat[], callback: () => T): T {
  try {
    return callback();
  } finally {
    for (const mat of mats) {
      if (mat && typeof mat.delete === 'function') {
        mat.delete();
      }
    }
  }
}
