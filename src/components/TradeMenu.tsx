/**
 * TradeMenu.tsx — Izbira obrti za zajem s kamero (brez AI, samo kamera + skripte).
 * Pogoj: veljaven hash #trade prikazuje to stran; App.tsx jo renderira prek hashchange.
 */
import { TRADE_PROFILES, type TradeId } from '../utils/cameraSDK';

export default function TradeMenu({ onBack }: { onBack?: () => void } = {}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        {onBack && <button onClick={onBack} className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600">← Mera3D</button>}
        <h1 className="text-2xl font-bold">📷 Kamera za monterje</h1>
      </div>
      <p className="text-sm text-slate-400 mb-5">
        Voden fotografski zajem z merili (A4, trak, vodotok) — 100 % offline, brez AI modelov,
        samodejna prevera ostrine in svetlobe, beleženje nagiba/lokacije.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(TRADE_PROFILES) as TradeId[]).map(id => {
          const p = TRADE_PROFILES[id];
          return (
            <a key={id} href={`#capture/${id}`}
              className="block bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-5 transition-colors">
              <span className="text-3xl">{p.icon}</span>
              <h2 className="font-semibold mt-2">{p.name}</h2>
              <p className="text-xs text-slate-400 mt-1">{p.description}</p>
              <p className="text-[11px] text-blue-400 mt-2">{p.requirements.length} korakov zajema →</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
