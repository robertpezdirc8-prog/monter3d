/**
 * Mera3D Pro - Photo Matching Visualization
 * 
 * Displays feature matching between two photos with connecting lines.
 * Shows match statistics and quality indicators.
 */

import { useMemo } from 'react';
import type { Photo } from '../types';
import type { MatchResult, Point2D } from '../utils/cv';

export interface PhotoPairMatching {
  photo1: Photo;
  photo2: Photo;
  features1: number;
  features2: number;
  matches: MatchResult[];
  inliers: number;
  homography: number[] | null;
  reprojError: number | null;
  status: 'good' | 'poor' | 'failed';
  message: string;
  features1Points?: Point2D[];
  features2Points?: Point2D[];
  inlierMatches?: MatchResult[];
}

interface PhotoMatchingViewProps {
  matchings: PhotoPairMatching[];
}

export function PhotoMatchingView({ matchings }: PhotoMatchingViewProps) {
  if (matchings.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 text-center">
        <p className="text-slate-400">Ni podatkov o ujemanjih med fotografijami.</p>
        <p className="text-xs text-slate-500 mt-2">
          Ujemanja se izračunajo samodejno za zaporedne fotografije.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-emerald-400">🔗 Povezovanje fotografij</h3>
      
      {matchings.map((matching, idx) => (
        <MatchingCard
          key={idx}
          matching={matching}
        />
      ))}
    </div>
  );
}

function MatchingCard({ matching }: { matching: PhotoPairMatching }) {
  const { 
    photo1, photo2, features1, features2, matches, inliers, 
    reprojError, status, message,
    features1Points, features2Points, inlierMatches
  } = matching;
  
  const matchRatio = features1 > 0 ? (matches.length / features1) * 100 : 0;
  const inlierRatio = matches.length > 0 ? (inliers / matches.length) * 100 : 0;
  
  const statusColors = {
    good: 'border-emerald-700 bg-emerald-900/20',
    poor: 'border-amber-700 bg-amber-900/20',
    failed: 'border-red-700 bg-red-900/20'
  };
  
  const statusIcons = {
    good: '✅',
    poor: '⚠️',
    failed: '❌'
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${statusColors[status]}`}>
      {/* Visualization with connecting lines */}
      <div className="mb-4">
        <MatchingVisualization
          photo1={photo1}
          photo2={photo2}
          features1Points={features1Points}
          features2Points={features2Points}
          inlierMatches={inlierMatches}
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatBox label="Značilnice 1" value={features1} />
        <StatBox label="Značilnice 2" value={features2} />
        <StatBox label="Ujemanja" value={matches.length} />
        <StatBox label="Inlierji" value={inliers} />
      </div>

      {/* Ratios */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Razmerje ujemanj:</span>
          <span className={`font-mono ${matchRatio > 20 ? 'text-emerald-400' : matchRatio > 10 ? 'text-amber-400' : 'text-red-400'}`}>
            {matchRatio.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Konsistentnost:</span>
          <span className={`font-mono ${inlierRatio > 70 ? 'text-emerald-400' : inlierRatio > 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {inlierRatio.toFixed(1)}%
          </span>
        </div>
        
        {reprojError !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Napaka reprojekcije:</span>
            <span className={`font-mono ${reprojError < 3 ? 'text-emerald-400' : reprojError < 5 ? 'text-amber-400' : 'text-red-400'}`}>
              {reprojError.toFixed(2)} px
            </span>
          </div>
        )}
      </div>

      {/* Status message */}
      <div className="flex items-start gap-2 p-3 bg-slate-900/50 rounded">
        <span className="text-xl">{statusIcons[status]}</span>
        <div className="flex-1">
          <p className="text-sm text-slate-200">{message}</p>
        </div>
      </div>

      {/* Recommendations */}
      {status === 'poor' && (
        <div className="mt-3 p-3 bg-amber-900/30 border border-amber-700 rounded text-xs text-amber-200">
          <strong>Priporočilo:</strong> Fotografiraj znova z več prekrivanja (vsaj 30%).
        </div>
      )}
      
      {status === 'failed' && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded text-xs text-red-200">
          <strong>Priporočilo:</strong> Približaj vogal ograje ali zajemi več teksture.
        </div>
      )}
    </div>
  );
}

function MatchingVisualization({
  photo1,
  photo2,
  features1Points,
  features2Points,
  inlierMatches
}: {
  photo1: Photo;
  photo2: Photo;
  features1Points?: Point2D[];
  features2Points?: Point2D[];
  inlierMatches?: MatchResult[];
}) {
  const canvasRef = useMemo(() => {
    return { current: null as HTMLCanvasElement | null };
  }, []);

  const displayWidth = 600;
  const displayHeight = 200;

  // Draw visualization
  useMemo(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Draw separator line
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(displayWidth / 2, 0);
    ctx.lineTo(displayWidth / 2, displayHeight);
    ctx.stroke();

    // Draw feature points
    if (features1Points && features1Points.length > 0) {
      const scale1 = Math.min((displayWidth / 2) / (photo1.width || 800), displayHeight / (photo1.height || 600));
      
      // Draw all features (dim)
      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      features1Points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * scale1, p.y * scale1, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (features2Points && features2Points.length > 0) {
      const scale2 = Math.min((displayWidth / 2) / (photo2.width || 800), displayHeight / (photo2.height || 600));
      const offsetX = displayWidth / 2;
      
      // Draw all features (dim)
      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      features2Points.forEach(p => {
        ctx.beginPath();
        ctx.arc(offsetX + p.x * scale2, p.y * scale2, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw inlier matches (bright green lines)
    if (inlierMatches && features1Points && features2Points) {
      const scale1 = Math.min((displayWidth / 2) / (photo1.width || 800), displayHeight / (photo1.height || 600));
      const scale2 = Math.min((displayWidth / 2) / (photo2.width || 800), displayHeight / (photo2.height || 600));
      const offsetX = displayWidth / 2;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      
      inlierMatches.forEach(match => {
        const p1 = features1Points[match.queryIdx];
        const p2 = features2Points[match.trainIdx];
        
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * scale1, p1.y * scale1);
          ctx.lineTo(offsetX + p2.x * scale2, p2.y * scale2);
          ctx.stroke();
        }
      });

      // Draw inlier points (bright)
      ctx.fillStyle = '#10b981';
      inlierMatches.forEach(match => {
        const p1 = features1Points[match.queryIdx];
        const p2 = features2Points[match.trainIdx];
        
        if (p1) {
          ctx.beginPath();
          ctx.arc(p1.x * scale1, p1.y * scale1, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p2) {
          ctx.beginPath();
          ctx.arc(offsetX + p2.x * scale2, p2.y * scale2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [canvasRef, photo1, photo2, features1Points, features2Points, inlierMatches, displayWidth, displayHeight]);

  return (
    <div className="bg-slate-900 rounded-lg p-2">
      <canvas
        ref={(el) => { canvasRef.current = el; }}
        width={displayWidth}
        height={displayHeight}
        className="w-full h-auto"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-2">
        <span>Foto 1</span>
        <span className="text-emerald-400">
          {inlierMatches ? `${inlierMatches.length} potrjenih ujemanj` : 'Ni podatkov'}
        </span>
        <span>Foto 2</span>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900/50 rounded p-2 text-center">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
