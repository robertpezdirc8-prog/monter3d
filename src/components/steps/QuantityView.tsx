/**
 * QuantityView.tsx — korak »Količine«: pregled izračunanega načrta.
 */
import type { FencePlan, StairsPlan } from '../../types';
export function QuantityView({ fencePlan, stairsPlan }: { fencePlan: FencePlan | null; stairsPlan: StairsPlan | null }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">🔢 Količine in materialni seznam</h2>

      {fencePlan && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🏗️ Ograja - povzetek</h3>

          {/* FAZA 1: napake nacrta so vidne — ne prikazujemo lazno veljavnih kolicin */}
          {fencePlan.errors && fencePlan.errors.length > 0 && (
            <div className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200">
              <p className="font-semibold mb-1">⛔ Napake pri načrtu (predračun ni mogoč)</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {fencePlan.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {fencePlan.warnings && fencePlan.warnings.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p className="font-semibold mb-1">⚠️ Opozorila</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {fencePlan.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Skupna dolžina" value={`${fencePlan.totalLength.toFixed(2)} m`} />
            <StatCard label="Paneli" value={`${fencePlan.totalPanels} kos`} />
            <StatCard
              label="Stebri"
              value={fencePlan.sharedCornerPosts > 0
                ? `${fencePlan.totalPosts} kos (${fencePlan.sharedCornerPosts} deljenih vogalnih)`
                : `${fencePlan.totalPosts} kos`}
            />
            <StatCard label="Letve" value={`${fencePlan.totalRails} kos`} />
            <StatCard label="Pritrdilni elem." value={`${fencePlan.totalFasteners} kos`} />
            <StatCard label="Višina" value={`${fencePlan.panelHeight} m`} />
            <StatCard label="Način" value={fencePlan.mountingStyle === 'stepped' ? 'Stopničasta' : 'Ravna'} />
            <StatCard label="Segmenti" value={`${fencePlan.segments.length}`} />
          </div>

          {fencePlan.segments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">Segmenti</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="px-2 py-1 text-left text-slate-400">#</th>
                      <th className="px-2 py-1 text-left text-slate-400">Dolžina</th>
                      <th className="px-2 py-1 text-left text-slate-400">ΔVišina</th>
                      <th className="px-2 py-1 text-left text-slate-400">Naklon</th>
                      <th className="px-2 py-1 text-left text-slate-400">Paneli</th>
                      <th className="px-2 py-1 text-left text-slate-400">Dej. širina panela</th>
                      <th className="px-2 py-1 text-left text-slate-400">Montaža</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fencePlan.segments.map((seg, i) => (
                      <tr key={seg.id} className="border-t border-slate-700/50">
                        <td className="px-2 py-1 text-slate-300">{i + 1}</td>
                        <td className="px-2 py-1 text-slate-200">{seg.length.toFixed(2)} m</td>
                        <td className="px-2 py-1 text-slate-200">{seg.heightChange.toFixed(2)} m</td>
                        <td className="px-2 py-1 text-slate-200">{seg.slope.toFixed(1)}°</td>
                        <td className="px-2 py-1 text-slate-200">{seg.numPanels}</td>
                        <td className={`px-2 py-1 ${Math.abs(seg.panelWidth - seg.nominalPanelWidth) > fencePlan.maxGap ? 'text-red-300 font-semibold' : 'text-slate-200'}`}>
                          {(seg.panelWidth * 100).toFixed(1)} cm
                          {seg.panelWidth < seg.nominalPanelWidth - 0.001 && ' (rezan)'}
                        </td>
                        <td className="px-2 py-1 text-slate-200">{seg.mountingType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {stairsPlan && (
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">🪜 Stopnice - povzetek</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Stopnice" value={`${stairsPlan.numSteps} kos`} />
            <StatCard label="Skupna višina" value={`${stairsPlan.totalRise.toFixed(2)} m`} />
            <StatCard label="Skupna dolžina" value={`${stairsPlan.totalRun.toFixed(2)} m`} />
            <StatCard label="Naklon" value={`${stairsPlan.slope.toFixed(1)}°`} />
            <StatCard label="Povp. stopnica" value={`${(stairsPlan.averageRise * 100).toFixed(1)} cm`} />
            <StatCard label="Povp. gaz" value={`${(stairsPlan.averageRun * 100).toFixed(1)} cm`} />
            <StatCard label="Dolžina ograje" value={`${stairsPlan.railingLength.toFixed(2)} m`} />
            <StatCard label="Višina ograje" value={`${stairsPlan.handrailHeight} m`} />
            {stairsPlan.warnings && stairsPlan.warnings.length > 0 && (
              <div className="col-span-full rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                <p className="font-semibold mb-1">⚠️ Tehnična opozorila</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {stairsPlan.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {!fencePlan && !stairsPlan && (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          <p>Ni izračunov. Najprej konfigurirajte in izračunajte v zavihku Materiali.</p>
        </div>
      )}
    </div>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-700/50 rounded p-2">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-200">{value}</p>
    </div>
  );
}
