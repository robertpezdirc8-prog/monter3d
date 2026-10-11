/**
 * Mera3D Pro - Natural Language Parser for Fence Configuration
 * 
 * Simple rule-based parser that recognizes known models, colors, dimensions,
 * and orientations from natural language input in Slovenian.
 * 
 * No external AI models or paid services required.
 */

import { ROKSAL_PROFILES, ROKSAL_COLORS, getProfileById } from '../data/roksalCatalog';
import type { RoksalProfile, RoksalColor } from '../data/roksalCatalog';

export interface ParsedConfiguration {
  profileId?: string;
  colorId?: string;
  orientation?: 'vertical' | 'horizontal';
  fenceHeight?: number; // mm
  fenceLength?: number; // mm
  boardSpacing?: number; // mm
  confidence: number; // 0-1
  recognized: string[];
  unrecognized: string[];
  warnings: string[];
}

// Keywords for profile recognition
const PROFILE_KEYWORDS: Record<string, string[]> = {
  'polna-deska-57-32': ['57/32', '57', '32', 'polna 57', 'polna deska 57'],
  'polna-deska-100': ['100', 'polna 100', 'polna deska 100', 'polna'],
  'polna-deska-128': ['128', 'polna 128', 'polna deska 128'],
  'romb-deska-67': ['romb', 'romb 67', 'romb deska', 'rombi'],
  'deska-150': ['150', 'deska 150', 'terasna', 'terasa']
};

// Keywords for color recognition
const COLOR_KEYWORDS: Record<string, string[]> = {
  'amazon-wood': ['amazon', 'amazon wood'],
  'ash-wood': ['ash', 'ash wood', 'jesen'],
  'burma-teak': ['burma', 'burma teak'],
  'golden-teak': ['golden', 'golden teak', 'zlata', 'zlato'],
  'oak-wood': ['oak', 'oak wood', 'hrast'],
  'rustic': ['rustic', 'staran', 'rustikal'],
  'anthracite': ['anthracite', 'antracit', 'siva', 'temno siva'],
  'white': ['white', 'bela', 'bel']
};

// Keywords for orientation
const ORIENTATION_KEYWORDS = {
  vertical: ['pokončno', 'pokoncno', 'vertikalno', 'navpično', 'navpicno', 'stoje'],
  horizontal: ['prečno', 'precno', 'horizontalno', 'vodoravno', 'leže', 'leze']
};

/**
 * Parse natural language input and extract fence configuration
 */
export function parseFenceConfiguration(input: string): ParsedConfiguration {
  const result: ParsedConfiguration = {
    confidence: 0,
    recognized: [],
    unrecognized: [],
    warnings: []
  };

  const normalizedInput = input.toLowerCase().trim();
  const words = normalizedInput.split(/\s+/);

  // Parse profile
  for (const [profileId, keywords] of Object.entries(PROFILE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedInput.includes(keyword)) {
        result.profileId = profileId;
        result.recognized.push(`Profil: ${getProfileById(profileId)?.name || profileId}`);
        result.confidence += 0.3;
        break;
      }
    }
  }

  // Parse color
  for (const [colorId, keywords] of Object.entries(COLOR_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedInput.includes(keyword)) {
        result.colorId = colorId;
        result.recognized.push(`Barva: ${ROKSAL_COLORS[colorId]?.name || colorId}`);
        result.confidence += 0.2;
        break;
      }
    }
  }

  // Parse orientation
  for (const [orientation, keywords] of Object.entries(ORIENTATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedInput.includes(keyword)) {
        result.orientation = orientation as 'vertical' | 'horizontal';
        result.recognized.push(`Orientacija: ${orientation === 'vertical' ? 'pokončno' : 'prečno'}`);
        result.confidence += 0.15;
        break;
      }
    }
  }

  // Parse height (look for numbers followed by "cm" or "mm")
  const heightMatch = normalizedInput.match(/(\d+)\s*(cm|mm)?\s*(visoko|višina|visina)/);
  if (heightMatch) {
    let height = parseInt(heightMatch[1]);
    const unit = heightMatch[2] || 'cm';
    if (unit === 'cm') height *= 10; // Convert to mm
    result.fenceHeight = height;
    result.recognized.push(`Višina: ${height}mm`);
    result.confidence += 0.15;
  }

  // Parse length
  const lengthMatch = normalizedInput.match(/(\d+)\s*(cm|mm|m)?\s*(dolgo|dolžina|dolzina|širina|sirina)/);
  if (lengthMatch) {
    let length = parseInt(lengthMatch[1]);
    const unit = lengthMatch[2] || 'm';
    if (unit === 'm') length *= 1000;
    else if (unit === 'cm') length *= 10;
    result.fenceLength = length;
    result.recognized.push(`Dolžina: ${length}mm`);
    result.confidence += 0.1;
  }

  // Parse spacing
  const spacingMatch = normalizedInput.match(/(\d+)\s*(cm|mm)?\s*(razmik|razmak|presledek)/);
  if (spacingMatch) {
    let spacing = parseInt(spacingMatch[1]);
    const unit = spacingMatch[2] || 'mm';
    if (unit === 'cm') spacing *= 10;
    result.boardSpacing = spacing;
    result.recognized.push(`Razmik: ${spacing}mm`);
    result.confidence += 0.1;
  }

  // Check for incompatible combinations
  if (result.profileId && result.orientation) {
    const profile = getProfileById(result.profileId);
    if (profile) {
      if (profile.orientation === 'vertical' && result.orientation === 'horizontal') {
        result.warnings.push(`Profil ${profile.name} je samo za pokončno ograjo`);
        result.confidence *= 0.5;
      } else if (profile.orientation === 'horizontal' && result.orientation === 'vertical') {
        result.warnings.push(`Profil ${profile.name} je samo za prečno ograjo`);
        result.confidence *= 0.5;
      }
    }
  }

  // Check if ROMB is selected without aluminum tube warning
  if (result.profileId === 'romb-deska-67') {
    result.warnings.push('ROMB DESKA zahteva aluminijasto cev - montaža brez nje NI mogoča');
  }

  // Normalize confidence to 0-1 range
  result.confidence = Math.min(result.confidence, 1);

  return result;
}

/**
 * Validate parsed configuration against catalog
 */
export function validateConfiguration(config: ParsedConfiguration): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [...config.warnings];

  // Validate profile
  if (config.profileId) {
    const profile = getProfileById(config.profileId);
    if (!profile) {
      errors.push(`Profil "${config.profileId}" ne obstaja v katalogu`);
    } else {
      // Validate color compatibility
      if (config.colorId) {
        const colorExists = profile.colors.some(c => c.id === config.colorId);
        if (!colorExists) {
          errors.push(`Barva ni na voljo za izbrani profil`);
        }
      }

      // Validate orientation compatibility
      if (config.orientation) {
        if (profile.orientation === 'vertical' && config.orientation === 'horizontal') {
          errors.push(`${profile.name} je samo za pokončno ograjo`);
        } else if (profile.orientation === 'horizontal' && config.orientation === 'vertical') {
          errors.push(`${profile.name} je samo za prečno ograjo`);
        }
      }

      // Validate spacing
      if (config.boardSpacing !== undefined) {
        if (config.boardSpacing < 5) {
          warnings.push('Razmik je zelo majhen - preverite, ali je izvedljiv');
        } else if (config.boardSpacing > 50) {
          warnings.push('Razmik je zelo velik - morda ni estetsko ustrezno');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate example prompts for the parser
 */
export function getExamplePrompts(): string[] {
  return [
    'Želim prečno ograjo ROMB v barvi Amazon Wood, visoko 120 cm',
    'Pokončna ograja POLNA DESKA 100, barva Ash Wood, višina 100 cm, razmik 2 cm',
    'Terasna ograja DESKA 150 v barvi Golden Teak, dolga 5 m',
    'ROMB ograja v barvi Burma Teak, pokončna postavitev, višina 110 cm',
    'Želim ograjo v barvi hrast, visoko 1 meter, z majhnimi razmiki'
  ];
}
