/**
 * MaterialView.tsx — korak »Materiali«: konfiguracija ograje/stopnic, segmenti
 * (koti in dvigi) ter cene materialov.
 */
import { useState } from 'react';
import type { Project, Measurement, FenceSegmentInput, MaterialPrices, FenceConfig, StairsConfig } from '../../types';
import { selectFenceLengthMeasurements } from '../../utils/geometry';
import { searchProfiles } from '../../data/roksalCatalog';
import { FenceSegmentEditor } from '../FenceSegmentEditor';
export function MaterialView({ currentProject, fenceConfig, onFenceConfigChange, stairsConfig, onStairsConfigChange, onCalculateFence, onCalculateStairs, measurements, fenceSegments, onFenceSegmentsChange, materialPrices, onMaterialPricesChange }: {
  currentProject: Project | null;
  fenceConfig: FenceConfig;
  onFenceConfigChange: (c: FenceConfig) => void;
  stairsConfig: StairsConfig;
  onStairsConfigChange: (c: StairsConfig) => void;
  onCalculateFence: () => void;
  onCalculateStairs: () => void;
  measurements: Measurement[];
  fenceSegments: FenceSegmentInput[];
  onFenceSegmentsChange: (segments: FenceSegmentInput[]) => void;
  materialPrices: MaterialPrices;
  onMaterialPricesChange: (prices: MaterialPrices) => void;
}) {
  const [activeSection, setActiveSection] = useState<'fence' | 'stairs'>('fence');
  // FAZA 21: iskanje profila v katalogu
  const [profileQuery, setProfileQuery] = useState('');
  const filteredProfiles = searchProfiles(profileQuery);

  return (
    <div>
      <h2 className="text-xl font-bold text-emerald-400 mb-4">🪵 Izbira materialov in konfiguracija</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSection('fence')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            activeSection === 'fence' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          🏗️ Ograja
        </button>
        <button
          onClick={() => setActiveSection('stairs')}
          className={`px-4 py-2 rounded text-sm font-medium ${
            activeSection === 'stairs' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
          }`}
        >
          🪜 Stopnice
        </button>
      </div>

      {activeSection === 'fence' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Konfiguracija ograje</h3>

            {/* FAZA 11: način konstrukcije (panelna ali deskna ograja) */}
            <div className="mb-3">
              <label htmlFor="fence-construction" className="text-xs text-slate-400">
                Konstrukcija
              </label>
              <select
                id="fence-construction"
                value={fenceConfig.constructionType ?? 'panel'}
                onChange={e => onFenceConfigChange({
                  ...fenceConfig,
                  constructionType: e.target.value as 'panel' | 'board',
                })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
              >
                <option value="panel">Panelna ograja (paneli + stebri)</option>
                <option value="board">Deskna ograja (deske iz kataloga)</option>
              </select>
              {fenceConfig.constructionType === 'board' && (
                <p className="text-xs text-slate-400 mt-1">
                  Deskna konstrukcija uporablja tehnična pravila izbranega Roksal profila
                  (razmiki stebrov in nosilcev) — zato je profil obvezen.
                </p>
              )}
            </div>

            {/* FAZA 8 (P2): izbira profila omogoča preverjanje tehničnih pravil */}
            <div className="mb-3">
              <label htmlFor="fence-profile" className="text-xs text-slate-400">
                Roksal profil (za preverjanje pravil)
              </label>
              <input
                type="search"
                value={profileQuery}
                onChange={e => setProfileQuery(e.target.value)}
                placeholder="Iskanje profila (npr. polna, 100, romb)"
                aria-label="Iskanje Roksal profila"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mb-2"
              />
              <select
                id="fence-profile"
                value={fenceConfig.profileId ?? ''}
                onChange={e => onFenceConfigChange({
                  ...fenceConfig,
                  profileId: e.target.value || undefined,
                })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
              >
                <option value="">Brez profila (pravila niso preverjena)</option>
                {filteredProfiles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — max razmak stebrov {p.maxPostSpacingLow} mm
                    {p.maxPostSpacingHigh !== p.maxPostSpacingLow ? ` / ${p.maxPostSpacingHigh} mm (>150 cm)` : ''}
                  </option>
                ))}
              </select>
              {fenceConfig.profileId && (
                <p className="text-xs text-slate-400 mt-1">
                  Preveri se razmak stebrov in tehnične zahteve profila. Kršitev = ni predračuna.
                </p>
              )}
            </div>

            {fenceConfig.constructionType === 'board' && (
              <div className="mb-3">
                <label htmlFor="fence-board-spacing" className="text-xs text-slate-400">
                  Razmik med deskami (mm)
                </label>
                <input
                  id="fence-board-spacing"
                  type="number"
                  min="0"
                  step="1"
                  value={fenceConfig.boardSpacing ?? ''}
                  placeholder="priporočen razmik profila"
                  onChange={e => onFenceConfigChange({
                    ...fenceConfig,
                    boardSpacing: e.target.value === '' ? undefined : parseFloat(e.target.value),
                  })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="fence-panel-width" className="text-xs text-slate-400">Širina panela (m)</label>
                <input
                  type="number"
                  step="0.1"
                  id="fence-panel-width"
                  value={fenceConfig.panelWidth}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, panelWidth: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="fence-panel-height" className="text-xs text-slate-400">Višina panela (m)</label>
                <input
                  type="number"
                  step="0.1"
                  id="fence-panel-height"
                  value={fenceConfig.panelHeight}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, panelHeight: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="fence-post-width" className="text-xs text-slate-400">Širina stebra (m)</label>
                <input
                  type="number"
                  step="0.01"
                  id="fence-post-width"
                  value={fenceConfig.postWidth}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, postWidth: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="fence-max-gap" className="text-xs text-slate-400">Max. razmik (m)</label>
                <input
                  type="number"
                  step="0.01"
                  id="fence-max-gap"
                  value={fenceConfig.maxGap}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, maxGap: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="fence-mounting" className="text-xs text-slate-400">Način montaže</label>
                <select
                  id="fence-mounting"
                  value={fenceConfig.mountingStyle}
                  onChange={e => onFenceConfigChange({ ...fenceConfig, mountingStyle: e.target.value as FenceConfig['mountingStyle'] })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                >
                  <option value="level">Ravna (level)</option>
                  <option value="stepped">Stopničasta (stepped)</option>
                  <option value="mixed">Mešana (auto)</option>
                </select>
              </div>
            </div>
            <button
              onClick={onCalculateFence}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded text-sm"
            >
              Izračunaj ograjo
            </button>
          </div>

          {/* FAZA 8 (P1): segmenti (koti/dvig) in cene materialov */}
          <FenceSegmentEditor
            measurements={measurements.filter(m => selectFenceLengthMeasurements([m]).length > 0)}
            segments={fenceSegments}
            onSegmentsChange={onFenceSegmentsChange}
            prices={materialPrices}
            onPricesChange={onMaterialPricesChange}
          />
        </div>
      )}

      {activeSection === 'stairs' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Konfiguracija stopnic</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="stairs-num-steps" className="text-xs text-slate-400">Število stopnic</label>
                <input
                  type="number"
                  min="1"
                  id="stairs-num-steps"
                  value={stairsConfig.numSteps}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, numSteps: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="stairs-total-rise" className="text-xs text-slate-400">Skupna višina (m)</label>
                <input
                  type="number"
                  step="0.1"
                  id="stairs-total-rise"
                  value={stairsConfig.totalRise}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, totalRise: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="stairs-total-run" className="text-xs text-slate-400">Skupna dolžina (m)</label>
                <input
                  type="number"
                  step="0.1"
                  id="stairs-total-run"
                  value={stairsConfig.totalRun}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, totalRun: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
              <div>
                <label htmlFor="stairs-handrail" className="text-xs text-slate-400">Višina ograje (m)</label>
                <input
                  type="number"
                  step="0.05"
                  id="stairs-handrail"
                  value={stairsConfig.handrailHeight}
                  onChange={e => onStairsConfigChange({ ...stairsConfig, handrailHeight: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white mt-1"
                />
              </div>
            </div>
            <button
              onClick={onCalculateStairs}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded text-sm"
            >
              Izračunaj stopnice
            </button>
          </div>
        </div>
      )}

      {/* Product info */}
      <div className="bg-slate-800 rounded-lg p-4 mt-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Izbrani produkt</h3>
        <div className="text-xs text-slate-400 space-y-1">
          <p>Linija: <span className="text-slate-200">{currentProject?.materials.productLine || 'Roksal Standard'}</span></p>
          <p>Barva: <span className="text-slate-200">{currentProject?.materials.color || 'Antracit RAL 7016'}</span></p>
          <p>Obdelava: <span className="text-slate-200">{currentProject?.materials.finish || 'Prašno barvan'}</span></p>
          <p>Material: <span className="text-slate-200">{currentProject?.materials.panelMaterial || 'Aluminij'}</span></p>
        </div>
        <p className="text-xs text-amber-400 mt-2">
          ⚠ Produktni podatki so privzeti. Za točne specifikacije uvozite katalog.
        </p>
      </div>
    </div>
  );
}
