/**
 * ConfiguratorInputs.tsx — ročna konfiguracija ograje (profil, barva, orientacija,
 * mere, razmik med deskami). Izluščeno iz `FenceConfigurator.tsx`.
 */
import type { RoksalProfile, RoksalColor } from '../../data/roksalCatalog';
interface ConfiguratorInputsProps {
  profiles: RoksalProfile[];
  totalProfiles: number;
  profileQuery: string;
  onProfileQueryChange: (value: string) => void;
  selectedProfile: RoksalProfile | null;
  onProfileChange: (profileId: string) => void;
  selectedColor: RoksalColor | null;
  onColorChange: (color: RoksalColor) => void;
  orientation: 'vertical' | 'horizontal';
  onOrientationChange: (value: 'vertical' | 'horizontal') => void;
  fenceHeight: number;
  onFenceHeightChange: (value: number) => void;
  fenceLength: number;
  onFenceLengthChange: (value: number) => void;
  boardSpacing: number;
  onBoardSpacingChange: (value: number) => void;
}
export function ConfiguratorInputs({
  profiles, totalProfiles, profileQuery, onProfileQueryChange,
  selectedProfile, onProfileChange, selectedColor, onColorChange,
  orientation, onOrientationChange,
  fenceHeight, onFenceHeightChange, fenceLength, onFenceLengthChange,
  boardSpacing, onBoardSpacingChange,
}: ConfiguratorInputsProps) {
  return (
    <>
            <div className="bg-slate-900 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300">
                🔧 Ročna konfiguracija
              </h3>

              {/* Profile Selection */}
              <div>
                <label htmlFor="config-profile-search" className="text-xs text-slate-400 mb-1 block">
                  Profil (iskanje)
                </label>
                <input
                  id="config-profile-search"
                  type="search"
                  value={profileQuery}
                  onChange={e => onProfileQueryChange(e.target.value)}
                  placeholder="npr. polna, 100, 1500"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-white text-sm mb-2"
                />
                <select
                  value={selectedProfile?.id || ''}
                  onChange={(e) => onProfileChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                  aria-label="Izberite profil"
                >
                  <option value="">Izberite profil</option>
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} ({profile.width}×{profile.thickness}×{profile.length}mm)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Prikazanih {profiles.length} od {totalProfiles} profilov
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
                        onClick={() => onColorChange(color)}
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
                      onClick={() => onOrientationChange('vertical')}
                      className={`flex-1 px-3 py-2 rounded text-sm ${
                        orientation === 'vertical'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      Pokončno
                    </button>
                    <button
                      onClick={() => onOrientationChange('horizontal')}
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
                    onChange={(e) => onFenceHeightChange(Number(e.target.value))}
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
                    onChange={(e) => onFenceLengthChange(Number(e.target.value))}
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
                  onChange={(e) => onBoardSpacingChange(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
    </>
  );
}
