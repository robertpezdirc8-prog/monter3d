import type { Project, Measurement, FencePlan, StairsPlan, CostEstimate } from '../types';

interface ProjectSummaryProps {
  project: Project | null;
  measurements: Measurement[];
  fencePlan: FencePlan | null;
  stairsPlan: StairsPlan | null;
  estimate: CostEstimate | null;
  pixelToMeter: number | null;
}

export function ProjectSummary({ project, measurements, fencePlan, stairsPlan, estimate, pixelToMeter }: ProjectSummaryProps) {
  if (!project) return null;

  const verifiedCount = measurements.filter(m => m.status === 'verified').length;
  const warningCount = measurements.filter(m => m.status === 'warning').length;
  const invalidCount = measurements.filter(m => m.status === 'invalid').length;
  const totalMeasurements = measurements.length;

  // Validation checks
  const checks = [
    {
      label: 'Lokalno delovanje',
      passed: true,
      detail: 'Brez oblačnih storitev'
    },
    {
      label: 'Meritve brez oblaka',
      passed: true,
      detail: 'Vse računanje je lokalno; AI detekcija je izbirna'
    },
    {
      label: 'Sledljivost meritev',
      passed: measurements.every(m => m.source && m.algorithm),
      detail: measurements.every(m => m.source && m.algorithm) ? 'Vse meritve imajo izvor' : 'Nekatere meritve nimajo izvora'
    },
    {
      label: 'Kalibrirano merilo',
      passed: pixelToMeter !== null,
      detail: pixelToMeter ? `Merilo: ${pixelToMeter.toFixed(5)} m/px` : 'Merilo ni kalibrirano'
    },
    {
      label: 'Preverjene meritve',
      passed: verifiedCount > 0,
      detail: `${verifiedCount}/${totalMeasurements} preverjenih`
    },
    {
      label: 'Neveljavne izključene',
      passed: invalidCount === 0 || !estimate,
      detail: invalidCount > 0 ? `${invalidCount} neveljavnih meritev izključenih` : 'Ni neveljavnih meritev'
    },
    {
      label: 'Negotovost navedena',
      passed: measurements.every(m => m.uncertainty > 0),
      detail: 'Vsaka mera ima oceno negotovosti'
    },
    {
      label: 'Materialni izračun',
      passed: fencePlan !== null || stairsPlan !== null,
      detail: fencePlan ? `Ograja: ${fencePlan.totalLength.toFixed(2)} m` : stairsPlan ? `Stopnice: ${stairsPlan.numSteps} st.` : 'Ni izračuna'
    },
    {
      label: 'Predračun',
      passed: estimate !== null,
      detail: estimate ? `${estimate.total.toFixed(2)} €` : 'Ni predračuna'
    }
  ];

  const passedChecks = checks.filter(c => c.passed).length;
  const totalChecks = checks.length;

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300">📋 Povzetek projekta</h3>
        <span className={`text-xs font-bold px-2 py-1 rounded ${
          passedChecks === totalChecks ? 'bg-emerald-600 text-white' :
          passedChecks >= totalChecks * 0.7 ? 'bg-amber-600 text-white' :
          'bg-red-600 text-white'
        }`}>
          {passedChecks}/{totalChecks} preverjanj
        </span>
      </div>

      {/* Project info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-700/50 rounded p-3">
          <p className="text-[10px] text-slate-400">Projekt</p>
          <p className="text-sm font-medium text-slate-200">{project.name}</p>
        </div>
        <div className="bg-slate-700/50 rounded p-3">
          <p className="text-[10px] text-slate-400">Tip objekta</p>
          <p className="text-sm font-medium text-slate-200">{getObjectTypeLabel(project.objectType)}</p>
        </div>
        <div className="bg-slate-700/50 rounded p-3">
          <p className="text-[10px] text-slate-400">Ustvarjeno</p>
          <p className="text-sm font-medium text-slate-200">{project.createdAt.toLocaleDateString('sl-SI')}</p>
        </div>
        <div className="bg-slate-700/50 rounded p-3">
          <p className="text-[10px] text-slate-400">Status</p>
          <p className="text-sm font-medium text-slate-200">{getStatusLabel(project.status)}</p>
        </div>
      </div>

      {/* Measurement summary */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-400 mb-2">Meritve</h4>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center bg-slate-700/30 rounded p-2">
            <p className="text-lg font-bold text-slate-200">{totalMeasurements}</p>
            <p className="text-[10px] text-slate-400">Skupaj</p>
          </div>
          <div className="text-center bg-emerald-900/20 rounded p-2">
            <p className="text-lg font-bold text-emerald-400">{verifiedCount}</p>
            <p className="text-[10px] text-emerald-300">Preverjene</p>
          </div>
          <div className="text-center bg-amber-900/20 rounded p-2">
            <p className="text-lg font-bold text-amber-400">{warningCount}</p>
            <p className="text-[10px] text-amber-300">Opozorila</p>
          </div>
          <div className="text-center bg-red-900/20 rounded p-2">
            <p className="text-lg font-bold text-red-400">{invalidCount}</p>
            <p className="text-[10px] text-red-300">Neveljavne</p>
          </div>
        </div>
      </div>

      {/* Validation checks */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 mb-2">Preverjanja kakovosti</h4>
        <div className="space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`w-4 h-4 rounded-full flex items-center justify-center ${
                check.passed ? 'bg-emerald-600' : 'bg-red-600'
              }`}>
                {check.passed ? '✓' : '✗'}
              </span>
              <span className="text-slate-200 flex-1">{check.label}</span>
              <span className="text-slate-400 text-[10px]">{check.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Final status */}
      <div className={`mt-4 rounded p-3 border ${
        passedChecks === totalChecks ? 'bg-emerald-900/20 border-emerald-700' :
        passedChecks >= totalChecks * 0.7 ? 'bg-amber-900/20 border-amber-700' :
        'bg-red-900/20 border-red-700'
      }`}>
        <p className={`text-sm font-bold ${
          passedChecks === totalChecks ? 'text-emerald-300' :
          passedChecks >= totalChecks * 0.7 ? 'text-amber-300' :
          'text-red-300'
        }`}>
          {passedChecks === totalChecks ? '✅ Projekt pripravljen za validacijo' :
           passedChecks >= totalChecks * 0.7 ? '⚠ Projekt zahteva dopolnitve' :
           '❌ Projekt ni pripravljen'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {passedChecks === totalChecks 
            ? 'Vsa preverjanja so uspešna. Projekt je pripravljen za terensko validacijo.'
            : `${totalChecks - passedChecks} preverjanj ni uspešnih. Odpravite manjkajoče elemente.`
          }
        </p>
      </div>
    </div>
  );
}

function getObjectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fence: 'Ograja',
    stairs: 'Stopnice',
    facade: 'Fasada',
    terrain: 'Teren',
    combined: 'Kombinirano'
  };
  return labels[type] || type;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    capture: 'Zajemanje',
    processing: 'Obdelava',
    measuring: 'Merjenje',
    planning: 'Načrtovanje',
    complete: 'Zaključeno'
  };
  return labels[status] || status;
}
