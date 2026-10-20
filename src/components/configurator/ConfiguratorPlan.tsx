/**
 * ConfiguratorPlan.tsx — vizualni načrt konstrukcije (stebri, nosilci, deske).
 * Izluščeno iz `FenceConfigurator.tsx`.
 */
import type { RoksalProfile, RoksalColor } from '../../data/roksalCatalog';
import type { ConstructionResult } from '../../utils/fenceConstruction';
interface ConfiguratorPlanProps {
  construction: ConstructionResult | null;
  profile: RoksalProfile | null;
  color: RoksalColor | null;
  orientation: 'vertical' | 'horizontal';
  fenceHeight: number;
  fenceLength: number;
}
export function ConfiguratorPlan({
  construction, profile, color, orientation, fenceHeight, fenceLength,
}: ConfiguratorPlanProps) {
  return (
    <>
            {construction && profile && (
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
                            fill={color?.hex || '#8b6f47'}
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
                            fill={color?.hex || '#8b6f47'}
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
    </>
  );
}
