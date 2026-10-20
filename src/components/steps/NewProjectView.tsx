/**
 * NewProjectView.tsx — korak »Nov projekt«: ustvarjanje, odpiranje, brisanje
 * projektov in uvoz varnostne kopije.
 */
import { useRef, useState } from 'react';
import type { Project, ObjectType } from '../../types';
import { getObjectTypeLabel } from '../../utils/labels';
import { IconPlus } from '../icons';
export function NewProjectView({ onCreateProject, projects, currentProjectId, onOpenProject, onDeleteProject, onImportBackup }: {
  onCreateProject: (name: string, type: ObjectType) => void;
  projects: Project[];
  currentProjectId: string | null;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportBackup: (file: File) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ObjectType>('fence');
  const backupInputRef = useRef<HTMLInputElement>(null);

  const formatDate = (value: Date | string) => {
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('sl-SI');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-emerald-400">Nov projekt</h2>

      {/* FAZA 7 (P0): uvoz varnostne kopije — obnova projekta s fotografijami */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-800/60 rounded-lg px-4 py-3">
        <p className="text-xs text-slate-400">
          Imaš varnostno kopijo (.json)? Obnovi projekt skupaj s fotografijami, meritvami in predračunom.
        </p>
        <div>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void onImportBackup(file);
              e.target.value = ''; // omogoči ponoven izbiro iste datoteke
            }}
          />
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded"
          >
            ⬆ Uvozi varnostno kopijo
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Ime projekta</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="npr. Ograja - Družina Novak"
          className="w-full bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
        />
        
        <label className="block text-sm font-medium text-slate-300 mt-4 mb-2">Tip objekta</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { value: 'fence', label: 'Ograja', icon: '🏗️' },
            { value: 'stairs', label: 'Stopnice', icon: '🪜' },
            { value: 'facade', label: 'Fasada', icon: '🏢' },
            { value: 'terrain', label: 'Teren', icon: '⛰️' },
            { value: 'combined', label: 'Kombinirano', icon: '📋' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value as ObjectType)}
              className={`p-3 rounded border text-center transition-colors ${
                type === opt.value
                  ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                  : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <p className="text-xs mt-1">{opt.label}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => name && onCreateProject(name, type)}
          disabled={!name}
          className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:text-slate-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <IconPlus /> Ustvari projekt
        </button>
      </div>

      {projects.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Obstoječi projekti</h3>
          <div className="space-y-2">
            {projects.map(p => {
              const isActive = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded p-3 ${
                    isActive ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-slate-700/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenProject(p.id)}
                    className="flex-1 text-left"
                    title="Odpri projekt"
                  >
                    <p className="text-sm font-medium">
                      {p.name} {isActive && <span className="text-emerald-400">(aktiven)</span>}
                    </p>
                    <p className="text-xs text-slate-400">
                      {getObjectTypeLabel(p.objectType)} • {formatDate(p.createdAt)}
                    </p>
                  </button>
                  <span className="text-xs bg-slate-600 px-2 py-1 rounded">{p.status}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Izbrišem projekt "${p.name}" in vse njegove fotografije?`)) {
                        onDeleteProject(p.id);
                      }
                    }}
                    className="text-xs bg-red-900/60 hover:bg-red-800 text-red-200 px-2 py-1 rounded"
                    title="Izbriši projekt"
                    aria-label={`Izbriši projekt ${p.name}`}
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
