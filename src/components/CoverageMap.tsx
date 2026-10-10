import { useMemo } from 'react';
import type { Photo } from '../types';

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
}

export function CoverageMapView({ photos, gridSize = 6 }: CoverageMapProps) {
  const cells = useMemo(() => {
    const grid: CoverageCell[][] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        grid[y][x] = { x, y, covered: false, featureCount: 0, status: 'missing' };
      }
    }

    // Simulate coverage based on photo count and quality
    const acceptedPhotos = photos.filter(p => p.status === 'analyzed');
    const totalCoverage = Math.min(acceptedPhotos.length * 15, 100);
    
    // Distribute coverage across grid
    const cellsToCover = Math.floor((totalCoverage / 100) * gridSize * gridSize);
    let covered = 0;
    
    for (let y = 0; y < gridSize && covered < cellsToCover; y++) {
      for (let x = 0; x < gridSize && covered < cellsToCover; x++) {
        // Spiral pattern from center
        const cx = gridSize / 2;
        const cy = gridSize / 2;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist < (covered / cellsToCover) * gridSize) {
          grid[y][x].covered = true;
          grid[y][x].featureCount = Math.floor(Math.random() * 20) + 5;
          grid[y][x].status = grid[y][x].featureCount > 10 ? 'covered' : 'partial';
          covered++;
        }
      }
    }

    // Mark rejected photo areas
    photos.filter(p => p.status === 'rejected').forEach((_, i) => {
      const rx = Math.floor(Math.random() * gridSize);
      const ry = Math.floor(Math.random() * gridSize);
      if (grid[ry] && grid[ry][rx]) {
        grid[ry][rx].status = 'rejected';
      }
    });

    return grid.flat();
  }, [photos, gridSize]);

  const coveredCount = cells.filter(c => c.status === 'covered').length;
  const partialCount = cells.filter(c => c.status === 'partial').length;
  const missingCount = cells.filter(c => c.status === 'missing').length;
  const rejectedCount = cells.filter(c => c.status === 'rejected').length;
  const coveragePercent = ((coveredCount + partialCount * 0.5) / cells.length * 100).toFixed(0);

  // Find next best position
  const nextPosition = useMemo(() => {
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
  }, [cells]);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">🗺️ Zemljevid pokritosti</h3>
        <span className="text-sm font-bold text-emerald-400">{coveragePercent}%</span>
      </div>

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
            title={`Celica (${cell.x}, ${cell.y}): ${cell.featureCount} značilnic`}
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
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-700" /> Zavrnjeno ({rejectedCount})
        </span>
      </div>

      {/* Next position recommendation */}
      {nextPosition && (
        <div className="bg-blue-900/20 border border-blue-800 rounded p-3">
          <p className="text-xs text-blue-300 font-medium">📍 Priporočen naslednji položaj</p>
          <p className="text-xs text-blue-200 mt-1">
            Premaknite kamero proti območju ({nextPosition.x + 1}, {nextPosition.y + 1}) — 
            ta del objekta še ni dovolj pokrit.
          </p>
        </div>
      )}

      {/* Coverage guidance */}
      <div className="mt-3 text-xs text-slate-400">
        {parseInt(coveragePercent) < 50 && (
          <p className="text-amber-400">⚠ Pokritost je nizka. Nadaljujte z zajemanjem fotografij.</p>
        )}
        {parseInt(coveragePercent) >= 50 && parseInt(coveragePercent) < 80 && (
          <p className="text-emerald-400">✓ Dobra pokritost. Lahko nadaljujete z meritvami.</p>
        )}
        {parseInt(coveragePercent) >= 80 && (
          <p className="text-emerald-400">✓ Odlična pokritost! Pripravljen za rekonstrukcijo.</p>
        )}
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
  coverage: number;
  trackingStable: boolean;
}

export function CameraGuide({ quality, coverage, trackingStable }: CameraGuideProps) {
  const messages: string[] = [];

  if (!quality) {
    messages.push('📷 Pripravite kamero in začnite zajem.');
  } else {
    if (quality.sharpness < 0.4) messages.push('⚡ Premikaj se počasneje — slika je zamegljena.');
    if (quality.brightness < 0.3) messages.push('💡 Premalo svetlobe — poiščite boljšo pozicijo.');
    if (quality.brightness > 0.8) messages.push('☀️ Preveč svetlobe — izogibajte se direktnemu soncu.');
    if (quality.glareDetected) messages.push('🔆 Zaznano bleščanje — spremenite kot.');
    if (!trackingStable) messages.push('🔄 Sledenje je nestabilno — upočasnite premik.');
    if (coverage < 30) messages.push('📸 Naredi vmesni posnetek — pokritost je nizka.');
    if (quality.overallScore > 0.7 && trackingStable) messages.push('✅ Kakovost je dobra — nadaljujte.');
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
