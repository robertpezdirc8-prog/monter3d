/**
 * MeasurementsView.tsx — korak »Meritve«: merjenje na fotografiji in pregled
 * izmerjenih vrednosti.
 */
import type { Measurement, Photo } from '../../types';
import { formatMeasurement } from '../../utils/geometry';
export function MeasurementsView({ measurements, selectedPhoto, canvasRef, measuringMode, onToggleMeasuring, measurePoints, onCanvasClick, pixelToMeter, onAnalyze }: {
  measurements: Measurement[];
  selectedPhoto: Photo | null;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  measuringMode: boolean;
  onToggleMeasuring: () => void;
  measurePoints: {x: number; y: number}[];
  onCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  pixelToMeter: number | null;
  onAnalyze: (p: Photo) => void;
}) {
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
          className={`w-full rounded border-2 max-h-80 object-contain mb-4 ${
            measuringMode ? 'border-emerald-500 cursor-crosshair' : 'border-slate-700'
          }`}
        />
      )}

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
            {measurements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Ni meritev. Kliknite na sliko v načinu merjenja.
                </td>
              </tr>
            ) : (
              measurements.map(m => (
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
