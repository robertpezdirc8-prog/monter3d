/**
 * PriceListEditor.tsx — urejevalnik cenika
 *
 * Monter oziroma vodstvo podjetja samostojno vnese cene (EUR brez DDV).
 * Shranijo se lokalno v napravo in se uporabijo pri vseh novo izdanih
 * ponudbah. Obstajajoče ponudbe obdržijo cene, s katerimi so bile izračunane.
 */

import { useState } from 'react';
import {
  DEFAULT_ROKSAL_PRICE_LIST,
  isPriceListValid,
  loadRoksalPriceList,
  resetRoksalPriceList,
  saveRoksalPriceList,
  type RoksalPriceList
} from '../data/roksalPrices';

interface PriceListEditorProps {
  onClose: () => void;
  onSaved?: (priceList: RoksalPriceList) => void;
}

function formatUpdated(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('sl-SI');
}

function PriceField({ label, value, onChange, suffix, step = '0.01' }: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
        />
        {suffix && <span className="text-xs text-slate-400 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

export function PriceListEditor({ onClose, onSaved }: PriceListEditorProps) {
  const [list, setList] = useState<RoksalPriceList>(() => loadRoksalPriceList());
  const [notice, setNotice] = useState<string | null>(null);

  const setNumber = (field: keyof RoksalPriceList, raw: string) => {
    const value = Number(raw);
    setList(prev => ({ ...prev, [field]: isFinite(value) && value >= 0 ? value : 0 }));
  };

  const setPercent = (field: 'taxRate' | 'wastePercent', raw: string) => {
    const value = Number(raw);
    setList(prev => ({ ...prev, [field]: isFinite(value) && value >= 0 ? value / 100 : 0 }));
  };

  const handleSave = () => {
    const clean: RoksalPriceList = {
      ...list,
      label: (list.label ?? '').trim() || undefined,
      version: list.version.trim() || `cenik-${new Date().toISOString().slice(0, 10)}`,
      validFrom: list.validFrom || new Date().toISOString().slice(0, 10)
    };
    if (!isPriceListValid(clean)) {
      setNotice('⚠️ Vse cene morajo biti veljavna nenegativna števila.');
      return;
    }
    if (!saveRoksalPriceList(clean)) {
      setNotice('⚠️ Cenika ni bilo mogoče shraniti (lokalna shramba ni na voljo).');
      return;
    }
    onSaved?.(loadRoksalPriceList());
    onClose();
  };

  const handleReset = () => {
    if (!window.confirm('Povrnem privzeti DEMO cenik? Shranjene cene bodo izbrisane.')) return;
    resetRoksalPriceList();
    onSaved?.(DEFAULT_ROKSAL_PRICE_LIST);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">💶 Cenik</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cene določi monter ali vodstvo — uporabijo se pri novih ponudbah na tej napravi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stanje cenika */}
          {list.isDemo ? (
            <p className="text-xs text-amber-300 bg-amber-900/20 border border-amber-700 rounded p-2">
              Trenutno so v uporabi privzete DEMO cene. Vnesite svoje cene in kliknite »Shrani cenik«.
            </p>
          ) : (
            <p className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-700 rounded p-2">
              Uporablja se vaš cenik: <strong>{list.label || list.version}</strong>
              {list.updatedAt ? ` (posodobljen ${formatUpdated(list.updatedAt)})` : ''}.
            </p>
          )}

          {/* Osnovni podatki */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Naziv cenika</label>
              <input
                type="text"
                value={list.label ?? ''}
                onChange={(e) => setList(prev => ({ ...prev, label: e.target.value }))}
                placeholder="npr. Cenik 2026"
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Oznaka (verzija)</label>
              <input
                type="text"
                value={list.version}
                onChange={(e) => setList(prev => ({ ...prev, version: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Velja od</label>
              <input
                type="date"
                value={list.validFrom}
                onChange={(e) => setList(prev => ({ ...prev, validFrom: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
          </div>

          {/* Material */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Material (EUR brez DDV)
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <PriceField
                label="Profil (deske) — €/m²"
                value={list.profilePricePerM2}
                onChange={(raw) => setNumber('profilePricePerM2', raw)}
              />
              <PriceField
                label="Steber — €/kos"
                value={list.postPriceEach}
                onChange={(raw) => setNumber('postPriceEach', raw)}
              />
              <PriceField
                label="Nosilec/letev — €/m"
                value={list.beamPricePerM}
                onChange={(raw) => setNumber('beamPricePerM', raw)}
              />
              <PriceField
                label="Alu cev — €/m"
                value={list.aluTubePricePerM}
                onChange={(raw) => setNumber('aluTubePricePerM', raw)}
              />
              <PriceField
                label="Kotnik — €/kos"
                value={list.bracketPriceEach}
                onChange={(raw) => setNumber('bracketPriceEach', raw)}
              />
              <PriceField
                label="Vijak/pritrdilo — €/kos"
                value={list.screwPriceEach}
                onChange={(raw) => setNumber('screwPriceEach', raw)}
              />
              <PriceField
                label="Zaključni pokrov — €/kos"
                value={list.endCapPriceEach}
                onChange={(raw) => setNumber('endCapPriceEach', raw)}
              />
            </div>
          </div>

          {/* Delo in dajatve */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Delo in dajatve
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <PriceField
                label="Montaža — €/h"
                value={list.laborRatePerHour}
                onChange={(raw) => setNumber('laborRatePerHour', raw)}
              />
              <PriceField
                label="DDV"
                suffix="%"
                value={Math.round(list.taxRate * 10000) / 100}
                onChange={(raw) => setPercent('taxRate', raw)}
              />
              <PriceField
                label="Odpad / razrez"
                suffix="%"
                value={Math.round(list.wastePercent * 10000) / 100}
                onChange={(raw) => setPercent('wastePercent', raw)}
              />
            </div>
          </div>

          {notice && <p className="text-xs text-red-400">{notice}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-semibold"
            >
              💾 Shrani cenik
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-sm font-medium"
            >
              ↩ Povrni privzeti DEMO
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded text-sm font-medium"
            >
              Prekliči
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            Cenik se shrani lokalno v to napravo. Nove ponudbe uporabijo nove cene,
            obstoječe ponudbe obdržijo cene, s katerimi so bile izračunane.
          </p>
        </div>
      </div>
    </div>
  );
}
