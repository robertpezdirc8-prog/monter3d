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
  colorId?: string; // optional - validated against profile.colors
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

  // Količine za kosovnico (BOM)
  numberOfProfilePieces: number; // število naročenih profilov
  totalProfileLengthM: number; // skupna naročena dolžina profilov v m
  boardLengthMm: number; // dolžina ene deske v mm
  aluminumTubeLengthM: number; // potrebna ALU cev v m (0, če ni potrebna)
  numberOfBrackets: number;
  numberOfScrews: number;
  numberOfEndCaps: number;

  // Validation
  valid: boolean;
  warnings: string[];
  errors: string[];
}

const EPS = 1e-6;

/**
 * Poišče razporeditev desk, ki se čim bolj približa zahtevanemu razmiku,
 * hkrati pa spoštuje min/max razmik profila. Vrne tudi informacijo, ali je
 * razporeditev veljavna; če ni, vrne najboljši približek za prikaz napake.
 */
function findBoardLayout(
  totalDimension: number,
  effectiveWidth: number,
  requestedSpacing: number,
  minSpacing: number,
  maxSpacing: number
): { boards: number; spacing: number; uncovered: number; valid: boolean } {
  // Ena deska pokrije celotno dimenzijo (ali jo je treba obrezati) - veljavno.
  if (totalDimension <= effectiveWidth) {
    return { boards: 1, spacing: 0, uncovered: 0, valid: true };
  }

  const maxBoards = Math.min(2000, Math.floor(totalDimension / effectiveWidth) + 1);
  let best: { boards: number; spacing: number; diff: number } | null = null;

  for (let n = 1; n <= maxBoards; n++) {
    if (n === 1) continue;
    const spacing = (totalDimension - n * effectiveWidth) / (n - 1);
    if (spacing >= minSpacing - EPS && spacing <= maxSpacing + EPS) {
      const diff = Math.abs(spacing - requestedSpacing);
      if (!best || diff < best.diff - EPS) {
        best = { boards: n, spacing, diff };
      }
    }
  }

  if (best) {
    return { boards: best.boards, spacing: best.spacing, uncovered: 0, valid: true };
  }

  // Ni razporeditve znotraj dovoljenega razmika - vrnemo približek, da lahko
  // uporabnik vidi, koliko materiala bi potreboval, in da izračun ni tiho napačen.
  let boards = Math.max(1, Math.round((totalDimension + requestedSpacing) / (effectiveWidth + requestedSpacing)));
  if (boards > 1) {
    let spacing = (totalDimension - boards * effectiveWidth) / (boards - 1);
    while (boards > 1 && spacing < 0) {
      boards -= 1;
      spacing = boards > 1 ? (totalDimension - boards * effectiveWidth) / (boards - 1) : 0;
    }
    const finalSpacing = boards > 1 ? (totalDimension - boards * effectiveWidth) / (boards - 1) : 0;
    const uncovered = Math.max(0, totalDimension - (boards * effectiveWidth + Math.max(0, boards - 1) * Math.max(0, finalSpacing)));
    return { boards, spacing: finalSpacing, uncovered, valid: false };
  }

  return { boards: 1, spacing: 0, uncovered: Math.max(0, totalDimension - effectiveWidth), valid: false };
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

  // Barva mora biti na voljo za izbrani profil
  if (config.colorId && !profile.colors.some(c => c.id === config.colorId)) {
    errors.push(`Izbrana barva (${config.colorId}) ni na voljo za profil ${profile.name}.`);
  }

  // Determine effective board width
  const effectiveWidth = visibleWidth || profile.width;
  
  // Determine maximum post spacing based on fence height.
  // Pravilo po višini (do 150 cm / nad 150 cm) velja za POKONČNE ograje;
  // pri prečnih ograjah je meja vedno profile.maxPostSpacing (Roksal).
  let maxPostSpacing = profile.maxPostSpacing;
  if (orientation === 'vertical' && profile.maxPostSpacingLow) {
    maxPostSpacing = fenceHeight > 1500 && profile.maxPostSpacingHigh
      ? profile.maxPostSpacingHigh
      : profile.maxPostSpacingLow;
    if (fenceHeight > 1500 && profile.maxPostSpacingLow !== profile.maxPostSpacingHigh) {
      warnings.push(`Za ograje nad 150cm je maksimalni razmak stebričkov ${profile.maxPostSpacingHigh}mm (namesto ${profile.maxPostSpacingLow}mm)`);
    }
  }

  // ROMB 67 prečno dovoljuje razmak 1450–1800 mm z dodatno povezavo.
  // Za vse ostale profile velja maxPostSpacing kot trda meja.
  const isHorizontalRomb = profile.id === 'romb-deska-67' && orientation === 'horizontal';
  const hardMaxPostSpacing = isHorizontalRomb ? 1800 : maxPostSpacing;

  // Calculate number of posts.
  // Pomembno: uporabnikov vnos je ŽELJA; dejanski razmak je vedno enakomerno
  // porazdeljen po dolžini (L / (n - 1)), sicer bi validacija preverjala napačno
  // vrednost in bi se stebri postavljali neenakomerno.
  let numberOfPosts: number;
  let actualPostSpacing: number;

  if (config.postSpacing) {
    numberOfPosts = Math.ceil(fenceLength / config.postSpacing) + 1;
    actualPostSpacing = fenceLength / (numberOfPosts - 1);

    if (config.postSpacing > hardMaxPostSpacing + EPS) {
      // Uporabnik zahteva razmak, ki ga sistem ne dovoli - tudi če bi bil
      // enakomerno porazdeljen dejanski razmak manjši.
      errors.push(`Zahtevani razmak stebričkov (${config.postSpacing}mm) presega maksimalni dovoljeni razmak (${hardMaxPostSpacing}mm)`);
    }

    if (actualPostSpacing > hardMaxPostSpacing + EPS) {
      errors.push(`Razmak stebričkov (${Math.round(actualPostSpacing)}mm) presega maksimalni dovoljeni razmak (${hardMaxPostSpacing}mm)`);
    } else if (isHorizontalRomb && actualPostSpacing > maxPostSpacing + EPS) {
      // ROMB 67 prečno: 1450-1800 mm je dovoljeno z dodatno povezavo.
      warnings.push(`Razmak stebričkov ${Math.round(actualPostSpacing)}mm je med ${maxPostSpacing}mm in ${hardMaxPostSpacing}mm - potrebna dodatna povezava (ROMB)`);
    }
  } else {
    numberOfPosts = Math.ceil(fenceLength / maxPostSpacing) + 1;
    actualPostSpacing = fenceLength / (numberOfPosts - 1);
  }

  const postSpacingValid = actualPostSpacing <= hardMaxPostSpacing + EPS;

  if (profile.kind === 'partition') {
    warnings.push(`${profile.name} je sistem za pregradne stene - uporabite ga ločeno od ograjnih sistemov.`);
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
  
  // Pri prečni ograji so nosilci stebrički - njihov razmak je že preverjen
  // zgoraj (skupaj z ROMB pravilom 1450-1800 mm), zato ga tu ne podvajamo.
  const beamSpacingValid = orientation === 'horizontal'
    ? postSpacingValid
    : beamSpacing <= maxBeamSpacing + EPS;
  
  if (orientation === 'vertical' && beamSpacing > maxBeamSpacing + EPS) {
    errors.push(`Razmak nosilcev (${Math.round(beamSpacing)}mm) presega maksimalni dovoljeni razmak (${maxBeamSpacing}mm)`);
  }
  
  // Calculate boards. Zahtevani razmik je prioriteta; findBoardLayout izbere
  // razporeditev, ki je najbližja zahtevi in hkrati znotraj dovoljenega razmika.
  const totalDimension = orientation === 'vertical' ? fenceLength : fenceHeight;

  // Validate input dimensions
  if (!isFinite(totalDimension) || totalDimension <= 0) {
    errors.push(`Neveljavna dimenzija ograje: ${totalDimension}mm`);
  }

  if (!isFinite(effectiveWidth) || effectiveWidth <= 0) {
    errors.push(`Neveljavna širina deske: ${effectiveWidth}mm`);
  }

  const layout = findBoardLayout(
    totalDimension,
    effectiveWidth,
    boardSpacing,
    profile.minBoardSpacing,
    profile.maxBoardSpacing
  );

  const numberOfBoards = layout.boards;
  const actualBoardSpacing = layout.spacing;
  const uncoveredWidth = layout.uncovered;
  const boardSpacingValid = layout.valid;

  if (!layout.valid) {
    const errorsBeforeLayout = errors.length;

    if (numberOfBoards > 1 && actualBoardSpacing < profile.minBoardSpacing - EPS) {
      errors.push(`Razmik med deskami (${actualBoardSpacing.toFixed(1)}mm) je manjši od minimalnega (${profile.minBoardSpacing}mm)`);
    } else if (numberOfBoards > 1 && actualBoardSpacing > profile.maxBoardSpacing + EPS) {
      errors.push(`Razmik med deskami (${actualBoardSpacing.toFixed(1)}mm) je večji od maksimalnega (${profile.maxBoardSpacing}mm). Prilagodite dolžino ali izberite drug profil.`);
    }

    if (uncoveredWidth > EPS) {
      errors.push(`Ograja ne more biti popolnoma pokrita. Nepokrita širina: ${uncoveredWidth.toFixed(1)}mm`);
    }

    // Zagotovimo, da neveljavna razporeditev vedno vrne vsaj eno napako.
    if (errors.length === errorsBeforeLayout) {
      errors.push(`Ni mogoče najti veljavne razporeditve desk za dimenzijo ${totalDimension}mm s širino deske ${effectiveWidth}mm.`);
    }
  }
  
  // Calculate material with cutting plan
  const boardLength = orientation === 'vertical' ? fenceHeight : fenceLength;
  const totalBoardLength = numberOfBoards * boardLength;
  const profileLength = profile.length;
  
  // Saw blade width (typical value for circular saw)
  const sawBladeWidth = 3; // mm - width of cut
  
  // Koliko desk gre iz enega profila in koliko profilov potrebujemo.
  // Če je posamezna deska daljša od profila, je za vsako desko potrebnih več
  // profilov (spajanje); izračun je konzervativen in ne "šiva" odrezkov med
  // deskami, zato kosovnica nikoli ne podceni materiala.
  let cutsPerProfile: number;
  let profilesNeeded: number;
  
  if (boardLength > profileLength) {
    cutsPerProfile = 0;
    const piecesPerBoard = Math.ceil(boardLength / profileLength);
    profilesNeeded = numberOfBoards * piecesPerBoard;
    warnings.push(
      `Posamezna deska (${boardLength}mm) je daljša od profila (${profileLength}mm). ` +
      `Za vsako desko potrebujete ${piecesPerBoard} profilov (spajanje); kosovnica je izračunana konzervativno.`
    );
  } else {
    // Calculate considering saw blade width
    // First cut doesn't need extra space, subsequent cuts need sawBladeWidth
    cutsPerProfile = Math.max(1, Math.floor((profileLength + sawBladeWidth) / (boardLength + sawBladeWidth)));
    profilesNeeded = Math.ceil(numberOfBoards / cutsPerProfile);
  }
  
  // Waste: mm profilov, ki ostanejo po razrezu (nikoli negativen).
  const waste = Math.max(0, (profilesNeeded * profileLength) - totalBoardLength);
  
  // Additional requirements
  const requiresAluminumTube = profile.requiresAluminumTube;
  // Kotniki so specifični za ROMB (levo/desno na stebričkih). Za KUBO
  // (pregradni sistem) jih ne dodajamo, ker montaža ni dokumentirana.
  const requiresBrackets = profile.id === 'romb-deska-67';
  const screwType: 'visible' | 'hidden' = profile.screwVisible ? 'visible' : 'hidden';

  // Količine za kosovnico (BOM)
  const numberOfProfilePieces = profilesNeeded;
  const totalProfileLengthM = Math.round((profilesNeeded * profileLength) / 10) / 100;
  const aluminumTubeLengthM = requiresAluminumTube
    ? Math.ceil((totalBoardLength / 1000) * 10) / 10
    : 0;
  const numberOfBrackets = requiresBrackets ? numberOfPosts * 2 : 0;
  // 2 vijaka na desko na vsak nosilec + 5 % rezerve.
  const numberOfScrews = Math.ceil(numberOfBoards * Math.max(1, numberOfBeams) * 2 * 1.05);
  const numberOfEndCaps = numberOfPosts * 2;
  
  // Validation
  const valid = errors.length === 0;
  
  // Add warnings for specific profiles
  if (requiresAluminumTube) {
    warnings.push(`⚠️ ${profile.name} zahteva aluminijasto cev - montaža brez nje NI mogoča`);
  }
  
  if (requiresBrackets) {
    warnings.push(`Za ${profile.name} so potrebni ustrezni kotniki levo in desno na stebričkih`);
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

    // Količine za kosovnico
    numberOfProfilePieces,
    totalProfileLengthM,
    boardLengthMm: boardLength,
    aluminumTubeLengthM,
    numberOfBrackets,
    numberOfScrews,
    numberOfEndCaps,
    
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
