/**
 * Mera3D Pro - Fence Construction Calculator
 * 
 * Calculates fence construction based on technical rules from Roksal.
 * Computes number of posts, beams, boards, and validates configuration.
 */

import type { RoksalProfile } from '../data/roksalCatalog';

export interface FenceConfiguration {
  profile: RoksalProfile;
  orientation: 'vertical' | 'horizontal';
  fenceHeight: number; // mm
  fenceLength: number; // mm
  boardSpacing: number; // mm
  postSpacing?: number; // mm - optional, calculated if not provided
  visibleWidth?: number; // mm - for profiles like 57/32 where you can choose visible side
}

export interface ConstructionResult {
  // Posts
  numberOfPosts: number;
  actualPostSpacing: number; // mm
  postSpacingValid: boolean;
  
  // Beams (horizontal supports)
  numberOfBeams: number;
  beamSpacing: number; // mm
  beamSpacingValid: boolean;
  
  // Boards
  numberOfBoards: number;
  actualBoardSpacing: number; // mm
  boardSpacingValid: boolean;
  effectiveWidth: number; // mm - actual visible width used
  
  // Material calculations
  totalBoardLength: number; // mm
  profilesNeeded: number;
  profileLength: number; // mm
  waste: number; // mm
  cutsPerProfile: number; // how many boards can be cut from one profile
  
  // Additional requirements
  requiresAluminumTube: boolean;
  requiresBrackets: boolean;
  screwType: 'visible' | 'hidden';
  
  // Validation
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Calculate fence construction based on configuration
 */
export function calculateFenceConstruction(config: FenceConfiguration): ConstructionResult {
  const { profile, orientation, fenceHeight, fenceLength, boardSpacing, visibleWidth } = config;
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check orientation compatibility
  if (profile.orientation === 'vertical' && orientation === 'horizontal') {
    errors.push(`Profil ${profile.name} je namenjen samo pokončni postavitvi`);
  } else if (profile.orientation === 'horizontal' && orientation === 'vertical') {
    errors.push(`Profil ${profile.name} je namenjen samo prečni postavitvi`);
  }
  
  // Determine effective board width
  const effectiveWidth = visibleWidth || profile.width;
  
  // Determine maximum post spacing based on fence height
  let maxPostSpacing = profile.maxPostSpacing;
  if (fenceHeight > 1500 && profile.maxPostSpacingHigh) {
    maxPostSpacing = profile.maxPostSpacingHigh;
    if (profile.maxPostSpacingLow !== profile.maxPostSpacingHigh) {
      warnings.push(`Za ograje nad 150cm je maksimalni razmak stebričkov ${profile.maxPostSpacingHigh}mm (namesto ${profile.maxPostSpacingLow}mm)`);
    }
  }
  
  // Calculate number of posts
  let numberOfPosts: number;
  let actualPostSpacing: number;
  
  if (config.postSpacing) {
    // User specified post spacing
    actualPostSpacing = config.postSpacing;
    numberOfPosts = Math.ceil(fenceLength / actualPostSpacing) + 1;
    
    if (actualPostSpacing > maxPostSpacing) {
      errors.push(`Razmak stebričkov (${actualPostSpacing}mm) presega maksimalni dovoljeni razmak (${maxPostSpacing}mm)`);
    }
  } else {
    // Calculate optimal post spacing
    numberOfPosts = Math.ceil(fenceLength / maxPostSpacing) + 1;
    actualPostSpacing = fenceLength / (numberOfPosts - 1);
  }
  
  const postSpacingValid = actualPostSpacing <= maxPostSpacing;
  
  // Calculate beams (horizontal supports)
  const maxBeamSpacing = orientation === 'vertical' 
    ? profile.maxBeamSpacing 
    : profile.maxPostSpacing; // For horizontal boards, beams are at post spacing
  
  let numberOfBeams: number;
  let beamSpacing: number;
  
  if (orientation === 'vertical') {
    // Vertical boards need horizontal beams
    numberOfBeams = Math.ceil(fenceHeight / maxBeamSpacing) + 1;
    beamSpacing = fenceHeight / (numberOfBeams - 1);
  } else {
    // Horizontal boards - beams are at post positions
    numberOfBeams = numberOfPosts;
    beamSpacing = actualPostSpacing;
  }
  
  const beamSpacingValid = beamSpacing <= maxBeamSpacing;
  
  if (beamSpacing > maxBeamSpacing) {
    errors.push(`Razmak nosilcev (${beamSpacing}mm) presega maksimalni dovoljeni razmak (${maxBeamSpacing}mm)`);
  }
  
  // Calculate boards - ensure full coverage without gaps
  let numberOfBoards: number;
  let actualBoardSpacing: number;
  let uncoveredWidth: number = 0;
  const totalDimension = orientation === 'vertical' ? fenceLength : fenceHeight;
  
  // Calculate how many boards we need
  const totalBoardWidth = effectiveWidth + boardSpacing;
  numberOfBoards = Math.ceil(totalDimension / totalBoardWidth);
  
  // Calculate actual spacing to fit exactly
  if (numberOfBoards === 1) {
    actualBoardSpacing = 0;
    uncoveredWidth = totalDimension - effectiveWidth;
  } else {
    const totalBoardsWidth = numberOfBoards * effectiveWidth;
    const totalSpacing = totalDimension - totalBoardsWidth;
    actualBoardSpacing = totalSpacing / (numberOfBoards - 1);
    
    // Check if spacing is negative (impossible configuration)
    if (actualBoardSpacing < 0) {
      errors.push(`Konfiguracija ni mogoča: ${numberOfBoards} desk širine ${effectiveWidth}mm ne more pokriti ${totalDimension}mm z negativnim razmikom`);
      actualBoardSpacing = 0;
      uncoveredWidth = totalDimension - (numberOfBoards * effectiveWidth);
    } else {
      uncoveredWidth = 0;
    }
  }
  
  const boardSpacingValid = actualBoardSpacing >= profile.minBoardSpacing && 
                            actualBoardSpacing <= profile.maxBoardSpacing;
  
  if (uncoveredWidth > 0) {
    errors.push(`Ograja ne more biti popolnoma pokrita. Nepokrita širina: ${uncoveredWidth}mm`);
  }
  
  if (actualBoardSpacing < profile.minBoardSpacing && numberOfBoards > 1) {
    warnings.push(`Razmik med deskami (${actualBoardSpacing.toFixed(1)}mm) je manjši od minimalnega (${profile.minBoardSpacing}mm)`);
  } else if (actualBoardSpacing > profile.maxBoardSpacing && numberOfBoards > 1) {
    warnings.push(`Razmik med deskami (${actualBoardSpacing.toFixed(1)}mm) je večji od maksimalnega (${profile.maxBoardSpacing}mm)`);
  }
  
  // Calculate material with cutting plan
  const boardLength = orientation === 'vertical' ? fenceHeight : fenceLength;
  const totalBoardLength = numberOfBoards * boardLength;
  const profileLength = profile.length;
  
  // Simple cutting plan: how many boards of boardLength can we cut from one profile?
  const cutsPerProfile = Math.floor(profileLength / boardLength);
  
  // Calculate how many profiles we need
  let profilesNeeded: number;
  if (cutsPerProfile === 0) {
    // Board is longer than profile - need special handling
    profilesNeeded = numberOfBoards;
    warnings.push(`Posamezna deska (${boardLength}mm) je daljša od profila (${profileLength}mm). Potrebno spajanje.`);
  } else {
    profilesNeeded = Math.ceil(numberOfBoards / cutsPerProfile);
  }
  
  const waste = (profilesNeeded * profileLength) - totalBoardLength;
  
  // Additional requirements
  const requiresAluminumTube = profile.requiresAluminumTube;
  const requiresBrackets = profile.id === 'romb-deska-67'; // ROMB needs brackets
  const screwType = profile.screwVisible ? 'visible' : 'hidden';
  
  // Validation
  const valid = errors.length === 0;
  
  // Add warnings for specific profiles
  if (requiresAluminumTube) {
    warnings.push('⚠️ ROMB DESKA zahteva aluminijasto cev - montaža brez nje NI mogoča');
  }
  
  if (requiresBrackets) {
    warnings.push('Za ROMB DESKO so potrebni ustrezni kotniki levo in desno na stebričkih');
  }
  
  if (profile.screwVisible) {
    warnings.push(`Vijačenje je vidno iz ${profile.screwSide === 'front' ? 'sprednje' : 'zadnje'} strani`);
  }
  
  return {
    numberOfPosts,
    actualPostSpacing: Math.round(actualPostSpacing),
    postSpacingValid,
    
    numberOfBeams,
    beamSpacing: Math.round(beamSpacing),
    beamSpacingValid,
    
    numberOfBoards,
    actualBoardSpacing: Math.round(actualBoardSpacing),
    boardSpacingValid,
    effectiveWidth,
    
    totalBoardLength,
    profilesNeeded,
    profileLength,
    waste: Math.round(waste),
    cutsPerProfile,
    
    requiresAluminumTube,
    requiresBrackets,
    screwType,
    
    valid,
    warnings,
    errors
  };
}

/**
 * Validate fence configuration against technical rules
 */
export function validateFenceConfiguration(config: FenceConfiguration): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const result = calculateFenceConstruction(config);
  const recommendations: string[] = [];
  
  // Add recommendations
  if (result.actualBoardSpacing < config.profile.recommendedBoardSpacing * 0.8) {
    recommendations.push(`Razmik med deskami je manjši od priporočenega (${config.profile.recommendedBoardSpacing}mm). Razmislite o večjem razmiku za boljši videz.`);
  }
  
  if (result.actualPostSpacing < config.profile.maxPostSpacing * 0.5) {
    recommendations.push(`Razmak stebričkov je zelo majhen. Razmislite o večjem razmaku za prihranek materiala.`);
  }
  
  if (config.fenceHeight > 1800) {
    recommendations.push(`Višina ograje (${config.fenceHeight}mm) je zelo velika. Preverite lokalne gradbene predpise.`);
  }
  
  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
    recommendations
  };
}
