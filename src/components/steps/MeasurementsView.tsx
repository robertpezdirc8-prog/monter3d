/**
 * MeasurementsView.tsx — korak »Meritve«: merjenje na fotografiji in pregled
 * izmerjenih vrednosti.
 */
import { useState } from 'react';
import type { Measurement, Photo } from '../../types';
import { formatMeasurement } from '../../utils/geometry';
export function MeasurementsView({ measurements, selectedPhoto, canvasRef, measuringMode, onToggleMeasuring, onCanvasClick, pixelToMeter, onAddManualLength, onDeleteMeasurement, onToggleExcluded }: {
  measurements: Measurement[];
  selectedPhoto: Photo | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  measuringMode: boolean;
  onToggleMeasuring: () => void;
  measurePoints: {x: number; y: number}[];
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  pixelToMeter: number | null;
  onAnalyze: (p: Photo) => void;
  /** Ročni vnos dolžine (m) — uporabno, ko dolžina ni izmerjena na fotografiji. */
  onAddManualLength: (value: number) => void;
  /** FAZA 17: brisanje meritve. */
  onDeleteMeasurement: (id: string) => void;
  /** FAZA 17: vklop/izklop meritve v načrtu. */
  onToggleExcluded: (id: string) => void;
}) {
  const [manualLength, setManualLength] = useState('');
  // FAZA 10 (P2): referenčna (kalibracijska) meritev je merilo fotografije,
  // ne meritev objekta — zato je v seznamu ne prikazujemo.
  const objectMeasurements = measurements.filter(
    m => m.isScaleReference !== true && m.source !== 'reference_scale' && m.algorithm !== 'reference_calibration'
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">📐 Meritve</h2>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={onToggleMeasuring}
          className={`px-4 py-2 rounded font-medium text-sm ${
            measuringMode ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          {measuringMode ? '🎯 Merjenje aktivno - kliknite na sliko' : '📏 Novo merjenje'}
        </button>
        {!pixelToMeter && (
          <span className="px-3 py-2 bg-amber-900/30 text-amber-300 rounded text-xs">
            ⚠ Kalibrirajte merilo za metrične vrednosti
          </span>
        )}
      </div>

      {selectedPhoto && (
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          aria-label="Merilno platno – meritve"
          className={`w-full rounded border-2 max-h-80 object-contain mb-4 ${
            measuringMode ? 'border-emerald-500 cursor-crosshair' : 'border-slate-700'
          }`}
        />
      )}

      {/* FAZA 14: ročni vnos dolžine (teren, kjer se ne meri po fotografiji) */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">⌨️ Ročna dolžina (brez fotografije)</h3>
        <p className="text-xs text-slate-400 mb-3">
          Vpiši dolžino v metrih (npr. dolžina ograje po meritvi z metrom). Vrednost se
          upošteva v načrtu in predračunu enako kot meritev na fotografiji.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={manualLength}
            onChange={e => setManualLength(e.target.value)}
            placeholder="npr. 6.50"
            aria-label="Ročna dolžina v metrih"
            className="w-32 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
          />
          <span className="text-slate-400 text-sm">m</span>
          <button
            onClick={() => {
              const v = parseFloat(manualLength);
              if (!isFinite(v) || v <= 0) return;
              onAddManualLength(v);
              setManualLength('');
            }}
            disabled={!manualLength}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 text-white text-sm font-medium"
          >
            Dodaj meritve
          </button>
        </div>
      </div>

      {/* Measurements table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="text-left px-3 py-2 text-slate-300">Status</th>
              <th className="text-left px-3 py-2 text-slate-300">Vrednost</th>
              <th className="text-left px-3 py-2 text-slate-300">Vir</th>
              <th className="text-left px-3 py-2 text-slate-300">Negotovost</th>
              <th className="text-left px-3 py-2 text-slate-300">Algoritem</th>
            </tr>
          </thead>
          <tbody>
            {objectMeasurements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Ni meritev. Kliknite na sliko v načinu merjenja.
                </td>
              </tr>
            ) : (
              objectMeasurements.map(m => (
                <tr key={m.id} className="border-t border-slate-700/50">
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                      m.status === 'verified' ? 'bg-emerald-900/30 text-emerald-400' :
                      m.status === 'warning' ? 'bg-amber-900/30 text-amber-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {m.status === 'verified' ? '✓' : m.status === 'warning' ? '⚠' : '✗'}
                      {m.status === 'verified' ? 'PREVERJENA' : m.status === 'warning' ? 'OPOZORILO' : 'NEVELJAVNA'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-200 font-mono">
                    {formatMeasurement(m.value, m.unit, m.uncertainty)}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{m.source}</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">±{m.uncertainty.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{m.algorithm}</td>
                  {/* FAZA 17: vklop v načrt + brisanje meritve */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <label
                        className="inline-flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer"
                        title={m.excludedFromPlan
                          ? 'Meritev je izključena iz načrta in predračuna'
                          : 'Vključi meritev v načrt in predračun'}
                      >
                        <input
                          type="checkbox"
                          checked={!m.excludedFromPlan}
                          onChange={() => onToggleExcluded(m.id)}
                          aria-label={`Vključi meritev ${formatMeasurement(m.value, m.unit, m.uncertainty)} v načrt`}
                          className="accent-emerald-500"
                        />
                        {m.excludedFromPlan ? 'izključena' : 'v načrtu'}
                      </label>
                      <button
                        onClick={() => onDeleteMeasurement(m.id)}
                        className="text-[10px] text-red-300 hover:text-red-100 px-1.5 py-0.5 rounded hover:bg-red-900/40"
                        aria-label={`Izbriši meritev ${formatMeasurement(m.value, m.unit, m.uncertainty)}`}
                        title="Izbriši meritev"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Measurement rules */}
      <div className="mt-4 bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Merilna pravila</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>• PREVERJENA: izpolnjuje merilna pravila, ima dokumentirano merilo</li>
          <li>• OPOZORILO: uporabna z omejitvami, zahteva potrditev uporabnika</li>
          <li>• NEVELJAVNA: ne sme biti vključena v predračun</li>
          <li>• Brez kalibriranega merila: metrične vrednosti niso preverjene</li>
        </ul>
      </div>
    </div>
  );
}
