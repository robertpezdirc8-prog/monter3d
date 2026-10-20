/**
 * Mera3D Pro - Fence Configurator Component
 * 
 * Interactive configurator for WoodCore WPC fences.
 * Supports natural language input and manual configuration.
 */

import { useState, useCallback, useMemo } from 'react';
import { ROKSAL_PROFILES, ROKSAL_COLORS, getProfileById, searchProfiles } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';
import { parseFenceConfiguration, validateConfiguration, getExamplePrompts } from '../utils/naturalLanguageParser';
import type { ParsedConfiguration } from '../utils/naturalLanguageParser';
import { calculateFenceConstruction, validateFenceConfiguration } from '../utils/fenceConstruction';
import { ConfiguratorInputs } from './configurator/ConfiguratorInputs';
import { ConfiguratorPlan } from './configurator/ConfiguratorPlan';
import { ConfiguratorSummary } from './configurator/ConfiguratorSummary';

interface FenceConfiguratorProps {
  onClose?: () => void;
  /** Prenese izbrano konfiguracijo v trenutni projekt (deskna konstrukcija). */
  onApply?: (result: {
    profileId: string;
    fenceHeightM: number;
    boardSpacingMm: number;
    orientation: 'vertical' | 'horizontal';
  }) => void;
}

export function FenceConfigurator({ onClose, onApply }: FenceConfiguratorProps) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<RoksalProfile | null>(null);
  const [selectedColor, setSelectedColor] = useState<RoksalColor | null>(null);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [fenceHeight, setFenceHeight] = useState(1000); // mm
  const [fenceLength, setFenceLength] = useState(3000); // mm
  const [boardSpacing, setBoardSpacing] = useState(20); // mm
  const [parseResult, setParseResult] = useState<ParsedConfiguration | null>(null);
  // FAZA 21: iskanje profila v katalogu
  const [profileQuery, setProfileQuery] = useState('');
  const filteredProfiles = searchProfiles(profileQuery);
  const [, setValidationResult] = useState<ReturnType<typeof validateConfiguration> | null>(null);

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

  // Calculate construction using technical rules
  const construction = useMemo(() => {
    if (!selectedProfile) return null;
    
    return calculateFenceConstruction({
      profile: selectedProfile,
      orientation,
      fenceHeight,
      fenceLength,
      boardSpacing
    });
  }, [selectedProfile, orientation, fenceHeight, fenceLength, boardSpacing]);

  // Validate configuration
  const validation = useMemo(() => {
    if (!selectedProfile) return null;
    
    return validateFenceConfiguration({
      profile: selectedProfile,
      orientation,
      fenceHeight,
      fenceLength,
      boardSpacing
    });
  }, [selectedProfile, orientation, fenceHeight, fenceLength, boardSpacing]);
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

            <ConfiguratorInputs
              profiles={filteredProfiles}
              totalProfiles={ROKSAL_PROFILES.length}
              profileQuery={profileQuery}
              onProfileQueryChange={setProfileQuery}
              selectedProfile={selectedProfile}
              onProfileChange={handleProfileChange}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              orientation={orientation}
              onOrientationChange={setOrientation}
              fenceHeight={fenceHeight}
              onFenceHeightChange={setFenceHeight}
              fenceLength={fenceLength}
              onFenceLengthChange={setFenceLength}
              boardSpacing={boardSpacing}
              onBoardSpacingChange={setBoardSpacing}
            />

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

            <ConfiguratorPlan
              construction={construction}
              profile={selectedProfile}
              color={selectedColor}
              orientation={orientation}
              fenceHeight={fenceHeight}
              fenceLength={fenceLength}
            />

            <ConfiguratorSummary
              construction={construction}
              profile={selectedProfile}
            />

            {/* Export Button */}
            {construction && selectedProfile && selectedColor && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📄 Izvoz konfiguracije
                </h3>
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
                  Izvozi podroben popis materiala in tehnične podatke
                </p>

                {/* FAZA 13: konfiguracijo lahko preneseš v trenutni projekt,
                    kjer se uporabi za izračun predračuna (deskna konstrukcija). */}
                {onApply && (
                  <>
                    <button
                      onClick={() => onApply({
                        profileId: selectedProfile.id,
                        fenceHeightM: fenceHeight / 1000,
                        boardSpacingMm: boardSpacing,
                        orientation,
                      })}
                      className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                    >
                      ✓ Uporabi v projektu
                    </button>
                    <p className="text-xs text-slate-500 mt-2">
                      Prenese profil, višino in razmik med deskami v konfiguracijo ograje
                      (korak Materiali), kjer se izračuna predračun.
                    </p>
                  </>
                )}
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
