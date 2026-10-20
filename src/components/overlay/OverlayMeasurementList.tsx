/**
 * OverlayMeasurementList.tsx — seznam izmerjenih odsekov s skupno dolžino in opozorili.
 * Izluščeno iz `MeasurementOverlay.tsx`.
 */
import type { MeasurementSegment } from '../MeasurementOverlay';

interface OverlayMeasurementListProps {
  segments: MeasurementSegment[];
  totalLength: number;
  warnings: string[];
}

export function OverlayMeasurementList({ segments, totalLength, warnings }: OverlayMeasurementListProps) {
  return (
    <>
      {segments.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Izmerjeni odseki ({segments.length})
          </h3>
          <div className="space-y-2">
            {segments.map((seg, i) => (
              <div key={seg.id} className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">#{i + 1}</span>
                  <span className="text-sm text-white font-mono">
                    {seg.realDistance !== null 
                      ? `${seg.realDistance.toFixed(3)} m`
                      : '—'
                    }
                  </span>
                  <span className="text-xs text-slate-400">
                    ({seg.pixelDistance.toFixed(0)} px)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    seg.reliability >= 0.8 ? 'bg-emerald-900/60 text-emerald-300' :
                    seg.reliability >= 0.5 ? 'bg-amber-900/60 text-amber-300' :
                    'bg-red-900/60 text-red-300'
                  }`}>
                    {(seg.reliability * 100).toFixed(0)}% zanesljivo
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total length */}
          {segments.every(s => s.realDistance !== null) && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Skupna dolžina:</span>
                <span className="text-lg font-bold text-emerald-400">
                  {totalLength.toFixed(3)} m
                </span>
              </div>
            </div>
          )}

          {/* Warnings */}
          {segments.some(s => s.warnings.length > 0) && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <p className="text-xs text-amber-400 mb-1">⚠ Opozorila:</p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-300">• {w}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
