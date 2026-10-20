import { useMemo } from 'react';
import type {Photo } from '../types';

interface CoverageMapProps {
  photos: Photo[];
  gridSize: number;
}

interface CoverageCell {
  x: number;
  y: number;
  covered: boolean;
  featureCount: number;
  status: 'covered' | 'partial' | 'missing' | 'rejected';
  photoIds: string[];
}

export function CoverageMapView({ photos, gridSize = 6 }: CoverageMapProps) {
  const cells = useMemo(() => {
    const grid: CoverageCell[][] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        grid[y][x] = { x, y, covered: false, featureCount: 0, status: 'missing', photoIds: [] };
      }
    }

    // Check if we have actual feature data
    const photosWithFeatures = photos.filter(p => p.features && p.features.length > 0);
    
    if (photosWithFeatures.length === 0) {
      // No feature data available - cannot calculate real coverage
      return grid.flat();
    }

    // Calculate actual coverage based on detected features
    // Assume image is divided into gridSize x gridSize cells
    // Map feature positions to grid cells
    const cellWidth = 1.0 / gridSize;
    const cellHeight = 1.0 / gridSize;

    for (const photo of photosWithFeatures) {
      if (!photo.features) continue;

      // Use actual image dimensions for proper normalization
      const imgWidth = photo.width || 1000;
      const imgHeight = photo.height || 1000;

      for (const feature of photo.features) {
        // Normalize feature position to 0-1 range using actual image dimensions
        const normalizedX = feature.x / imgWidth;
        const normalizedY = feature.y / imgHeight;
        
        // Clamp to 0-1
        const nx = Math.max(0, Math.min(1, normalizedX));
        const ny = Math.max(0, Math.min(1, normalizedY));
        
        // Find grid cell
        const cellX = Math.min(Math.floor(nx / cellWidth), gridSize - 1);
        const cellY = Math.min(Math.floor(ny / cellHeight), gridSize - 1);
        
        if (grid[cellY] && grid[cellY][cellX]) {
          grid[cellY][cellX].featureCount++;
          if (!grid[cellY][cellX].photoIds.includes(photo.id)) {
            grid[cellY][cellX].photoIds.push(photo.id);
          }
        }
      }
    }

    // Determine coverage status based on feature count
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = grid[y][x];
        if (cell.featureCount >= 5) {
          cell.status = 'covered';
          cell.covered = true;
        } else if (cell.featureCount > 0) {
          cell.status = 'partial';
          cell.covered = false;
        } else {
          cell.status = 'missing';
          cell.covered = false;
        }
      }
    }

    // Mark rejected photos
    const rejectedPhotos = photos.filter(p => p.status === 'rejected');
    if (rejectedPhotos.length > 0) {
      // Note: We cannot determine which cells are affected without feature data
      // Just show a warning instead of marking random cells
    }

    return grid.flat();
  }, [photos, gridSize]);

  const coveredCount = cells.filter(c => c.status === 'covered').length;
  const partialCount = cells.filter(c => c.status === 'partial').length;
  const missingCount = cells.filter(c => c.status === 'missing').length;
  const rejectedCount = cells.filter(c => c.status === 'rejected').length;
  
  const hasFeatureData = cells.some(c => c.featureCount > 0);
  const coveragePercent = hasFeatureData 
    ? ((coveredCount + partialCount * 0.5) / cells.length * 100).toFixed(0)
    : null;

  // Find next best position based on actual data
  const nextPosition = useMemo(() => {
    if (!hasFeatureData) return null;
    
    // Find the cell with lowest coverage
    let minFeatures = Infinity;
    let bestCell: CoverageCell | null = null;
    for (const cell of cells) {
      if (!cell.covered && cell.status !== 'rejected' && cell.featureCount < minFeatures) {
        minFeatures = cell.featureCount;
        bestCell = cell;
      }
    }
    return bestCell;
  }, [cells, hasFeatureData]);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">🗺️ Zemljevid pokritosti</h3>
        {coveragePercent !== null ? (
          <span className="text-sm font-bold text-emerald-400">{coveragePercent}%</span>
        ) : (
          <span className="text-xs text-amber-400">Ni podatkov</span>
        )}
      </div>

      {!hasFeatureData && (
        <div className="bg-amber-900/20 border border-amber-800 rounded p-3 mb-3">
          <p className="text-xs text-amber-300">
            ⚠ Pokritosti še ni mogoče izračunati. Fotografije morajo biti analizirane za zaznavo značilk.
          </p>
          <p className="text-xs text-amber-200 mt-1">
            Analizirajte vsaj eno fotografijo v zavihku "Zajem".
          </p>
        </div>
      )}

      {hasFeatureData && (
        <>
          {/* Grid visualization */}
          <div className="grid gap-0.5 mb-3" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {cells.map((cell, i) => (
              <div
                key={i}
                className={`aspect-square rounded-sm flex items-center justify-center text-[9px] font-bold transition-colors ${
                  cell.status === 'covered' ? 'bg-emerald-600 text-white' :
                  cell.status === 'partial' ? 'bg-amber-600 text-white' :
                  cell.status === 'rejected' ? 'bg-red-700 text-white' :
                  'bg-slate-700 text-slate-500'
                }`}
                title={`Celica (${cell.x}, ${cell.y}): ${cell.featureCount} značilk iz ${cell.photoIds.length} fotografij`}
              >
                {cell.featureCount > 0 ? cell.featureCount : ''}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-3 text-xs mb-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-emerald-600" /> Pokrito ({coveredCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-amber-600" /> Delno ({partialCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-slate-700" /> Manjkajoče ({missingCount})
            </span>
            {rejectedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-red-700" /> Zavrnjeno ({rejectedCount})
              </span>
            )}
          </div>

          {/* Next position recommendation */}
          {nextPosition && (
            <div className="bg-blue-900/20 border border-blue-800 rounded p-3">
              <p className="text-xs text-blue-300 font-medium">📍 Priporočen naslednji položaj</p>
              <p className="text-xs text-blue-200 mt-1">
                Premaknite kamero proti območju ({nextPosition.x + 1}, {nextPosition.y + 1}) — 
                ta del objekta ima {nextPosition.featureCount === 0 ? 'nič' : `samo ${nextPosition.featureCount}`} značilk.
              </p>
            </div>
          )}

          {/* Coverage guidance */}
          <div className="mt-3 text-xs text-slate-400">
            {parseInt(coveragePercent!) < 50 && (
              <p className="text-amber-400">⚠ Pokritost je nizka. Nadaljujte z zajemanjem fotografij.</p>
            )}
            {parseInt(coveragePercent!) >= 50 && parseInt(coveragePercent!) < 80 && (
              <p className="text-emerald-400">✓ Dobra pokritost. Lahko nadaljujete z meritvami.</p>
            )}
            {parseInt(coveragePercent!) >= 80 && (
              <p className="text-emerald-400">✓ Odlična pokritost! Pripravljen za rekonstrukcijo.</p>
            )}
          </div>
        </>
      )}

      {/* Statistics */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400">Fotografije z značilkami:</span>{' '}
            <span className="text-slate-200">{photos.filter(p => p.features && p.features.length > 0).length}</span>
          </div>
          <div>
            <span className="text-slate-400">Skupaj značilk:</span>{' '}
            <span className="text-slate-200">
              {photos.reduce((sum, p) => sum + (p.features?.length || 0), 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Camera guidance overlay
interface CameraGuideProps {
  quality: {
    sharpness: number;
    brightness: number;
    glareDetected: boolean;
    overallScore: number;
  } | null;
  photoCount: number;
  imageStable: boolean;
  featureCount?: number;
}

export function CameraGuide({ quality, photoCount, imageStable, featureCount }: CameraGuideProps) {
  const messages: string[] = [];

  if (!quality) {
    messages.push('📷 Pripravite kamero in začnite zajem.');
  } else {
    if (quality.sharpness < 0.4) messages.push('⚡ Slika je zamegljena — poskusite ponovno.');
    if (quality.brightness < 0.3) messages.push('💡 Premalo svetlobe — poiščite boljšo pozicijo.');
    if (quality.brightness > 0.8) messages.push('☀️ Preveč svetlobe — izogibajte se direktnemu soncu.');
    if (quality.glareDetected) messages.push('🔆 Zaznano bleščanje — spremenite kot.');
    if (!imageStable) messages.push('📸 Slika ni dovolj ostra — poskusite ponovno.');
    if (featureCount !== undefined && featureCount < 10) {
      messages.push('📸 Premalo značilk — poiščite območje z več teksture.');
    }
    if (photoCount < 2) messages.push('📸 Zajemite vsaj 2 fotografiji za boljšo pokritost.');
    if (quality.overallScore > 0.7 && imageStable) messages.push('✅ Kakovost je dobra — nadaljujte.');
  }

  return (
    <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700">
      <div className="space-y-1">
        {messages.map((msg, i) => (
          <p key={i} className="text-xs text-slate-200">{msg}</p>
        ))}
      </div>
      
      {quality && (
        <div className="mt-2 flex gap-2">
          <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                quality.overallScore > 0.7 ? 'bg-emerald-500' :
                quality.overallScore > 0.4 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${quality.overallScore * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{(quality.overallScore * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
