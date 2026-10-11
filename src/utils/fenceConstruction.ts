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
  
  // Validate input parameters
  if (!isFinite(fenceHeight) || fenceHeight <= 0) {
    errors.push(`Neveljavna višina ograje: ${fenceHeight}mm`);
  }
  
  if (!isFinite(fenceLength) || fenceLength <= 0) {
    errors.push(`Neveljavna dolžina ograje: ${fenceLength}mm`);
  }
  
  if (!isFinite(boardSpacing) || boardSpacing < 0) {
    errors.push(`Neveljaven razmik med deskami: ${boardSpacing}mm`);
  }
  
  if (visibleWidth !== undefined && (!isFinite(visibleWidth) || visibleWidth <= 0)) {
    errors.push(`Neveljavna vidna širina: ${visibleWidth}mm`);
  }
  
  if (config.postSpacing !== undefined) {
    if (!isFinite(config.postSpacing) || config.postSpacing <= 0) {
      errors.push(`Neveljaven razmak stebričkov: ${config.postSpacing}mm`);
    }
  }
  
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
    // User specified post spacing - calculate exact number of posts needed
    // Number of posts = number of spans + 1
    // For fenceLength = 3000, postSpacing = 1000: spans = 3, posts = 4
    // For fenceLength = 3500, postSpacing = 1000: spans = 4, posts = 5 (actual spacing = 875)
    // For fenceLength = 5800, postSpacing = 1000: spans = 6, posts = 7 (actual spacing = 966.67)
    const numberOfSpans = Math.ceil(fenceLength / config.postSpacing);
    numberOfPosts = numberOfSpans + 1;
    actualPostSpacing = fenceLength / numberOfSpans;
    
    if (actualPostSpacing > maxPostSpacing) {
      errors.push(`Razmak stebričkov (${actualPostSpacing.toFixed(1)}mm) presega maksimalni dovoljeni razmak (${maxPostSpacing}mm)`);
    }
  } else {
    // Calculate optimal post spacing - minimize number of posts while staying within max
    const numberOfSpans = Math.ceil(fenceLength / maxPostSpacing);
    numberOfPosts = numberOfSpans + 1;
    actualPostSpacing = fenceLength / numberOfSpans;
  }
  
  const postSpacingValid = actualPostSpacing <= maxPostSpacing;
  
  // ROMB 67 specific rules for horizontal orientation
  // NOTE: These rules are based on general industry practice, not confirmed by official Roksal documentation
  if (profile.id === 'romb-deska-67' && orientation === 'horizontal') {
    warnings.push('⚠️ ROMB 67 horizontalna pravila NISO uradno potrjena s strani Roksal - preverite tehnično dokumentacijo');
    
    if (actualPostSpacing > 1450 && actualPostSpacing < 1800) {
      // This range MAY be acceptable with additional reinforcement/connection
      // But this is NOT confirmed by Roksal - mark as unverified
      warnings.push(`ROMB 67: Razmak stebričkov ${actualPostSpacing.toFixed(0)}mm je med 1450mm in 1800mm - morda potrebna dodatna povezava (NEPOTRJENO)`);
    } else if (actualPostSpacing >= 1800) {
      // This definitely exceeds safe limits
      errors.push(`ROMB 67: Razmak stebričkov ${actualPostSpacing.toFixed(0)}mm presega 1800mm - potreben dodaten stebriček`);
    }
  }
  
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
  
  // Calculate boards - find valid solution with spacing in allowed range
  let numberOfBoards: number = 0;
  let actualBoardSpacing: number = 0;
  let uncoveredWidth: number = 0;
  const totalDimension = orientation === 'vertical' ? fenceLength : fenceHeight;
  
  // Validate input dimensions
  if (!isFinite(totalDimension) || totalDimension <= 0) {
    errors.push(`Neveljavna dimenzija ograje: ${totalDimension}mm`);
  }
  
  if (!isFinite(effectiveWidth) || effectiveWidth <= 0) {
    errors.push(`Neveljavna širina deske: ${effectiveWidth}mm`);
  }
  
  // Find valid number of boards with spacing in allowed range
  let solutionFound = false;
  
  // Special case: single board that fits exactly or with small gap
  if (totalDimension <= effectiveWidth) {
    // One board is enough
    numberOfBoards = 1;
    actualBoardSpacing = 0;
    uncoveredWidth = totalDimension - effectiveWidth;
    if (uncoveredWidth < 0) uncoveredWidth = 0;
    solutionFound = true;
  } else {
    // P0-2: Find BEST solution that matches user's requested spacing
    // First, calculate ideal number of boards for requested spacing
    const idealBoardWidth = effectiveWidth + boardSpacing;
    const idealNumberOfBoards = Math.round(totalDimension / idealBoardWidth);
    
    // Try different numbers of boards to find one that gives valid spacing
    // Start from minimum possible boards and go up
    const minPossibleBoards = Math.max(2, Math.ceil(totalDimension / (effectiveWidth + profile.maxBoardSpacing)));
    const maxPossibleBoards = Math.floor((totalDimension + profile.maxBoardSpacing) / (effectiveWidth + profile.minBoardSpacing));
    
    // Find ALL valid solutions and pick the one closest to requested spacing
    let bestSolution: { n: number; spacing: number; deviation: number } | null = null;
    
    for (let n = minPossibleBoards; n <= maxPossibleBoards; n++) {
      const totalBoardsWidth = n * effectiveWidth;
      const remainingSpace = totalDimension - totalBoardsWidth;
      
      if (remainingSpace < 0) continue; // Too many boards
      
      // Calculate spacing between boards
      const spacing = remainingSpace / (n - 1);
      
      if (spacing >= profile.minBoardSpacing && spacing <= profile.maxBoardSpacing) {
        // Calculate how far this spacing is from requested spacing
        const deviation = Math.abs(spacing - boardSpacing);
        
        // Keep the solution with smallest deviation
        if (!bestSolution || deviation < bestSolution.deviation) {
          bestSolution = { n, spacing, deviation };
        }
      }
    }
    
    // Use best solution if found
    if (bestSolution) {
      numberOfBoards = bestSolution.n;
      actualBoardSpacing = bestSolution.spacing;
      uncoveredWidth = 0;
      solutionFound = true;
    }
  }
  
  // If no solution found with preferred spacing, try with user's requested spacing
  // For single board, allow boardSpacing = 0 even if it's less than minBoardSpacing
  const canUseRequestedSpacing = numberOfBoards === 1 || 
                                  (boardSpacing >= profile.minBoardSpacing && boardSpacing <= profile.maxBoardSpacing);
  
  if (!solutionFound && canUseRequestedSpacing) {
    const totalBoardWidth = effectiveWidth + boardSpacing;
    // Use round instead of ceil to find closest fit
    numberOfBoards = Math.round(totalDimension / totalBoardWidth);
    
    // Ensure at least 1 board
    if (numberOfBoards < 1) numberOfBoards = 1;
    
    if (numberOfBoards === 1) {
      actualBoardSpacing = 0;
      uncoveredWidth = totalDimension - effectiveWidth;
      if (uncoveredWidth < 0) uncoveredWidth = 0;
      solutionFound = true;
    } else {
      const totalBoardsWidth = numberOfBoards * effectiveWidth;
      const totalSpacing = totalDimension - totalBoardsWidth;
      actualBoardSpacing = totalSpacing / (numberOfBoards - 1);
      
      if (actualBoardSpacing < 0) {
        // Too many boards - try one less
        numberOfBoards = numberOfBoards - 1;
        if (numberOfBoards === 1) {
          actualBoardSpacing = 0;
          uncoveredWidth = totalDimension - effectiveWidth;
          if (uncoveredWidth < 0) uncoveredWidth = 0;
        } else {
          const newTotalBoardsWidth = numberOfBoards * effectiveWidth;
          const newTotalSpacing = totalDimension - newTotalBoardsWidth;
          actualBoardSpacing = newTotalSpacing / (numberOfBoards - 1);
          if (actualBoardSpacing < 0) {
            errors.push(`Konfiguracija ni mogoča: ${numberOfBoards} desk širine ${effectiveWidth}mm ne more pokriti ${totalDimension}mm z negativnim razmikom`);
            actualBoardSpacing = 0;
            uncoveredWidth = totalDimension - (numberOfBoards * effectiveWidth);
          } else {
            uncoveredWidth = 0;
          }
        }
      } else {
        uncoveredWidth = 0;
      }
      solutionFound = true;
    }
  }
  
  // If still no solution, report error
  if (!solutionFound && numberOfBoards === 0) {
    errors.push(`Ni mogoče najti veljavne konfiguracije desk za dolžino ${totalDimension}mm z širino deske ${effectiveWidth}mm in razmikom ${profile.minBoardSpacing}-${profile.maxBoardSpacing}mm`);
    numberOfBoards = Math.ceil(totalDimension / (effectiveWidth + boardSpacing));
    actualBoardSpacing = 0;
    uncoveredWidth = totalDimension - (numberOfBoards * effectiveWidth);
  }
  
  // For single board, spacing validation is not needed
  const boardSpacingValid = numberOfBoards === 1 || 
                            (actualBoardSpacing >= profile.minBoardSpacing && 
                             actualBoardSpacing <= profile.maxBoardSpacing);
  
  if (uncoveredWidth > 0) {
    errors.push(`Ograja ne more biti popolnoma pokrita. Nepokrita širina: ${uncoveredWidth}mm`);
  }
  
  // Only check spacing for multiple boards
  if (numberOfBoards > 1) {
    if (actualBoardSpacing < profile.minBoardSpacing) {
      errors.push(`Razmik med deskami (${actualBoardSpacing.toFixed(1)}mm) je manjši od minimalnega (${profile.minBoardSpacing}mm)`);
    } else if (actualBoardSpacing > profile.maxBoardSpacing) {
      errors.push(`Razmik med deskami (${actualBoardSpacing.toFixed(1)}mm) je večji od maksimalnega (${profile.maxBoardSpacing}mm)`);
    }
  }
  
  // Calculate material with cutting plan
  const boardLength = orientation === 'vertical' ? fenceHeight : fenceLength;
  const totalBoardLength = numberOfBoards * boardLength;
  const profileLength = profile.length;
  
  // P0-7: Validate all dimensions before calculations
  if (!isFinite(boardLength) || boardLength <= 0) {
    errors.push(`Neveljavna dolžina deske: ${boardLength}mm`);
  }
  if (!isFinite(profileLength) || profileLength <= 0) {
    errors.push(`Neveljavna dolžina profila: ${profileLength}mm`);
  }
  
  // Saw blade width (typical value for circular saw)
  const sawBladeWidth = 3; // mm - width of cut
  
  // Calculate how many boards can be cut from one profile
  // Account for saw blade width between cuts
  let cutsPerProfile: number;
  if (boardLength > profileLength) {
    // Board is longer than profile - need special handling
    cutsPerProfile = 0;
  } else if (!isFinite(boardLength) || boardLength <= 0 || !isFinite(profileLength) || profileLength <= 0) {
    // Invalid dimensions - cannot calculate
    cutsPerProfile = 0;
    errors.push(`Ni mogoče izračunati rezanja zaradi neveljavnih dimenzij`);
  } else {
    // Calculate considering saw blade width
    // First cut doesn't need extra space, subsequent cuts need sawBladeWidth
    const divisor = boardLength + sawBladeWidth;
    if (divisor <= 0 || !isFinite(divisor)) {
      cutsPerProfile = 0;
      errors.push(`Neveljaven delitelj pri izračunu rezanja`);
    } else {
      cutsPerProfile = Math.floor((profileLength + sawBladeWidth) / divisor);
      // Ensure cutsPerProfile is at least 0
      if (!isFinite(cutsPerProfile) || cutsPerProfile < 0) {
        cutsPerProfile = 0;
      }
    }
  }
  
  // Calculate how many profiles we need
  let profilesNeeded: number;
  if (cutsPerProfile === 0) {
    // Board is longer than profile or invalid calculation
    profilesNeeded = numberOfBoards;
  } else {
    profilesNeeded = Math.ceil(numberOfBoards / cutsPerProfile);
  }
  
  // P0-7: Ensure all calculated values are finite
  if (!isFinite(profilesNeeded) || profilesNeeded < 0) {
    profilesNeeded = numberOfBoards; // Fallback
    errors.push(`Neveljaven izračun števila profilov`);
  }
  
  // Calculate waste (material that cannot be used)
  // P0-8: Waste should never be negative - if it is, there's a calculation error
  let waste = (profilesNeeded * profileLength) - totalBoardLength;
  
  if (waste < 0) {
    // This indicates a serious calculation error
    errors.push(`KRITIČNA NAPAKA: Izračun odpada je negativen (${waste.toFixed(1)}mm). Preverite dimenzije in število profilov.`);
    waste = 0; // Set to 0 to prevent invalid output
  }
  
  // P0-8: If boards need to be joined (longer than profile), add clear warning
  if (boardLength > profileLength) {
    warnings.push(`⚠️ DESKE ZAJEDAJAJO: Posamezna deska (${boardLength}mm) je daljša od profila (${profileLength}mm).`);
    warnings.push(`Potrebno je spajanje desk - TA IZRAČUN NI ŠE POTRJEN in zahteva dodatno validacijo.`);
    warnings.push(`Kontaktirajte tehnično podporo za potrjen načrt spojev.`);
  }
  
  // Additional requirements
  // P0-6: Aluminum tube requirement should be based on actual span, not just static flag
  let requiresAluminumTube = profile.requiresAluminumTube;
  
  // For KUBO profile, check if actual beam spacing exceeds safe limit without reinforcement
  if (profile.id === 'kubo-80-42') {
    const maxSpanWithoutTube = 1200; // mm - KUBO can span up to 1200mm without aluminum tube
    if (orientation === 'vertical' && beamSpacing > maxSpanWithoutTube) {
      requiresAluminumTube = true;
      warnings.push(`KUBO: Razmak nosilcev (${beamSpacing.toFixed(0)}mm) presega ${maxSpanWithoutTube}mm - potrebna aluminijasta ojačitev`);
    } else if (orientation === 'horizontal' && actualPostSpacing > maxSpanWithoutTube) {
      requiresAluminumTube = true;
      warnings.push(`KUBO: Razmak stebričkov (${actualPostSpacing.toFixed(0)}mm) presega ${maxSpanWithoutTube}mm - potrebna aluminijasta ojačitev`);
    }
  }
  
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
    actualBoardSpacing: Math.round(actualBoardSpacing * 100) / 100,
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
