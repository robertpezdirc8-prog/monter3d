/**
 * Začetna konfiguracija vizualizatorja.
 *
 * Vizualizator se odpre iz ponudbe ali načrta, zato naj začne s profilom,
 * barvo, orientacijo in višino, ki so že izbrani v projektu. Če kaj manjka
 * ali ni na voljo za izbrani profil, se uporabi varna privzeta vrednost.
 */

import {
  getVerticalProfiles,
  getHorizontalProfiles,
  type RoksalProfile,
  type RoksalColor
} from '../data/roksalCatalog';

export const MIN_FENCE_HEIGHT_MM = 800;
export const MAX_FENCE_HEIGHT_MM = 2000;
export const FENCE_HEIGHT_STEP_MM = 50;

export interface FenceVisualizerInitialConfig {
  profileId?: string;
  colorId?: string;
  orientation?: 'vertical' | 'horizontal';
  boardSpacingMm?: number;
  fenceHeightMm?: number;
}

export interface ResolvedFenceVisualizerConfig {
  profile: RoksalProfile;
  color: RoksalColor;
  orientation: 'vertical' | 'horizontal';
  boardSpacing: number;
  fenceHeight: number;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Ograjni profili za orientacijo; pregradni sistemi (KUBO) so izključeni. */
export function getFenceProfiles(orientation: 'vertical' | 'horizontal'): RoksalProfile[] {
  const profiles = orientation === 'vertical' ? getVerticalProfiles() : getHorizontalProfiles();
  return profiles.filter(profile => profile.kind !== 'partition');
}

export function resolveFenceVisualizerConfig(
  initial?: FenceVisualizerInitialConfig
): ResolvedFenceVisualizerConfig {
  const orientation = initial?.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const profiles = getFenceProfiles(orientation);
  const requestedProfile = initial?.profileId
    ? profiles.find(profile => profile.id === initial.profileId)
    : undefined;
  const profile = requestedProfile ?? profiles[0];

  const requestedColor = initial?.colorId
    ? profile.colors.find(color => color.id === initial.colorId)
    : undefined;
  const color = requestedColor ?? profile.colors[0];

  const requestedSpacing = initial?.boardSpacingMm ?? profile.recommendedBoardSpacing;
  const boardSpacing = Math.round(
    clamp(requestedSpacing, profile.minBoardSpacing, profile.maxBoardSpacing)
  );

  const requestedHeight = initial?.fenceHeightMm ?? 1000;
  const clampedHeight = clamp(requestedHeight, MIN_FENCE_HEIGHT_MM, MAX_FENCE_HEIGHT_MM);
  const fenceHeight = Math.round(clampedHeight / FENCE_HEIGHT_STEP_MM) * FENCE_HEIGHT_STEP_MM;

  return { profile, color, orientation, boardSpacing, fenceHeight };
}
