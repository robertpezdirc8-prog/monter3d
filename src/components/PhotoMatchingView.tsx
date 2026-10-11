/**
 * Mera3D Pro - Photo Matching Visualization
 * 
 * Displays feature matching between two photos with connecting lines.
 * Shows match statistics and quality indicators.
 */

import { useMemo } from 'react';
import type { Photo } from '../types';
import type { MatchResult } from '../utils/cv';

interface PhotoPairMatching {
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
}

interface PhotoMatchingViewProps {
  matchings: PhotoPairMatching[];
  onSelectPhoto?: (photo: Photo) => void;
}

export function PhotoMatchingView({ matchings, onSelectPhoto }: PhotoMatchingViewProps) {
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
          onSelectPhoto={onSelectPhoto}
        />
      ))}
    </div>
  );
}

function MatchingCard({ 
  matching, 
  onSelectPhoto 
}: { 
  matching: PhotoPairMatching;
  onSelectPhoto?: (photo: Photo) => void;
}) {
  const { photo1, photo2, features1, features2, matches, inliers, reprojError, status, message } = matching;
  
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
      {/* Photo thumbnails */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => onSelectPhoto?.(photo1)}
          className="flex-shrink-0 w-24 h-24 rounded overflow-hidden border-2 border-slate-600 hover:border-emerald-500 transition-colors"
        >
          <img src={photo1.dataUrl} alt="Foto 1" className="w-full h-full object-cover" />
        </button>
        
        <div className="flex-1 text-center">
          <div className="text-2xl mb-1">→</div>
          <div className="text-xs text-slate-400">
            {matches.length} ujemanj
          </div>
        </div>
        
        <button
          onClick={() => onSelectPhoto?.(photo2)}
          className="flex-shrink-0 w-24 h-24 rounded overflow-hidden border-2 border-slate-600 hover:border-emerald-500 transition-colors"
        >
          <img src={photo2.dataUrl} alt="Foto 2" className="w-full h-full object-cover" />
        </button>
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

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900/50 rounded p-2 text-center">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}
