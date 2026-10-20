/**
 * HistoryView.tsx — FAZA 27
 *
 * Pregled opravljenih dejanj v projektu (»kaj je bilo narejeno«).
 * Dnevnik je lokalen (IndexedDB) in prikazuje dogodke od najnovejšega.
 */
import { useState } from 'react';
import type { ActivityEntry } from '../../utils/activityLog';
import { ACTIVITY_PRESENTATION } from '../../utils/activityLog';

interface HistoryViewProps {
  entries: ActivityEntry[];
  loading: boolean;
}

export function HistoryView({ entries, loading }: HistoryViewProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, 12);

  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">🕘 Zgodovina projekta</h2>

      <div className="bg-slate-800/60 rounded-lg px-4 py-3 mb-4 text-xs text-slate-400">
        Sled opravljenega dela — kaj je bilo izmerjeno, dodano in izračunano.
        Vse je shranjeno lokalno v tej napravi.
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Nalaganje…</p>
      ) : entries.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-6 text-center">
          <p className="text-slate-400">Za ta projekt še ni zabeleženih dogodkov.</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <ol>
            {visible.map((entry, index) => {
              const presentation = ACTIVITY_PRESENTATION[entry.type] ?? { icon: '•', label: 'Dogodek' };
              return (
                <li
                  key={entry.id}
                  className={`flex items-start gap-3 px-4 py-2.5 text-sm ${
                    index < visible.length - 1 ? 'border-b border-slate-700/60' : ''
                  }`}
                >
                  <span className="text-lg leading-5" aria-hidden>{presentation.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200">{entry.message}</p>
                    <p className="text-[11px] text-slate-500">
                      {presentation.label} ·{' '}
                      {entry.timestamp.toLocaleString('sl-SI')}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          {entries.length > 12 && (
            <div className="px-4 py-2 border-t border-slate-700/60">
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-xs text-blue-300 hover:text-blue-200"
              >
                {showAll ? 'Pokaži manj' : `Pokaži vse (${entries.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
