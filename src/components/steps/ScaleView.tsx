/**
 * ScaleView.tsx — korak »Merilo«: kalibracija fotografije z referenčno dolžino.
 */
import type { Photo } from '../../types';
export function ScaleView({ selectedPhoto, canvasRef, measuringMode, onToggleMeasuring, measurePoints, referenceLength, onSetReferenceLength, onSetScale, pixelToMeter, onCanvasClick, onAnalyze }: {
  selectedPhoto: Photo | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  measuringMode: boolean;
  onToggleMeasuring: () => void;
  measurePoints: {x: number; y: number}[];
  referenceLength: string;
  onSetReferenceLength: (v: string) => void;
  onSetScale: () => void;
  pixelToMeter: number | null;
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onAnalyze: (p: Photo) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">📏 Kalibracija merila</h2>
      
      {!selectedPhoto ? (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          <p>Izberite fotografijo za kalibracijo merila.</p>
          <p className="text-xs mt-2">Fotografija mora vsebovati znan referenčni objekt.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-300 mb-2">Postopek kalibracije</h3>
            <ol className="text-xs text-blue-200 space-y-1 list-decimal list-inside">
              <li>Vključite način merjenja</li>
              <li>Kliknite začetno in končno točko znanega objekta</li>
              <li>Vnesite dejansko dolžino v metrih</li>
              <li>Potrdite kalibracijo</li>
            </ol>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onToggleMeasuring}
              className={`px-4 py-2 rounded font-medium text-sm ${
                measuringMode ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {measuringMode ? '🎯 Merjenje aktivno' : '📏 Vključi merjenje'}
            </button>
            {pixelToMeter && (
              <span className="px-3 py-2 bg-emerald-900/30 text-emerald-300 rounded text-sm">
                Merilo: {pixelToMeter.toFixed(5)} m/px ✓
              </span>
            )}
          </div>

          <canvas
            ref={canvasRef}
            onClick={onCanvasClick}
            className={`w-full rounded border-2 max-h-96 object-contain ${
              measuringMode ? 'border-emerald-500 cursor-crosshair' : 'border-slate-700'
            }`}
          />

          {measurePoints.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-2">
                Točke: {measurePoints.length}/2
                {measurePoints.length === 2 && ' ✓'}
              </p>
              {measurePoints.length === 2 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={referenceLength}
                    onChange={e => onSetReferenceLength(e.target.value)}
                    placeholder="Dolžina v metrih"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  />
                  <span className="text-slate-400 text-sm">m</span>
                  <button
                    onClick={onSetScale}
                    disabled={!referenceLength}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 px-4 py-2 rounded text-sm text-white font-medium"
                  >
                    Potrdi merilo
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Vir merila</h3>
            <div className="space-y-1 text-xs">
              <ScaleRow label="Demo merilo" status={pixelToMeter ? 'inactive' : 'available'} />
              <ScaleRow label="Ročno vnesena referenca" status={pixelToMeter ? 'active' : 'available'} />
              <ScaleRow label="Kalibracijski marker" status="unavailable" />
              <ScaleRow label="Preverjeno merilo modela" status="unavailable" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ScaleRow({ label, status }: { label: string; status: 'active' | 'available' | 'inactive' | 'unavailable' }) {
  const colors = {
    active: 'text-emerald-400 bg-emerald-900/20',
    available: 'text-slate-300 bg-slate-700/50',
    inactive: 'text-slate-500 bg-slate-800/50',
    unavailable: 'text-slate-600 bg-slate-800/30'
  };
  const labels = {
    active: '✓ Aktivno',
    available: 'Na voljo',
    inactive: 'Ni aktivno',
    unavailable: 'Ni na voljo'
  };
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-300">{label}</span>
      <span className={`px-2 py-0.5 rounded text-xs ${colors[status]}`}>{labels[status]}</span>
    </div>
  );
}
