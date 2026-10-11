/**
 * Mera3D Pro - Fence Configurator Component
 * 
 * Interactive configurator for WoodCore WPC fences.
 * Supports natural language input and manual configuration.
 */

import { useState, useCallback } from 'react';
import { ROKSAL_PROFILES, ROKSAL_COLORS, getProfileById } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';
import { parseFenceConfiguration, validateConfiguration, getExamplePrompts } from '../utils/naturalLanguageParser';

interface FenceConfiguratorProps {
  onClose?: () => void;
}

export function FenceConfigurator({ onClose }: FenceConfiguratorProps) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<RoksalProfile | null>(null);
  const [selectedColor, setSelectedColor] = useState<RoksalColor | null>(null);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [fenceHeight, setFenceHeight] = useState(1000); // mm
  const [fenceLength, setFenceLength] = useState(3000); // mm
  const [boardSpacing, setBoardSpacing] = useState(20); // mm
  const [parseResult, setParseResult] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Handle natural language input
  const handleParseInput = useCallback(() => {
    if (!naturalLanguageInput.trim()) return;

    const result = parseFenceConfiguration(naturalLanguageInput);
    setParseResult(result);

    // Apply parsed values
    if (result.profileId) {
      const profile = getProfileById(result.profileId);
      if (profile) {
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

  // Calculate number of boards
  const calculateBoards = () => {
    if (!selectedProfile) return 0;
    
    const boardWidth = selectedProfile.width;
    const totalWidth = orientation === 'vertical' ? fenceLength : fenceHeight;
    const boardCount = Math.floor(totalWidth / (boardWidth + boardSpacing));
    
    return boardCount;
  };

  // Calculate estimated material
  const calculateMaterial = () => {
    if (!selectedProfile) return null;

    const boardCount = calculateBoards();
    const boardLength = orientation === 'vertical' ? fenceHeight : fenceLength;
    const totalLength = boardCount * boardLength;
    const profileLength = selectedProfile.length;
    const profilesNeeded = Math.ceil(totalLength / profileLength);

    return {
      boards: boardCount,
      totalLength: totalLength,
      profilesNeeded: profilesNeeded,
      waste: (profilesNeeded * profileLength) - totalLength
    };
  };

  const material = calculateMaterial();
  const examplePrompts = getExamplePrompts();

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
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
                  {ROKSAL_PROFILES.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.width}×{profile.thickness}×{profile.length}mm)
                    </option>
                  ))}
                </select>
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
            </div>

            {/* Validation Results */}
            {validationResult && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-2">
                  {validationResult.valid ? '✓ Konfiguracija je veljavna' : '✗ Napake v konfiguraciji'}
                </h3>
                {validationResult.errors.length > 0 && (
                  <ul className="text-xs text-red-400 space-y-1">
                    {validationResult.errors.map((error: string, i: number) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                )}
                {validationResult.warnings.length > 0 && (
                  <ul className="text-xs text-amber-400 space-y-1 mt-2">
                    {validationResult.warnings.map((warning: string, i: number) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
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

            {/* Material Summary */}
            {material && selectedProfile && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📊 Povzetek materiala
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Število desk:</span>
                    <span className="text-white font-medium">{material.boards}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Skupna dolžina:</span>
                    <span className="text-white font-medium">
                      {(material.totalLength / 1000).toFixed(2)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Potrebnih profilov:</span>
                    <span className="text-white font-medium">
                      {material.profilesNeeded} × {(selectedProfile.length / 1000).toFixed(1)}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Odpad:</span>
                    <span className="text-white font-medium">
                      {(material.waste / 1000).toFixed(2)} m
                    </span>
                  </div>
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
                    <span className="text-white">{selectedProfile.maxSpacing}mm</span>
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
                </div>
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
