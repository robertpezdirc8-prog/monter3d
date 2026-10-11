/**
 * Mera3D Pro - Photo Matching Service
 * 
 * Computes feature matching between consecutive photos.
 * Uses existing CV functions from cv.ts.
 */

import type { Photo } from '../types';
import type { FeatureDescriptor, MatchResult } from './cv';
import { 
  harrisCornerDetection, 
  computeDescriptors, 
  bruteForceMatch, 
  crossCheckMatch,
  ransacHomography,
  toGrayscale
} from './cv';

import type { Point2D } from './cv';

export interface PhotoPairMatching {
  photo1Id: string;
  photo2Id: string;
  features1: number;
  features2: number;
  matches: MatchResult[];
  inliers: number;
  homography: number[] | null;
  reprojError: number | null;
  status: 'good' | 'poor' | 'failed';
  message: string;
  // Data for visualization
  features1Points?: Point2D[];
  features2Points?: Point2D[];
  inlierMatches?: MatchResult[];
}

/**
 * Detect features and compute descriptors for a photo
 */
export async function detectFeatures(photo: Photo): Promise<{
  features: FeatureDescriptor[];
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 640;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const gray = toGrayscale(imageData);
      
      // Detect features
      const features = harrisCornerDetection(gray, canvas.width, canvas.height);
      
      // Compute descriptors (modifies features in place)
      computeDescriptors(gray, canvas.width, canvas.height, features);
      
      resolve({ features });
    };
    img.src = photo.dataUrl;
  });
}

/**
 * Match features between two photos
 */
export async function matchPhotoPair(
  photo1: Photo,
  photo2: Photo
): Promise<PhotoPairMatching> {
  // Detect features for both photos
  const [data1, data2] = await Promise.all([
    detectFeatures(photo1),
    detectFeatures(photo2)
  ]);

  const { features: features1 } = data1;
  const { features: features2 } = data2;

  // If not enough features, return failed
  if (features1.length < 10 || features2.length < 10) {
    return {
      photo1Id: photo1.id,
      photo2Id: photo2.id,
      features1: features1.length,
      features2: features2.length,
      matches: [],
      inliers: 0,
      homography: null,
      reprojError: null,
      status: 'failed',
      message: 'Premalo značilnic za ujemanje. Fotografiraj z več teksture.'
    };
  }

  // Find matches
  const rawMatches = bruteForceMatch(features1, features2);
  
  // Apply cross-check
  const crossChecked = crossCheckMatch(features1, features2);
  
  // Use cross-checked matches as good matches
  const goodMatches = crossChecked;

  if (goodMatches.length < 4) {
    return {
      photo1Id: photo1.id,
      photo2Id: photo2.id,
      features1: features1.length,
      features2: features2.length,
      matches: goodMatches,
      inliers: 0,
      homography: null,
      reprojError: null,
      status: 'poor',
      message: `Samo ${goodMatches.length} ujemanj. Potrebno vsaj 4 za zanesljivo povezavo.`
    };
  }

  // Extract matched points for RANSAC
  const srcPoints = goodMatches.map(m => features1[m.queryIdx].point);
  const dstPoints = goodMatches.map(m => features2[m.trainIdx].point);

  // Estimate homography with RANSAC
  const ransacResult = ransacHomography(srcPoints, dstPoints, 100, 3.0);

  if (!ransacResult) {
    return {
      photo1Id: photo1.id,
      photo2Id: photo2.id,
      features1: features1.length,
      features2: features2.length,
      matches: goodMatches,
      inliers: 0,
      homography: null,
      reprojError: null,
      status: 'poor',
      message: 'RANSAC ni našel konsistentne geometrije. Fotografiraj znova z več prekrivanja.'
    };
  }

  const { matrix: homography, inlierCount, inliers, rmse } = ransacResult;

  // Extract inlier matches for visualization
  const inlierMatches = goodMatches.filter((_, idx) => inliers[idx]);

  // Determine status based on inlier ratio and reprojection error
  const inlierRatio = inlierCount / goodMatches.length;
  
  let status: 'good' | 'poor' | 'failed';
  let message: string;

  if (inlierCount >= 8 && inlierRatio > 0.5 && rmse < 3) {
    status = 'good';
    message = `Dobro ujemanje: ${inlierCount} konsistentnih točk z napako ${rmse.toFixed(2)} px.`;
  } else if (inlierCount >= 4 && inlierRatio > 0.3) {
    status = 'poor';
    message = `Šibko ujemanje: samo ${inlierCount} konsistentnih točk. Priporočamo več prekrivanja.`;
  } else {
    status = 'failed';
    message = `Nezadostno ujemanje: ${inlierCount} konsistentnih točk. Fotografiraj znova.`;
  }

  return {
    photo1Id: photo1.id,
    photo2Id: photo2.id,
    features1: features1.length,
    features2: features2.length,
    matches: goodMatches,
    inliers: inlierCount,
    homography,
    reprojError: rmse,
    status,
    message,
    // Data for visualization
    features1Points: features1.map(f => f.point),
    features2Points: features2.map(f => f.point),
    inlierMatches
  };
}

/**
 * Compute matchings for all consecutive photo pairs
 */
export async function computeAllMatchings(
  photos: Photo[]
): Promise<PhotoPairMatching[]> {
  const matchings: PhotoPairMatching[] = [];

  for (let i = 0; i < photos.length - 1; i++) {
    const matching = await matchPhotoPair(photos[i], photos[i + 1]);
    matchings.push(matching);
  }

  return matchings;
}
