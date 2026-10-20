/**
 * OverlayReferenceInput.tsx — vnos referenčne dolžine (kalibracija fotografije).
 * Izluščeno iz `MeasurementOverlay.tsx`.
 */
interface OverlayReferenceInputProps {
  referencePointCount: number;
  referenceDistance: string;
  onReferenceDistanceChange: (value: string) => void;
  onConfirm: () => void;
}

export function OverlayReferenceInput({
  referencePointCount, referenceDistance, onReferenceDistanceChange, onConfirm,
}: OverlayReferenceInputProps) {
  return (
    <>
      {(
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <p className="text-amber-200 text-sm mb-2">
            {referencePointCount === 0 && 'Kliknite na začetek referenčne mere na fotografiji'}
            {referencePointCount === 1 && 'Kliknite na konec referenčne mere'}
            {referencePointCount === 2 && 'Vnesite dejansko dolžino reference v metrih'}
          </p>
          {referencePointCount === 2 && (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.001"
                min="0.01"
                value={referenceDistance}
                onChange={(e) => onReferenceDistanceChange(e.target.value)}
                placeholder="npr. 1.80"
                className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white text-sm w-32"
              />
              <span className="text-amber-200 text-sm">m</span>
              <button
                onClick={onConfirm}
                disabled={!referenceDistance || parseFloat(referenceDistance) <= 0}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                ✓ Potrdi
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
