/**
 * FenceSegmentEditor.tsx — FAZA 8 (P1)
 *
 * Urejevalnik segmentov ograje: za vsako dolžinsko meritev določi AZIMUT
 * (kot v prostoru) in morebitni DVIG. S tem je mogoče modelirati tudi kote
 * (L-oblike) in terenske razlike — prej je bila mogoča samo ravna ograja.
 *
 * Poleg tega ureja cene materialov, ki se uporabijo v predračunu.
 */
import type { FenceSegmentInput, MaterialPrices, Measurement } from '../types';
import { buildFenceGeometry, normalizeBearing } from '../utils/fenceGeometry';

interface FenceSegmentEditorProps {
  measurements: Measurement[];
  segments: FenceSegmentInput[];
  onSegmentsChange: (segments: FenceSegmentInput[]) => void;
  prices: MaterialPrices;
  onPricesChange: (prices: MaterialPrices) => void;
}

const PRICE_FIELDS: { key: keyof MaterialPrices; label: string; unit: string; step: number }[] = [
  { key: 'panelPricePerM2', label: 'Panel', unit: '€/m²', step: 1 },
  { key: 'postPriceEach', label: 'Steber', unit: '€/kos', step: 1 },
  { key: 'railPricePerM', label: 'Letev', unit: '€/m', step: 0.5 },
  { key: 'fastenerPriceEach', label: 'Pritrditev', unit: '€/kos', step: 0.1 },
  { key: 'endCapPriceEach', label: 'Zaključek', unit: '€/kos', step: 0.5 },
];

export function FenceSegmentEditor({
  measurements,
  segments,
  onSegmentsChange,
  prices,
  onPricesChange,
}: FenceSegmentEditorProps) {
  const overrides = new Map(segments.map(s => [s.id, s]));

  const inputs: FenceSegmentInput[] = measurements.map(m => ({
    id: m.id,
    length: m.value,
    bearingDeg: overrides.get(m.id)?.bearingDeg ?? 0,
    heightChange: overrides.get(m.id)?.heightChange ?? 0,
  }));

  const geometry = buildFenceGeometry(inputs);

  const updateSegment = (id: string, patch: Partial<FenceSegmentInput>) => {
    const next = measurements.map(m => {
      const current = overrides.get(m.id);
      const merged: FenceSegmentInput = {
        id: m.id,
        length: m.value,
        bearingDeg: current?.bearingDeg ?? 0,
        heightChange: current?.heightChange ?? 0,
        ...patch,
      };
      return merged;
    });
    onSegmentsChange(next);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-1">↔️ Segmenti ograje (koti in dvigi)</h3>
      <p className="text-xs text-slate-400 mb-3">
        Za vsako meritev vnesi smer segmenta (0° = v desno, 90° = naprej) in dvig.
        Brez tega je ograja ravna.
      </p>

      {measurements.length === 0 ? (
        <p className="text-xs text-slate-500">
          Ni dolžinskih meritev — segmentov ni mogoče določiti. Najprej izmeri dolžine.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left py-1 pr-2">#</th>
                  <th className="text-left py-1 pr-2">Dolžina</th>
                  <th className="text-left py-1 pr-2">Azimut (°)</th>
                  <th className="text-left py-1 pr-2">Dvig (m)</th>
                  <th className="text-left py-1 pr-2">Naklon</th>
                </tr>
              </thead>
              <tbody>
                {inputs.map((seg, i) => {
                  const g = geometry.segments[i];
                  return (
                    <tr key={seg.id} className="border-t border-slate-700/50">
                      <td className="py-1 pr-2 text-slate-400">{i + 1}</td>
                      <td className="py-1 pr-2 text-slate-200 font-mono">
                        {seg.length.toFixed(2)} m
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          step={1}
                          value={Number.isFinite(seg.bearingDeg) ? seg.bearingDeg : 0}
                          onChange={e => updateSegment(seg.id, {
                            bearingDeg: normalizeBearing(parseFloat(e.target.value) || 0),
                          })}
                          className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                          aria-label={`Azimut segmenta ${i + 1}`}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          step={0.05}
                          value={Number.isFinite(seg.heightChange) ? seg.heightChange : 0}
                          onChange={e => updateSegment(seg.id, {
                            heightChange: parseFloat(e.target.value) || 0,
                          })}
                          className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                          aria-label={`Dvig segmenta ${i + 1}`}
                        />
                      </td>
                      <td className="py-1 pr-2 text-slate-400">
                        {g ? `${g.slope.toFixed(1)}°` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
            <span>Skupna dolžina: <b className="text-emerald-400">{geometry.totalHorizontalLength.toFixed(2)} m</b></span>
            <span>Po terenu: <b className="text-emerald-400">{geometry.totalLength.toFixed(2)} m</b></span>
            <span>Dvig: <b className="text-emerald-400">{geometry.totalHeightChange.toFixed(2)} m</b></span>
          </div>

          {geometry.warnings.map((w, i) => (
            <p key={i} className="mt-2 text-xs text-amber-400">⚠ {w}</p>
          ))}
        </>
      )}



      {/* Cene materialov */}
      <h3 className="text-sm font-semibold text-slate-300 mt-5 mb-2">💶 Cene materialov</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PRICE_FIELDS.map(field => (
          <div key={field.key}>
            <label className="text-xs text-slate-400">
              {field.label} <span className="text-slate-500">({field.unit})</span>
            </label>
            <input
              type="number"
              step={field.step}
              min={0}
              value={prices[field.key]}
              onChange={e => onPricesChange({
                ...prices,
                [field.key]: Math.max(0, parseFloat(e.target.value) || 0),
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
