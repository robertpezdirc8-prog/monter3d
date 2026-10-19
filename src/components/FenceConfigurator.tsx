/**
 * Mera3D Pro - Fence Configurator Component
 * 
 * Interactive configurator for WoodCore WPC fences.
 * Supports natural language input and manual configuration.
 */

import { useState, useCallback, useMemo } from 'react';
import { ROKSAL_PROFILES, ROKSAL_COLORS, getProfileById } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';
import { parseFenceConfiguration, validateConfiguration, getExamplePrompts } from '../utils/naturalLanguageParser';
import { calculateFenceConstruction, validateFenceConfiguration } from '../utils/fenceConstruction';
import type { ConstructionResult, FenceConfiguration } from '../utils/fenceConstruction';
import { createRoksalQuote, nextQuoteNumber } from '../utils/roksalQuote';
import { loadRoksalPriceList, type RoksalPriceList } from '../data/roksalPrices';
import { PriceListEditor } from './PriceListEditor';
import type { Customer, RoksalQuote } from '../types';

export interface FenceConfiguratorApplyPayload {
  config: FenceConfiguration;
  construction: ConstructionResult;
  color: RoksalColor;
  quote: RoksalQuote;
}

interface FenceConfiguratorProps {
  onClose?: () => void;
  onApply?: (payload: FenceConfiguratorApplyPayload) => void;
  customer?: Customer;
  projectName?: string;
}

export function FenceConfigurator({ onClose, onApply, customer, projectName }: FenceConfiguratorProps) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<RoksalProfile | null>(null);
  const [selectedColor, setSelectedColor] = useState<RoksalColor | null>(null);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [fenceHeight, setFenceHeight] = useState(1000); // mm
  const [fenceLength, setFenceLength] = useState(3000); // mm
  const [boardSpacing, setBoardSpacing] = useState(20); // mm
  const [postSpacingInput, setPostSpacingInput] = useState(''); // mm, prazno = samodejno
  const [laborHours, setLaborHours] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [applyNotice, setApplyNotice] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  // Cenik, ki ga določita monter/vodstvo (💶 Cene) — naložen ob odprtju
  const [priceList, setPriceList] = useState<RoksalPriceList>(() => loadRoksalPriceList());
  const [showPriceEditor, setShowPriceEditor] = useState(false);

  // Handle natural language input
  const handleParseInput = useCallback(() => {
    if (!naturalLanguageInput.trim()) return;

    const result = parseFenceConfiguration(naturalLanguageInput);
    setParseResult(result);

    // Apply parsed values (pregradni sistemi, npr. KUBO, niso del ograjnega konfiguratorja)
    if (result.profileId) {
      const profile = getProfileById(result.profileId);
      if (profile && profile.kind !== 'partition') {
        setSelectedProfile(profile);
        // Set first available color for this profile
        if (profile.colors.length > 0) {
          setSelectedColor(profile.colors[0]);
        }
      }
    }
    if (result.colorId) {
      const color = Object.values(ROKSAL_COLORS).find(c => c.id === result.colorId);
      if (color) setSelectedColor(color);
    }
    if (result.orientation) setOrientation(result.orientation);
    if (result.fenceHeight) setFenceHeight(result.fenceHeight);
    if (result.fenceLength) setFenceLength(result.fenceLength);
    if (result.boardSpacing) setBoardSpacing(result.boardSpacing);

    // Validate configuration
    const validation = validateConfiguration(result);
    setValidationResult(validation);
  }, [naturalLanguageInput]);

  // Handle profile change
  const handleProfileChange = useCallback((profileId: string) => {
    const profile = getProfileById(profileId);
    if (profile) {
      setSelectedProfile(profile);
      // Reset color to first available for this profile
      if (profile.colors.length > 0) {
        setSelectedColor(profile.colors[0]);
      }
      // Check orientation compatibility
      if (profile.orientation === 'vertical') {
        setOrientation('vertical');
      } else if (profile.orientation === 'horizontal') {
        setOrientation('horizontal');
      }
    }
  }, []);

  // Razmak stebričkov iz vnosnega polja (prazno = samodejni izračun)
  const parsedPostSpacing = useMemo(() => {
    const trimmed = postSpacingInput.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return isFinite(value) && value > 0 ? value : undefined;
  }, [postSpacingInput]);

  // Skupna konfiguracija, ki jo uporabljata izračun in ponudba
  const config = useMemo<FenceConfiguration | null>(() => {
    if (!selectedProfile) return null;
    return {
      profile: selectedProfile,
      orientation,
      fenceHeight,
      fenceLength,
      boardSpacing,
      postSpacing: parsedPostSpacing,
      colorId: selectedColor?.id
    };
  }, [selectedProfile, orientation, fenceHeight, fenceLength, boardSpacing, parsedPostSpacing, selectedColor]);

  // Calculate construction using technical rules
  const construction = useMemo(() => {
    if (!config) return null;
    return calculateFenceConstruction(config);
  }, [config]);

  // Validate configuration
  const validation = useMemo(() => {
    if (!config) return null;
    return validateFenceConfiguration(config);
  }, [config]);

  // Osnutek ponudbe (številka se dodeli šele ob uporabi v projektu)
  const draftQuote = useMemo(() => {
    if (!config || !selectedColor || !construction) return null;
    return createRoksalQuote({
      customer: customer ?? { name: projectName ?? '' },
      configuration: config,
      construction,
      color: selectedColor,
      priceList,
      quoteNumber: 'OSNUTEK',
      laborHours,
      discountPercent
    });
  }, [config, selectedColor, construction, customer, projectName, laborHours, discountPercent, priceList]);

  const handleApply = useCallback(() => {
    if (!onApply || !config || !selectedColor || !construction) return;
    if (!construction.valid) {
      setApplyNotice('Konfiguracija ni veljavna - najprej odpravite napake.');
      return;
    }
    if (config.profile.kind === 'partition') {
      setApplyNotice('KUBO je pregradni sistem in ni del ograjnega projekta.');
      return;
    }
    const quote = createRoksalQuote({
      customer: customer ?? { name: projectName ?? '' },
      configuration: config,
      construction,
      color: selectedColor,
      priceList,
      quoteNumber: nextQuoteNumber(),
      laborHours,
      discountPercent
    });
    onApply({ config, construction, color: selectedColor, quote });
    setApplyNotice(`Ponudba ${quote.number} je pripravljena in shranjena v projekt (korak Predračun/Izvoz).`);
  }, [onApply, config, selectedColor, construction, customer, projectName, laborHours, discountPercent, priceList]);

  const examplePrompts = getExamplePrompts();

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      {showPriceEditor && (
        <PriceListEditor
          onClose={() => setShowPriceEditor(false)}
          onSaved={setPriceList}
        />
      )}
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">🏗️ Konfigurator WoodCore WPC Ograje</h2>
            <p className="text-xs text-slate-400 mt-1">
              Izberite profil, barvo in mere za vašo ograjo
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          )}
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-4">
            {/* Natural Language Input */}
            <div className="bg-slate-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                💬 Opišite želeno ograjo
              </h3>
              <textarea
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                placeholder="Npr. Želim prečno ograjo ROMB v barvi Amazon Wood, visoko 120 cm..."
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm h-24 resize-none"
              />
              <button
                onClick={handleParseInput}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium"
              >
                🔍 Razumi željo
              </button>

              {/* Parse Results */}
              {parseResult && (
                <div className="mt-3 space-y-2">
                  {parseResult.recognized.length > 0 && (
                    <div>
                      <p className="text-xs text-emerald-400 mb-1">✓ Prepoznano:</p>
                      <ul className="text-xs text-slate-300 space-y-1">
                        {parseResult.recognized.map((item: string, i: number) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {parseResult.warnings.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-400 mb-1">⚠ Opozorila:</p>
                      <ul className="text-xs text-slate-300 space-y-1">
                        {parseResult.warnings.map((warning: string, i: number) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Example Prompts */}
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-2">Primeri:</p>
                <div className="space-y-1">
                  {examplePrompts.slice(0, 3).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setNaturalLanguageInput(prompt)}
                      className="block text-left text-xs text-blue-400 hover:text-blue-300"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Manual Configuration */}
            <div className="bg-slate-900 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300">
                🔧 Ročna konfiguracija
              </h3>

              {/* Profile Selection */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Profil</label>
                <select
                  value={selectedProfile?.id || ''}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="">Izberite profil</option>
                  {ROKSAL_PROFILES.filter(profile => profile.kind !== 'partition').map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.width}×{profile.thickness}×{profile.length}mm)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  KUBO 80/42 je sistem za pregradne stene in se ureja ločeno (ni na voljo v ograjnem konfiguratorju).
                </p>
                {selectedProfile && (
                  <p className="text-xs text-slate-400 mt-1">{selectedProfile.notes}</p>
                )}
              </div>

              {/* Color Selection */}
              {selectedProfile && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Barva</label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProfile.colors.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color)}
                        className={`aspect-square rounded border-2 transition-all ${
                          selectedColor?.id === color.id
                            ? 'border-emerald-500 scale-110'
                            : 'border-slate-600 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  {selectedColor && (
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedColor.name}
                      {selectedColor.notes && ` - ${selectedColor.notes}`}
                    </p>
                  )}
                </div>
              )}

              {/* Orientation */}
              {selectedProfile && selectedProfile.orientation === 'both' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Orientacija</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrientation('vertical')}
                      className={`flex-1 px-3 py-2 rounded text-sm ${
                        orientation === 'vertical'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      Pokončno
                    </button>
                    <button
                      onClick={() => setOrientation('horizontal')}
                      className={`flex-1 px-3 py-2 rounded text-sm ${
                        orientation === 'horizontal'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      Prečno
                    </button>
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Višina: {fenceHeight}mm
                  </label>
                  <input
                    type="range"
                    min="800"
                    max="2000"
                    step="50"
                    value={fenceHeight}
                    onChange={(e) => setFenceHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Dolžina: {fenceLength}mm
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="100"
                    value={fenceLength}
                    onChange={(e) => setFenceLength(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Board Spacing */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Razmik med deskami: {boardSpacing}mm
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={boardSpacing}
                  onChange={(e) => setBoardSpacing(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Post Spacing (optional) */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Razmak stebričkov (mm) - prazno = samodejno
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={postSpacingInput}
                  onChange={(e) => setPostSpacingInput(e.target.value)}
                  placeholder={construction ? `samodejno (~${construction.actualPostSpacing}mm)` : 'samodejno'}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Dejanski razmak se enakomerno porazdeli po celotni dolžini.
                </p>
              </div>
            </div>

            {/* Validation Results */}
            {validation && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">
                  {validation.valid ? '✓ Konfiguracija je veljavna' : '✗ Napake v konfiguraciji'}
                </h3>
                {validation.errors.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-red-400 mb-1">Napake:</p>
                    <ul className="text-xs text-red-400 space-y-1">
                      {validation.errors.map((error: string, i: number) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.warnings.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-amber-400 mb-1">Opozorila:</p>
                    <ul className="text-xs text-amber-400 space-y-1">
                      {validation.warnings.map((warning: string, i: number) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {validation.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs text-blue-400 mb-1">Priporočila:</p>
                    <ul className="text-xs text-blue-400 space-y-1">
                      {validation.recommendations.map((rec: string, i: number) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Preview and Summary */}
          <div className="space-y-4">
            {/* Visual Preview */}
            <div className="bg-slate-900 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                👁️ Predogled
              </h3>
              <div className="aspect-video bg-slate-800 rounded flex items-center justify-center">
                {selectedProfile && selectedColor ? (
                  <div className="text-center">
                    <div
                      className="w-32 h-48 mx-auto mb-2 rounded"
                      style={{ backgroundColor: selectedColor.hex }}
                    />
                    <p className="text-xs text-slate-400">
                      {selectedProfile.name} - {selectedColor.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {orientation === 'vertical' ? 'Pokončno' : 'Prečno'}
                    </p>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    Izberite profil in barvo za predogled
                  </p>
                )}
              </div>
            </div>

            {/* Visual Construction Plan */}
            {construction && selectedProfile && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📐 Vizualni načrt montaže
                </h3>
                <div className="bg-slate-800 rounded p-3">
                  <svg
                    viewBox="0 0 400 200"
                    className="w-full h-auto"
                    style={{ maxHeight: '200px' }}
                  >
                    {/* Background */}
                    <rect x="0" y="0" width="400" height="200" fill="#1e293b" />
                    
                    {/* Ground line */}
                    <line x1="0" y1="180" x2="400" y2="180" stroke="#475569" strokeWidth="2" />
                    
                    {/* Posts */}
                    {Array.from({ length: construction.numberOfPosts }).map((_, i) => {
                      const x = 20 + (i * (360 / (construction.numberOfPosts - 1 || 1)));
                      return (
                        <g key={`post-${i}`}>
                          <rect
                            x={x - 3}
                            y="40"
                            width="6"
                            height="140"
                            fill="#64748b"
                            stroke="#94a3b8"
                            strokeWidth="1"
                          />
                          {/* Post label */}
                          {i === 0 && (
                            <text x={x} y="35" textAnchor="middle" fill="#94a3b8" fontSize="8">
                              Stebriček
                            </text>
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Beams (horizontal supports) */}
                    {orientation === 'vertical' && Array.from({ length: construction.numberOfBeams }).map((_, i) => {
                      const y = 50 + (i * (120 / (construction.numberOfBeams - 1 || 1)));
                      return (
                        <line
                          key={`beam-${i}`}
                          x1="20"
                          y1={y}
                          x2="380"
                          y2={y}
                          stroke="#64748b"
                          strokeWidth="3"
                        />
                      );
                    })}
                    
                    {/* Boards */}
                    {orientation === 'vertical' ? (
                      // Vertical boards
                      Array.from({ length: Math.min(construction.numberOfBoards, 20) }).map((_, i) => {
                        const x = 25 + (i * (350 / Math.min(construction.numberOfBoards, 20)));
                        return (
                          <rect
                            key={`board-${i}`}
                            x={x}
                            y="50"
                            width="8"
                            height="120"
                            fill={selectedColor?.hex || '#8b6f47'}
                            stroke="#475569"
                            strokeWidth="0.5"
                          />
                        );
                      })
                    ) : (
                      // Horizontal boards
                      Array.from({ length: Math.min(construction.numberOfBoards, 10) }).map((_, i) => {
                        const y = 50 + (i * (120 / Math.min(construction.numberOfBoards, 10)));
                        return (
                          <rect
                            key={`board-${i}`}
                            x="25"
                            y={y}
                            width="350"
                            height="8"
                            fill={selectedColor?.hex || '#8b6f47'}
                            stroke="#475569"
                            strokeWidth="0.5"
                          />
                        );
                      })
                    )}
                    
                    {/* Aluminum tube indicator for ROMB */}
                    {construction.requiresAluminumTube && (
                      <g>
                        <line
                          x1="20"
                          y1="110"
                          x2="380"
                          y2="110"
                          stroke="#fbbf24"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                        <text x="200" y="105" textAnchor="middle" fill="#fbbf24" fontSize="8">
                          ALU cev
                        </text>
                      </g>
                    )}
                    
                    {/* Screws indicator */}
                    {construction.screwType === 'visible' && (
                      <g>
                        {Array.from({ length: 5 }).map((_, i) => {
                          const x = 50 + (i * 70);
                          return (
                            <circle
                              key={`screw-${i}`}
                              cx={x}
                              cy="110"
                              r="2"
                              fill="#ef4444"
                            />
                          );
                        })}
                        <text x="200" y="130" textAnchor="middle" fill="#ef4444" fontSize="8">
                          Vidni vijaki
                        </text>
                      </g>
                    )}
                    
                    {/* Dimensions */}
                    <text x="200" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10">
                      Dolžina: {(fenceLength / 1000).toFixed(1)}m | Višina: {(fenceHeight / 1000).toFixed(1)}m
                    </text>
                  </svg>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Shematični prikaz - ni uradna tehnična risba
                  </p>
                </div>
              </div>
            )}

            {/* Construction Summary */}
            {construction && selectedProfile && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📊 Povzetek konstrukcije
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Število stebričkov:</span>
                    <span className="text-white font-medium">{construction.numberOfPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Razmak stebričkov:</span>
                    <span className={`font-medium ${construction.postSpacingValid ? 'text-emerald-400' : 'text-red-400'}`}>
                      {construction.actualPostSpacing}mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Število nosilcev:</span>
                    <span className="text-white font-medium">{construction.numberOfBeams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Število desk:</span>
                    <span className="text-white font-medium">{construction.numberOfBoards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Razmik med deskami:</span>
                    <span className={`font-medium ${construction.boardSpacingValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {construction.actualBoardSpacing}mm
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Skupna dolžina desk:</span>
                      <span className="text-white font-medium">
                        {(construction.totalBoardLength / 1000).toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Potrebnih profilov:</span>
                      <span className="text-white font-medium">
                        {construction.profilesNeeded} × {(construction.profileLength / 1000).toFixed(1)}m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Odpad:</span>
                      <span className="text-white font-medium">
                        {(construction.waste / 1000).toFixed(2)} m
                      </span>
                    </div>
                  </div>
                  {construction.requiresAluminumTube && (
                    <div className="bg-amber-900/30 border border-amber-700 rounded p-2 mt-2">
                      <p className="text-xs text-amber-200">
                        ⚠️ Potrebna aluminijasta cev za ROMB profil
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical Specifications */}
            {selectedProfile && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📋 Tehnične specifikacije
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mere profila:</span>
                    <span className="text-white">
                      {selectedProfile.width}×{selectedProfile.thickness}×{selectedProfile.length}mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max razmak stebrov:</span>
                    <span className="text-white">{selectedProfile.maxPostSpacing}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vijačenje:</span>
                    <span className="text-white">
                      {selectedProfile.screwVisible ? 'Vidno iz lica' : 'Skrito'}
                    </span>
                  </div>
                  {selectedProfile.hasAluminumTube && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Aluminijasta cev:</span>
                      <span className="text-emerald-400">✓ Da</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Orientacija:</span>
                    <span className="text-white">
                      {selectedProfile.orientation === 'vertical' ? 'Samo pokončno' :
                       selectedProfile.orientation === 'horizontal' ? 'Samo prečno' :
                       'Pokončno ali prečno'}
                    </span>
                  </div>
                  {selectedProfile.technicalNotes && selectedProfile.technicalNotes.length > 0 && (
                    <div className="border-t border-slate-700 pt-2 mt-2">
                      <p className="text-slate-400 mb-1">Tehnične opombe:</p>
                      <ul className="text-slate-300 space-y-1">
                        {selectedProfile.technicalNotes.map((note, i) => (
                          <li key={i} className="text-xs">• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Kosovnica in ponudba */}
            {draftQuote && construction && selectedProfile && selectedColor && (
              <div className="bg-slate-900 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    🧾 Kosovnica in ponudba
                  </h3>
                  <button
                    onClick={() => setShowPriceEditor(true)}
                    className="text-xs text-amber-300 hover:text-amber-200 shrink-0"
                    title="Vnesite svoje cene (veljajo za nove ponudbe)"
                  >
                    💶 Uredi cene
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left py-1 pr-2">Postavka</th>
                        <th className="text-right py-1 px-2">Kol.</th>
                        <th className="text-right py-1 px-2">Cena</th>
                        <th className="text-right py-1 pl-2">Skupaj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftQuote.items.map(item => (
                        <tr key={item.id} className="border-b border-slate-800">
                          <td className="py-1 pr-2 text-slate-300">{item.name}</td>
                          <td className="py-1 px-2 text-right text-slate-300">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-300">
                            {item.unitPrice.toFixed(2)} €
                          </td>
                          <td className="py-1 pl-2 text-right text-white">
                            {item.totalPrice.toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Delovne ure</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={laborHours}
                      onChange={(e) => setLaborHours(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Popust (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Material:</span>
                    <span className="text-white">{draftQuote.materialsSubtotal.toFixed(2)} €</span>
                  </div>
                  {draftQuote.labor && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Delo ({draftQuote.labor.hours}h × {draftQuote.labor.rate.toFixed(2)} €):
                      </span>
                      <span className="text-white">{draftQuote.labor.total.toFixed(2)} €</span>
                    </div>
                  )}
                  {draftQuote.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Popust ({draftQuote.discountPercent}%):</span>
                      <span className="text-emerald-400">-{draftQuote.discount.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">DDV ({(draftQuote.taxRate * 100).toFixed(0)}%):</span>
                    <span className="text-white">{draftQuote.tax.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                    <span className="text-slate-200 font-semibold">Skupaj z DDV:</span>
                    <span className="text-emerald-400 font-bold">{draftQuote.total.toFixed(2)} €</span>
                  </div>
                </div>

                {draftQuote.isDemoPrices ? (
                  <p className="text-xs text-amber-400 mt-2">
                    ⚠️ Uporabljene so privzete DEMO cene — kliknite »💶 Uredi cene« in vnesite svoje cene.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    Cenik: {priceList.label || priceList.version} (velja od {priceList.validFrom}).
                  </p>
                )}
                {(!construction.valid || selectedProfile.kind === 'partition') && (
                  <p className="text-xs text-red-400 mt-2">
                    {selectedProfile.kind === 'partition'
                      ? 'KUBO je pregradni sistem - ni del ograjnega projekta.'
                      : 'Konfiguracija ni veljavna - ponudbe ni mogoče uporabiti v projektu.'}
                  </p>
                )}
              </div>
            )}

            {/* Export Button */}
            {construction && selectedProfile && selectedColor && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📄 Uporaba konfiguracije
                </h3>
                {onApply && (
                  <button
                    onClick={handleApply}
                    disabled={!construction.valid || selectedProfile.kind === 'partition'}
                    className={`w-full px-4 py-3 rounded text-sm font-semibold transition-colors mb-3 ${
                      construction.valid && selectedProfile.kind !== 'partition'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    ✅ Uporabi v projektu in pripravi ponudbo
                  </button>
                )}
                {applyNotice && (
                  <p className="text-xs text-emerald-400 mb-3">{applyNotice}</p>
                )}
                <button
                  onClick={() => {
                    const exportData = {
                      timestamp: new Date().toISOString(),
                      profile: {
                        id: selectedProfile.id,
                        name: selectedProfile.name,
                        dimensions: `${selectedProfile.width}×${selectedProfile.thickness}×${selectedProfile.length}mm`
                      },
                      color: {
                        id: selectedColor.id,
                        name: selectedColor.name,
                        hex: selectedColor.hex
                      },
                      orientation: orientation === 'vertical' ? 'Pokončno' : 'Prečno',
                      dimensions: {
                        height: `${fenceHeight}mm`,
                        length: `${fenceLength}mm`
                      },
                      construction: {
                        numberOfPosts: construction.numberOfPosts,
                        postSpacing: `${construction.actualPostSpacing}mm`,
                        numberOfBeams: construction.numberOfBeams,
                        beamSpacing: `${construction.beamSpacing}mm`,
                        numberOfBoards: construction.numberOfBoards,
                        boardSpacing: `${construction.actualBoardSpacing}mm`,
                        totalBoardLength: `${(construction.totalBoardLength / 1000).toFixed(2)}m`,
                        profilesNeeded: construction.profilesNeeded,
                        profileLength: `${(construction.profileLength / 1000).toFixed(1)}m`,
                        waste: `${(construction.waste / 1000).toFixed(2)}m`
                      },
                      requirements: {
                        requiresAluminumTube: construction.requiresAluminumTube,
                        requiresBrackets: construction.requiresBrackets,
                        screwType: construction.screwType === 'visible' ? 'Vidno vijačenje' : 'Skrito vijačenje'
                      },
                      kosovnica: draftQuote?.items.map(item => ({
                        naziv: item.name,
                        kategorija: item.category,
                        kolicina: item.quantity,
                        enota: item.unit,
                        cena: item.unitPrice,
                        skupaj: item.totalPrice
                      })) || [],
                      skupniZnesek: draftQuote?.total ?? 0,
                      warnings: validation?.warnings || [],
                      notes: [
                        'HEX barve so približki za zaslonski prikaz',
                        'Za natančno ujemanje barv uporabite fizične vzorce',
                        'Cene in razpoložljivost preverite pri Roksalu',
                        'Ta konfiguracija ni uradni tehnični načrt'
                      ]
                    };
                    
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ograja-konfiguracija-${Date.now()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
                >
                  💾 Izvozi konfiguracijo (JSON)
                </button>
                <p className="text-xs text-slate-500 mt-2">
                  "Uporabi v projektu" shrani konfiguracijo in ponudbo v projekt (PDF v koraku Izvoz).
                  JSON izvoz je namenjen arhivu ali prenosu podatkov.
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
              <p className="text-xs text-blue-200">
                <strong>⚠️ Opomba:</strong> HEX barve so približki za zaslonski prikaz.
                Za natančno ujemanje barv uporabite fizične vzorce.
                Cene in razpoložljivost preverite pri Roksalu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
