/**
 * Skladišče — pregled kosovnic shranjenih projektov in priprava pobirnice.
 *
 * Vsak projekt, ki ima Roksal ponudbo (roksalQuote), se prikaže na seznamu.
 * Skladiščnik izbere projekt, odkljuka pobrane postavke in natisne pobirnico.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project, RoksalQuote } from '../types';
import { getAllProjects } from '../utils/storage';
import { printPickList } from '../utils/pdfExport';

interface AggregatedItem {
  key: string;
  name: string;
  unit: string;
  quantity: number;
  notes?: string;
}

/** Združi postavke kosovnice z istim nazivom in enoto (sešteje količine). */
function aggregateQuoteItems(quote: RoksalQuote): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();
  for (const item of quote.items) {
    const key = `${item.name}|${item.unit}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + item.quantity) * 100) / 100;
      if (!existing.notes && item.notes) existing.notes = item.notes;
    } else {
      map.set(key, {
        key,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        notes: item.notes
      });
    }
  }
  return [...map.values()];
}

function formatDate(value: unknown): string {
  const d = new Date(value as string | number | Date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI');
}

export function WarehouseView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllProjects();
      setProjects(all);
    } catch (err) {
      console.error('Napaka pri branju projektov:', err);
      setError('Projektov ni bilo mogoče prebrati iz lokalne shrambe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withQuote = useMemo(
    () => projects
      .filter(p => p.roksalQuote)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects]
  );

  const selected = useMemo(
    () => withQuote.find(p => p.id === selectedId) ?? withQuote[0] ?? null,
    [withQuote, selectedId]
  );

  const items = useMemo(
    () => (selected?.roksalQuote ? aggregateQuoteItems(selected.roksalQuote) : []),
    [selected]
  );

  // Ob menjavi projekta ponastavi odkljukane postavke
  useEffect(() => {
    setPicked({});
  }, [selected?.id]);

  const pickedCount = items.filter(i => picked[i.key]).length;

  const toggleItem = (key: string) => {
    setPicked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    if (!selected?.roksalQuote) return;
    printPickList(selected, selected.roksalQuote);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Pobirnica materiala</h2>
          <p className="text-xs text-slate-400">
            Kosovnice shranjenih projektov. Odkljukajte pobrane postavke in natisnite pobirnico.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-xs font-medium"
        >
          ↻ Osveži seznam
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Nalagam projekte …</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && withQuote.length === 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-6 text-sm text-slate-300">
          <p className="font-medium text-slate-200 mb-1">Ni shranjenih kosovnic.</p>
          <p className="text-slate-400">
            Kosovnica se ustvari v vlogi <strong>Monter</strong> v konfiguratorju ograje
            (gumb „Uporabi v projektu in pripravi ponudbo“). Ko je projekt shranjen,
            se njegova kosovnica prikaže tukaj.
          </p>
        </div>
      )}

      {!loading && !error && withQuote.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Seznam projektov */}
          <div className="lg:col-span-1 bg-slate-800/60 border border-slate-700 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Projekti s kosovnico ({withQuote.length})
            </h3>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {withQuote.map(p => {
                const q = p.roksalQuote!;
                const active = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors ${
                      active
                        ? 'bg-emerald-900/40 border-emerald-600'
                        : 'bg-slate-900/40 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-medium text-slate-100 truncate">{p.name}</div>
                    <div className="text-slate-400 truncate">
                      {q.number} · {q.customer?.name || 'stranka ni vnesena'}
                    </div>
                    <div className="text-slate-500">Posodobljeno: {formatDate(p.updatedAt)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Podrobnosti izbranega projekta */}
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700 rounded-lg p-4">
            {selected?.roksalQuote && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{selected.name}</h3>
                    <p className="text-xs text-slate-400">
                      Ponudba {selected.roksalQuote.number} · {selected.roksalQuote.customer?.name || 'stranka ni vnesena'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selected.roksalQuote.configuration.profileName} ·{' '}
                      {selected.roksalQuote.configuration.colorName} ·{' '}
                      {selected.roksalQuote.configuration.orientation === 'vertical' ? 'pokončno' : 'prečno'} ·{' '}
                      {(selected.roksalQuote.configuration.fenceLengthMm / 1000).toFixed(2)} m ×{' '}
                      {(selected.roksalQuote.configuration.fenceHeightMm / 1000).toFixed(2)} m
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPicked({})}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-xs"
                    >
                      Počisti
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                    >
                      🖨️ Natisni pobirnico
                    </button>
                  </div>
                </div>

                {selected.roksalQuote.isDemoPrices && (
                  <p className="text-xs text-amber-400 mb-3">
                    ⚠️ Ponudba vsebuje DEMO cene — količine v kosovnici so pravilne, cene pa niso uradne.
                  </p>
                )}

                {!selected.roksalQuote.valid && (
                  <p className="text-xs text-red-400 mb-3">
                    ⚠️ Konfiguracija te ponudbe ni veljavna. Pred pripravo materiala jo preverite pri monterju.
                  </p>
                )}

                <p className="text-xs text-slate-400 mb-2">
                  Pobrano: <span className="text-emerald-400 font-semibold">{pickedCount}</span> / {items.length} postavk
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-1 pr-2 w-8">✓</th>
                        <th className="text-left py-1 pr-2">Postavka</th>
                        <th className="text-right py-1 px-2">Količina</th>
                        <th className="text-right py-1 pl-2">Enota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.key} className="border-b border-slate-800">
                          <td className="py-1 pr-2">
                            <input
                              type="checkbox"
                              checked={!!picked[item.key]}
                              onChange={() => toggleItem(item.key)}
                              className="accent-emerald-500"
                            />
                          </td>
                          <td className={`py-1 pr-2 ${picked[item.key] ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.name}
                            {item.notes && (
                              <div className="text-slate-500 text-[11px]">{item.notes}</div>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-200">{item.quantity}</td>
                          <td className="py-1 pl-2 text-right text-slate-400">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-500 mt-3">
                  Namig: pobirnico lahko natisnete tudi brez odkljukavanja — na papirju so
                  pripravljena polja za sprotno odkljukavanje v skladišču.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
