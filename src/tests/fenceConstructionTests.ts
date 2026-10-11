/**
 * Mera3D Pro - Fence Construction Tests
 * 
 * Automated tests for fence construction calculations.
 * Tests cover all profiles, orientations, and technical constraints.
 */

import { calculateFenceConstruction, validateFenceConfiguration } from '../utils/fenceConstruction';
import { ROKSAL_PROFILES } from '../data/roksalCatalog';

export interface TestResult {
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

export function runFenceConstructionTests(): TestResult[] {
  const results: TestResult[] = [];

  // Get profiles
  const polna57 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-57-32')!;
  const polna100 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-100')!;
  const polna128 = ROKSAL_PROFILES.find(p => p.id === 'polna-deska-128')!;
  const romb67 = ROKSAL_PROFILES.find(p => p.id === 'romb-deska-67')!;
  const deska150 = ROKSAL_PROFILES.find(p => p.id === 'deska-150')!;

  // Test 1: Pokončna POLNA DESKA 57/32 - preveri ločeno razmik med nosilci in stebrički
  try {
    const result = calculateFenceConstruction({
      profile: polna57,
      orientation: 'vertical',
      fenceHeight: 1000,
      fenceLength: 3000,
      boardSpacing: 20
    });
    
    const passed = result.numberOfBeams >= 2 && 
                   result.beamSpacing <= 1000 && // max 100cm med nosilci
                   result.actualPostSpacing <= 1500; // max 150cm med stebrički
    
    results.push({
      name: 'Test 1: POLNA 57/32 pokončno - razmiki nosilcev in stebričkov',
      passed,
      expected: 'beamSpacing <= 1000mm, postSpacing <= 1500mm',
      actual: `beamSpacing: ${result.beamSpacing}mm, postSpacing: ${result.actualPostSpacing}mm`
    });
  } catch (e) {
    results.push({ name: 'Test 1: POLNA 57/32 pokončno', passed: false, error: String(e) });
  }

  // Test 2: Pokončna POLNA DESKA 100 - preveri omejitev 80cm med nosilci
  try {
    const result = calculateFenceConstruction({
      profile: polna100,
      orientation: 'vertical',
      fenceHeight: 1200,
      fenceLength: 4000,
      boardSpacing: 20
    });
    
    const passed = result.beamSpacing <= 800; // max 80cm med nosilci
    
    results.push({
      name: 'Test 2: POLNA 100 pokončno - omejitev 80cm med nosilci',
      passed,
      expected: 'beamSpacing <= 800mm',
      actual: `beamSpacing: ${result.beamSpacing}mm`
    });
  } catch (e) {
    results.push({ name: 'Test 2: POLNA 100 pokončno', passed: false, error: String(e) });
  }

  // Test 3: Pokončna POLNA DESKA 128 - preveri omejitev 100cm med nosilci
  try {
    const result = calculateFenceConstruction({
      profile: polna128,
      orientation: 'vertical',
      fenceHeight: 1500,
      fenceLength: 3000,
      boardSpacing: 20
    });
    
    const passed = result.beamSpacing <= 1000; // max 100cm med nosilci
    
    results.push({
      name: 'Test 3: POLNA 128 pokončno - omejitev 100cm med nosilci',
      passed,
      expected: 'beamSpacing <= 1000mm',
      actual: `beamSpacing: ${result.beamSpacing}mm`
    });
  } catch (e) {
    results.push({ name: 'Test 3: POLNA 128 pokončno', passed: false, error: String(e) });
  }

  // Test 4: Prečna ROMB 67 pri razponu 145cm - pravilna konfiguracija
  try {
    const result = calculateFenceConstruction({
      profile: romb67,
      orientation: 'horizontal',
      fenceHeight: 1000,
      fenceLength: 1450,
      boardSpacing: 20
    });
    
    const passed = result.valid && 
                   result.actualPostSpacing <= 1450 &&
                   result.requiresAluminumTube === true;
    
    results.push({
      name: 'Test 4: ROMB 67 prečno 145cm - pravilna konfiguracija',
      passed,
      expected: 'valid, postSpacing <= 1450mm, requiresAluminumTube',
      actual: `valid: ${result.valid}, postSpacing: ${result.actualPostSpacing}mm, ALU: ${result.requiresAluminumTube}`
    });
  } catch (e) {
    results.push({ name: 'Test 4: ROMB 67 prečno 145cm', passed: false, error: String(e) });
  }

  // Test 5: Prečna ROMB 67 pri razponu 160cm - zahtevana dodatna povezava
  try {
    const result = calculateFenceConstruction({
      profile: romb67,
      orientation: 'horizontal',
      fenceHeight: 1000,
      fenceLength: 1600,
      boardSpacing: 20,
      postSpacing: 1600
    });
    
    const validation = validateFenceConfiguration({
      profile: romb67,
      orientation: 'horizontal',
      fenceHeight: 1000,
      fenceLength: 1600,
      boardSpacing: 20,
      postSpacing: 1600
    });
    
    // Should have warning about additional connection needed
    const passed = validation.warnings.some((w: string) => w.includes('145') || w.includes('dodatna'));
    
    results.push({
      name: 'Test 5: ROMB 67 prečno 160cm - zahtevana dodatna povezava',
      passed,
      expected: 'warning about additional connection',
      actual: `warnings: ${validation.warnings.length > 0 ? validation.warnings[0] : 'none'}`
    });
  } catch (e) {
    results.push({ name: 'Test 5: ROMB 67 prečno 160cm', passed: false, error: String(e) });
  }

  // Test 6: Prečna ROMB 67 pri razponu 180cm - potreben dodaten stebriček
  try {
    const validation = validateFenceConfiguration({
      profile: romb67,
      orientation: 'horizontal',
      fenceHeight: 1000,
      fenceLength: 1800,
      boardSpacing: 20,
      postSpacing: 1800
    });
    
    // Should have error or warning about additional post needed
    const passed = validation.errors.length > 0 || 
                   validation.warnings.some((w: string) => w.includes('180') || w.includes('stebriček'));
    
    results.push({
      name: 'Test 6: ROMB 67 prečno 180cm - potreben dodaten stebriček',
      passed,
      expected: 'error or warning about additional post',
      actual: `errors: ${validation.errors.length}, warnings: ${validation.warnings.length}`
    });
  } catch (e) {
    results.push({ name: 'Test 6: ROMB 67 prečno 180cm', passed: false, error: String(e) });
  }

  // Test 7: Prečna DESKA 150 pri razponu nad 130cm - opozorilo
  try {
    const validation = validateFenceConfiguration({
      profile: deska150,
      orientation: 'horizontal',
      fenceHeight: 1000,
      fenceLength: 1400,
      boardSpacing: 20,
      postSpacing: 1400
    });
    
    // Should have error because 1400 > 1300
    const passed = validation.errors.length > 0;
    
    results.push({
      name: 'Test 7: DESKA 150 prečno 140cm - napaka (presega 130cm)',
      passed,
      expected: 'error about exceeding max post spacing',
      actual: `errors: ${validation.errors.length > 0 ? validation.errors[0] : 'none'}`
    });
  } catch (e) {
    results.push({ name: 'Test 7: DESKA 150 prečno 140cm', passed: false, error: String(e) });
  }

  // Test 8: ROMB 67 brez aluminijaste cevi - konfiguracija ne sme biti veljavna
  try {
    const result = calculateFenceConstruction({
      profile: romb67,
      orientation: 'horizontal',
      fenceHeight: 1000,
      fenceLength: 1000,
      boardSpacing: 20
    });
    
    // ROMB always requires aluminum tube
    const passed = result.requiresAluminumTube === true;
    
    results.push({
      name: 'Test 8: ROMB 67 zahteva aluminijasto cev',
      passed,
      expected: 'requiresAluminumTube = true',
      actual: `requiresAluminumTube: ${result.requiresAluminumTube}`
    });
  } catch (e) {
    results.push({ name: 'Test 8: ROMB 67 ALU cev', passed: false, error: String(e) });
  }

  // Test 9: Izbira orientacije, ki je pri danem profilu nedovoljena
  try {
    const validation = validateFenceConfiguration({
      profile: polna100, // only vertical
      orientation: 'horizontal', // invalid
      fenceHeight: 1000,
      fenceLength: 3000,
      boardSpacing: 20
    });
    
    // Should have error about invalid orientation
    const passed = validation.errors.length > 0 || !validation.valid;
    
    results.push({
      name: 'Test 9: POLNA 100 prečno - nedovoljena orientacija',
      passed,
      expected: 'error about invalid orientation',
      actual: `valid: ${validation.valid}, errors: ${validation.errors.length}`
    });
  } catch (e) {
    results.push({ name: 'Test 9: Nedovoljena orientacija', passed: false, error: String(e) });
  }

  // Test 10: Več dolžin ograj - preveri, da izračun ne pusti nepokritih delov
  try {
    const lengths = [2000, 3500, 5000, 7500];
    let allCovered = true;
    
    for (const length of lengths) {
      const result = calculateFenceConstruction({
        profile: polna128,
        orientation: 'vertical',
        fenceHeight: 1000,
        fenceLength: length,
        boardSpacing: 20
      });
      
      // Check if boards cover the full length
      const coveredLength = result.numberOfBoards * polna128.width + 
                           (result.numberOfBoards - 1) * result.actualBoardSpacing;
      
      if (Math.abs(coveredLength - length) > 1) { // Allow 1mm tolerance
        allCovered = false;
        break;
      }
    }
    
    results.push({
      name: 'Test 10: Več dolžin - popolna pokritost',
      passed: allCovered,
      expected: 'all lengths fully covered',
      actual: `allCovered: ${allCovered}`
    });
  } catch (e) {
    results.push({ name: 'Test 10: Več dolžin', passed: false, error: String(e) });
  }

  return results;
}
