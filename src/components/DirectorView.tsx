/**
 * Direktor — pregled projektov in ponudb (vrednosti, statusi, izvoz v CSV).
 *
 * Podatki se berejo iz lokalne shrambe (IndexedDB). Pregled je namenjen hitremu
 * vpogledu: koliko ponudb je izdanih, kakšna je njihova vrednost in katera
 * ponudba je neveljavna.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project, RoksalQuote } from '../types';
import { getAllProjects } from '../utils/storage';

interface QuoteRow {
  projectId: string;
  projectName: string;
  quote: RoksalQuote;
}

function formatEur(value: number): string {
  return `${value.toLocaleString('sl-SI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} €`;
}

function formatDate(value: unknown): string {
  const d = new Date(value as string | number | Date);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI');
}

export function DirectorView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const rows = useMemo<QuoteRow[]>(
    () => projects
      .filter(p => p.roksalQuote)
      .map(p => ({ projectId: p.id, projectName: p.name, quote: p.roksalQuote! }))
      .sort((a, b) => new Date(b.quote.createdAt).getTime() - new Date(a.quote.createdAt).getTime()),
    [projects]
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const netTotal = rows.reduce((sum, r) => sum + (r.quote.subtotal - r.quote.discount), 0);
    const grossTotal = rows.reduce((sum, r) => sum + r.quote.total, 0);
    const avgNet = total > 0 ? netTotal / total : 0;
    const demoCount = rows.filter(r => r.quote.isDemoPrices).length;
    const invalidCount = rows.filter(r => !r.quote.valid).length;
    return { total, netTotal, grossTotal, avgNet, demoCount, invalidCount };
  }, [rows]);

  const exportCsv = useCallback(() => {
    const clean = (value: string) => value.replace(/;/g, ',').replace(/\r?\n/g, ' ');
    const header = [
      'Ponudba', 'Datum', 'Velja do', 'Stranka', 'Projekt', 'Status',
      'Neto EUR', 'DDV EUR', 'Skupaj EUR', 'Demo cene'
    ];
    const lines = rows.map(r => [
      clean(r.quote.number),
      formatDate(r.quote.createdAt),
      formatDate(r.quote.validUntil),
      clean(r.quote.customer?.name ?? ''),
      clean(r.projectName),
      r.quote.valid ? 'veljavna' : 'neveljavna',
      (r.quote.subtotal - r.quote.discount).toFixed(2),
      r.quote.tax.toFixed(2),
      r.quote.total.toFixed(2),
      r.quote.isDemoPrices ? 'da' : 'ne'
    ].join(';'));

    const csv = [header.join(';'), ...lines].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roksal-ponudbe-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rows]);

  const cards = [
    { label: 'Projektov v shrambi', value: String(projects.length) },
    { label: 'Izdanih ponudb', value: String(stats.total) },
    { label: 'Vrednost ponudb (brez DDV)', value: formatEur(stats.netTotal) },
    { label: 'Povprečna ponudba (brez DDV)', value: formatEur(stats.avgNet) }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Pregled ponudb</h2>
          <p className="text-xs text-slate-400">
            Vrednosti so informativne in se berejo iz lokalne shrambe te naprave.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-xs font-medium"
          >
            ↻ Osveži
          </button>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className={`px-3 py-2 rounded text-xs font-semibold ${
              rows.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            ⬇ Izvozi CSV
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Nalagam projekte …</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map(card => (
              <div key={card.label} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">{card.label}</p>
                <p className="text-lg font-bold text-emerald-400">{card.value}</p>
              </div>
            ))}
          </div>

          {(stats.demoCount > 0 || stats.invalidCount > 0) && (
            <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3 text-xs text-amber-200">
              {stats.demoCount > 0 && (
                <p>
                  ⚠️ {stats.demoCount} od {stats.total} ponudb uporablja DEMO cene — niso primerne za pošiljanje strankam,
                  dokler cenik ni zamenjan z uradnim.
                </p>
              )}
              {stats.invalidCount > 0 && (
                <p>⚠️ {stats.invalidCount} ponudb je neveljavnih (nepopolna ali neskladna konfiguracija).</p>
              )}
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 overflow-x-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-slate-400">
                Ni izdanih ponudb. Ponudbe se ustvarijo v vlogi <strong>Monter</strong> v konfiguratorju ograje.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-2">Ponudba</th>
                    <th className="text-left py-2 px-2">Datum</th>
                    <th className="text-left py-2 px-2">Stranka</th>
                    <th className="text-left py-2 px-2">Projekt</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Neto</th>
                    <th className="text-right py-2 pl-2">Skupaj z DDV</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.quote.id} className="border-b border-slate-800">
                      <td className="py-2 pr-2 text-slate-200 font-medium">
                        {row.quote.number}
                        {row.quote.isDemoPrices && (
                          <span className="ml-2 text-[10px] bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded">
                            DEMO
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-slate-400">{formatDate(row.quote.createdAt)}</td>
                      <td className="py-2 px-2 text-slate-200">{row.quote.customer?.name || '—'}</td>
                      <td className="py-2 px-2 text-slate-400">{row.projectName}</td>
                      <td className="py-2 px-2">
                        <span className={row.quote.valid ? 'text-emerald-400' : 'text-red-400'}>
                          {row.quote.valid ? 'veljavna' : 'neveljavna'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-slate-200">
                        {formatEur(row.quote.subtotal - row.quote.discount)}
                      </td>
                      <td className="py-2 pl-2 text-right text-slate-200 font-semibold">
                        {formatEur(row.quote.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Opomba: pregled prikazuje podatke lokalne naprave. Za skupni pregled med napravami bo
            potrebna sinhronizacija (npr. strežnik ali skupna baza) — je na seznamu za naslednje faze.
          </p>
        </>
      )}
    </div>
  );
}
