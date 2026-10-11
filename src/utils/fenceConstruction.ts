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
  
  // Material calculations
  totalBoardLength: number; // mm
  profilesNeeded: number;
  profileLength: number; // mm
  waste: number; // mm
  
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
  const { profile, orientation, fenceHeight, fenceLength, boardSpacing } = config;
  const warnings: string[] = [];
  const errors: string[] = [];
  
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
  
  if (orientation === 'vertical') {
    // Vertical boards - calculate based on fence length
    // Use ceiling to ensure full coverage
    const totalBoardWidth = profile.width + boardSpacing;
    numberOfBoards = Math.ceil(fenceLength / totalBoardWidth);
    
    // Calculate actual spacing to fit exactly
    if (numberOfBoards === 1) {
      actualBoardSpacing = 0;
      uncoveredWidth = fenceLength - profile.width;
    } else {
      const totalBoardsWidth = numberOfBoards * profile.width;
      const totalSpacing = fenceLength - totalBoardsWidth;
      actualBoardSpacing = totalSpacing / (numberOfBoards - 1);
      uncoveredWidth = 0; // With ceiling, we should have full coverage
    }
  } else {
    // Horizontal boards - calculate based on fence height
    // Use ceiling to ensure full coverage
    const totalBoardWidth = profile.width + boardSpacing;
    numberOfBoards = Math.ceil(fenceHeight / totalBoardWidth);
    
    // Calculate actual spacing to fit exactly
    if (numberOfBoards === 1) {
      actualBoardSpacing = 0;
      uncoveredWidth = fenceHeight - profile.width;
    } else {
      const totalBoardsWidth = numberOfBoards * profile.width;
      const totalSpacing = fenceHeight - totalBoardsWidth;
      actualBoardSpacing = totalSpacing / (numberOfBoards - 1);
      uncoveredWidth = 0; // With ceiling, we should have full coverage
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
  
  // Calculate material
  const boardLength = orientation === 'vertical' ? fenceHeight : fenceLength;
  const totalBoardLength = numberOfBoards * boardLength;
  const profileLength = profile.length;
  const profilesNeeded = Math.ceil(totalBoardLength / profileLength);
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
    
    totalBoardLength,
    profilesNeeded,
    profileLength,
    waste: Math.round(waste),
    
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
