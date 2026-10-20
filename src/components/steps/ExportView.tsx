/**
 * ExportView.tsx — korak »Izvoz«: CSV/JSON/PDF poročilo in varnostna kopija.
 */
import type { Project, Measurement, FencePlan, StairsPlan, CostEstimate } from '../../types';
import { ProjectSummary } from '../ProjectSummary';
export function ExportView({ onExport, onExportBackup, measurements, currentProject, fencePlan, stairsPlan, estimate, pixelToMeter }: {
  onExport: (format: 'csv' | 'json' | 'pdf') => void;
  onExportBackup: () => void;
  measurements: Measurement[];
  currentProject: Project | null;
  fencePlan: FencePlan | null;
  stairsPlan: StairsPlan | null;
  estimate: CostEstimate | null;
  pixelToMeter: number | null;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">📤 Izvoz podatkov</h2>

      {/* Project Summary */}
      <ProjectSummary
        project={currentProject}
        measurements={measurements}
        fencePlan={fencePlan}
        stairsPlan={stairsPlan}
        estimate={estimate}
        pixelToMeter={pixelToMeter}
      />

      <div className="mt-4">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => onExport('csv')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-6 text-center transition-colors"
        >
          <span className="text-3xl">📊</span>
          <p className="text-sm font-medium text-slate-200 mt-2">CSV</p>
          <p className="text-xs text-slate-400 mt-1">Meritve v tabelarni obliki</p>
        </button>
        <button
          onClick={() => onExport('json')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-6 text-center transition-colors"
        >
          <span className="text-3xl">📋</span>
          <p className="text-sm font-medium text-slate-200 mt-2">JSON</p>
          <p className="text-xs text-slate-400 mt-1">Celoten projekt</p>
        </button>
        <button
          onClick={() => onExport('pdf')}
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg p-6 text-center transition-colors"
        >
          <span className="text-3xl">📄</span>
          <p className="text-sm font-medium text-slate-200 mt-2">PDF</p>
          <p className="text-xs text-slate-400 mt-1">Predračun za stranko</p>
        </button>
        <button
          onClick={onExportBackup}
          className="bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-800 rounded-lg p-6 text-center transition-colors"
          title="Varnostna kopija vsebuje tudi fotografije in omogoča obnovo projekta"
        >
          <span className="text-3xl">🧰</span>
          <p className="text-sm font-medium text-slate-200 mt-2">Varnostna kopija</p>
          <p className="text-xs text-slate-400 mt-1">Projekt + fotografije (obnovljivo)</p>
        </button>
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Varnost izvoza</h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>✓ Neveljavne meritve so izključene iz vseh izvozov</li>
          <li>✓ Vsaka mera ima sledljiv izvor in algoritem</li>
          <li>✓ Negotovost je navedena za vsako meritev</li>
          <li>✓ Status veljavnosti je ohranjen v izvozu</li>
          <li>✓ Lokalni izvoz — podatki ne zapustijo naprave</li>
        </ul>
      </div>

      {measurements.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Povzetek za izvoz</h3>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Skupno meritev: {measurements.length}</p>
            <p>Preverjene (vključene): {measurements.filter(m => m.status === 'verified').length}</p>
            <p>Opozorila (pogočno): {measurements.filter(m => m.status === 'warning').length}</p>
            <p>Neveljavne (izključene): {measurements.filter(m => m.status === 'invalid').length}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
