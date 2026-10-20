/**
 * OverlayModeControls.tsx — preklop načina dela (referenca / merjenje / počisti).
 * Izluščeno iz `MeasurementOverlay.tsx`.
 */
export type OverlayMode = 'idle' | 'reference' | 'measure';

interface OverlayModeControlsProps {
  mode: OverlayMode;
  hasScale: boolean;
  onStartReference: () => void;
  onStartMeasure: () => void;
  onClear: () => void;
}

export function OverlayModeControls({
  mode, hasScale, onStartReference, onStartMeasure, onClear,
}: OverlayModeControlsProps) {
  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onStartReference}
          className={`px-3 py-2 rounded text-sm font-medium ${
            mode === 'reference' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          📏 Nastavi referenco
        </button>
        <button
          onClick={onStartMeasure}
          disabled={!hasScale}
          className={`px-3 py-2 rounded text-sm font-medium ${
            mode === 'measure' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          📐 Meri
        </button>
        <button
          onClick={onClear}
          className="px-3 py-2 rounded text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600"
        >
          🗑 Počisti mere
        </button>
      </div>
    </>
  );
}
