/**
 * EstimateView.tsx — korak »Predračun«: material, delo, davčna stopnja.
 */
import type { CostEstimate, Measurement } from '../../types';
export function EstimateView({ estimate, measurements, laborRate, laborHours, taxRate, onLaborRateChange, onLaborHoursChange, onTaxRateChange, onRecalculate }: {
  estimate: CostEstimate | null;
  measurements: Measurement[];
  laborRate: number;
  laborHours: number;
  taxRate: number;
  onLaborRateChange: (v: number) => void;
  onLaborHoursChange: (v: number) => void;
  onTaxRateChange: (v: number) => void;
  onRecalculate: () => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">💰 Predračun</h2>

      {/* Measurement validity check */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Preverjanje veljavnosti meritev</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-900/20 rounded p-2 text-center">
            <p className="text-lg font-bold text-emerald-400">{measurements.filter(m => m.status === 'verified').length}</p>
            <p className="text-xs text-emerald-300">Preverjene</p>
          </div>
          <div className="bg-amber-900/20 rounded p-2 text-center">
            <p className="text-lg font-bold text-amber-400">{measurements.filter(m => m.status === 'warning').length}</p>
            <p className="text-xs text-amber-300">Opozorila</p>
          </div>
          <div className="bg-red-900/20 rounded p-2 text-center">
            <p className="text-lg font-bold text-red-400">{measurements.filter(m => m.status === 'invalid').length}</p>
            <p className="text-xs text-red-300">Neveljavne</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          ⚠ Neveljavne meritve so izključene iz vseh količin in predračuna.
        </p>
      </div>

      {/* Labor config */}
      <div className="bg-slate-800 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Delo</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400">Urna postavka (€)</label>
            <input
              type="number"
              value={laborRate}
              onChange={e => onLaborRateChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Število ur</label>
            <input
              type="number"
              value={laborHours}
              onChange={e => onLaborHoursChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">DDV (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={e => onTaxRateChange(parseFloat(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
            />
          </div>
        </div>
        <button
          onClick={onRecalculate}
          className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          Preračunaj
        </button>
      </div>

      {/* Estimate table */}
      {estimate ? (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-700/50">
                <th className="text-left px-3 py-2 text-slate-300">Material</th>
                <th className="text-right px-3 py-2 text-slate-300">Kol.</th>
                <th className="text-right px-3 py-2 text-slate-300">Enota</th>
                <th className="text-right px-3 py-2 text-slate-300">Skupaj</th>
              </tr>
            </thead>
            <tbody>
              {estimate.materials.map(item => (
                <tr key={item.id} className="border-t border-slate-700/50">
                  <td className="px-3 py-2 text-slate-200">
                    <p>{item.name}</p>
                    {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-400">{item.unitPrice.toFixed(2)} €/{item.unit}</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-medium">{item.totalPrice.toFixed(2)} €</td>
                </tr>
              ))}
              {estimate.labor && (
                <tr className="border-t border-slate-700/50">
                  <td className="px-3 py-2 text-slate-200">Montaža</td>
                  <td className="px-3 py-2 text-right text-slate-200">{estimate.labor.hours} ur</td>
                  <td className="px-3 py-2 text-right text-slate-400">{estimate.labor.rate.toFixed(2)} €/h</td>
                  <td className="px-3 py-2 text-right text-slate-200 font-medium">{estimate.labor.total.toFixed(2)} €</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600">
                <td colSpan={3} className="px-3 py-2 text-slate-300">Vmesni seštevek</td>
                <td className="px-3 py-2 text-right text-slate-200">{estimate.subtotal.toFixed(2)} €</td>
              </tr>
              {estimate.labor && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-slate-300">Materiali + delo</td>
                  <td className="px-3 py-2 text-right text-slate-200">{(estimate.subtotal + estimate.labor.total).toFixed(2)} €</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="px-3 py-2 text-slate-300">DDV ({estimate.taxRate * 100}%)</td>
                <td className="px-3 py-2 text-right text-slate-200">{estimate.tax.toFixed(2)} €</td>
              </tr>
              <tr className="bg-emerald-900/20">
                <td colSpan={3} className="px-3 py-3 text-emerald-300 font-bold">SKUPAJ</td>
                <td className="px-3 py-3 text-right text-emerald-300 font-bold text-lg">{estimate.total.toFixed(2)} €</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
          <p>Predračun ni na voljo. Najprej izračunajte količine.</p>
        </div>
      )}
    </div>
  );
}
