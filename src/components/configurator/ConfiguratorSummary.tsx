/**
 * ConfiguratorSummary.tsx — povzetek konstrukcije in tehnični podatki.
 * Izluščeno iz `FenceConfigurator.tsx`.
 */
import type { RoksalProfile } from '../../data/roksalCatalog';
import type { ConstructionResult } from '../../utils/fenceConstruction';
interface ConfiguratorSummaryProps {
  construction: ConstructionResult | null;
  profile: RoksalProfile | null;
}
export function ConfiguratorSummary({
  construction, profile,
}: ConfiguratorSummaryProps) {
  return (
    <>
            {construction && profile && (
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
            {profile && (
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  📋 Tehnične specifikacije
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mere profila:</span>
                    <span className="text-white">
                      {profile.width}×{profile.thickness}×{profile.length}mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max razmak stebrov:</span>
                    <span className="text-white">{profile.maxPostSpacing}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vijačenje:</span>
                    <span className="text-white">
                      {profile.screwVisible ? 'Vidno iz lica' : 'Skrito'}
                    </span>
                  </div>
                  {profile.hasAluminumTube && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Aluminijasta cev:</span>
                      <span className="text-emerald-400">✓ Da</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Orientacija:</span>
                    <span className="text-white">
                      {profile.orientation === 'vertical' ? 'Samo pokončno' :
                       profile.orientation === 'horizontal' ? 'Samo prečno' :
                       'Pokončno ali prečno'}
                    </span>
                  </div>
                  {profile.technicalNotes && profile.technicalNotes.length > 0 && (
                    <div className="border-t border-slate-700 pt-2 mt-2">
                      <p className="text-slate-400 mb-1">Tehnične opombe:</p>
                      <ul className="text-slate-300 space-y-1">
                        {profile.technicalNotes.map((note, i) => (
                          <li key={i} className="text-xs">• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
    </>
  );
}
