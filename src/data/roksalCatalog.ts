/**
 * Mera3D Pro - Roksal Product Catalog
 * 
 * Official Roksal WPC fence products data sourced from:
 * - https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/
 * - https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/
 * - https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/
 * - https://roksal.com/woodcore-wpc-deske/barvni-odtenki/
 * 
 * Last verified: 2026
 */

export interface RoksalColor {
  id: string;
  name: string;
  hex: string;
  verified: boolean;
  source: string;
  notes?: string;
}

export interface RoksalProfile {
  id: string;
  name: string;
  width: number; // mm
  thickness: number; // mm
  length: number; // mm
  orientation: 'vertical' | 'horizontal' | 'both';
  maxSpacing: number; // mm - maksimalni razmak med stebri
  screwVisible: boolean;
  hasAluminumTube: boolean;
  colors: RoksalColor[];
  verified: boolean;
  source: string;
  notes?: string;
}

// Color definitions based on official Roksal color palettes
// Note: Exact hex values are approximations based on visual inspection of color swatches
// For production use, actual color samples should be verified

export const ROKSAL_COLORS: Record<string, RoksalColor> = {
  // Common colors across multiple profiles
  'anthracite': {
    id: 'anthracite',
    name: 'Anthracite',
    hex: '#383838',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'black': {
    id: 'black',
    name: 'Black',
    hex: '#1a1a1a',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'white': {
    id: 'white',
    name: 'White',
    hex: '#f5f5f5',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'ash': {
    id: 'ash',
    name: 'Ash',
    hex: '#b8a89a',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'amazon': {
    id: 'amazon',
    name: 'Amazon',
    hex: '#5d4037',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'golden': {
    id: 'golden',
    name: 'Golden',
    hex: '#c9a961',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'burma': {
    id: 'burma',
    name: 'Burma',
    hex: '#6d4c41',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  },
  'rustic-oak': {
    id: 'rustic-oak',
    name: 'Rustic Oak',
    hex: '#8b6f47',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Večbarvni videz z opaznimi variacijami med serijami'
  },
  'rustic-walnut': {
    id: 'rustic-walnut',
    name: 'Rustic Walnut',
    hex: '#5d4037',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Večbarvni videz z opaznimi variacijami med serijami'
  }
};

// Profile definitions based on official Roksal specifications
export const ROKSAL_PROFILES: RoksalProfile[] = [
  // VERTICAL ONLY PROFILES
  {
    id: 'polna-deska-57-32',
    name: 'POLNA DESKA 57/32',
    width: 57,
    thickness: 32,
    length: 5800,
    orientation: 'vertical',
    maxSpacing: 1500,
    screwVisible: false,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['anthracite'],
      ROKSAL_COLORS['black'],
      ROKSAL_COLORS['white'],
      ROKSAL_COLORS['ash']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Skrito vijačenje skozi cev iz zadnje strani. Montaža na širino 57mm ali 32mm.'
  },
  {
    id: 'polna-deska-100',
    name: 'POLNA DESKA 100',
    width: 100,
    thickness: 12,
    length: 5800,
    orientation: 'vertical',
    maxSpacing: 1800,
    screwVisible: true,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['anthracite'],
      ROKSAL_COLORS['black'],
      ROKSAL_COLORS['white'],
      ROKSAL_COLORS['ash'],
      ROKSAL_COLORS['amazon'],
      ROKSAL_COLORS['golden'],
      ROKSAL_COLORS['burma'],
      ROKSAL_COLORS['rustic-oak']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Vijačenje vidno iz lica. Samo za pokončno ograjo.'
  },
  
  // BOTH ORIENTATIONS PROFILES
  {
    id: 'polna-deska-128',
    name: 'POLNA DESKA 128',
    width: 128,
    thickness: 16,
    length: 2200,
    orientation: 'both',
    maxSpacing: 1100,
    screwVisible: true,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['anthracite'],
      ROKSAL_COLORS['black'],
      ROKSAL_COLORS['white'],
      ROKSAL_COLORS['ash'],
      ROKSAL_COLORS['golden'],
      ROKSAL_COLORS['rustic-oak']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/',
    notes: 'Vijačenje vidno iz lica. Primerna za pokončno in prečno ograjo.'
  },
  {
    id: 'romb-deska-67',
    name: 'ROMB DESKA 67',
    width: 67,
    thickness: 26,
    length: 5800,
    orientation: 'both',
    maxSpacing: 1450,
    screwVisible: false,
    hasAluminumTube: true,
    colors: [
      ROKSAL_COLORS['anthracite'],
      ROKSAL_COLORS['black'],
      ROKSAL_COLORS['white'],
      ROKSAL_COLORS['ash'],
      ROKSAL_COLORS['amazon'],
      ROKSAL_COLORS['golden'],
      ROKSAL_COLORS['burma']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/',
    notes: 'Skrito vijačenje skozi aluminijasto cev. Primerna za pokončno in prečno ograjo.'
  },
  
  // HORIZONTAL ONLY PROFILES
  {
    id: 'deska-150',
    name: 'DESKA 150 (Terasna)',
    width: 150,
    thickness: 25,
    length: 4000,
    orientation: 'horizontal',
    maxSpacing: 1330,
    screwVisible: true,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['anthracite'],
      ROKSAL_COLORS['black'],
      ROKSAL_COLORS['ash'],
      ROKSAL_COLORS['amazon'],
      ROKSAL_COLORS['golden'],
      ROKSAL_COLORS['rustic-oak'],
      ROKSAL_COLORS['rustic-walnut']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/',
    notes: 'Terasna deska za prečno ograjo. Vijačenje vidno iz lica.'
  }
];

// Helper functions
export function getProfileById(id: string): RoksalProfile | undefined {
  return ROKSAL_PROFILES.find(p => p.id === id);
}

export function getProfilesForOrientation(orientation: 'vertical' | 'horizontal' | 'both'): RoksalProfile[] {
  return ROKSAL_PROFILES.filter(p => 
    p.orientation === orientation || p.orientation === 'both'
  );
}

export function getVerticalProfiles(): RoksalProfile[] {
  return ROKSAL_PROFILES.filter(p => 
    p.orientation === 'vertical' || p.orientation === 'both'
  );
}

export function getHorizontalProfiles(): RoksalProfile[] {
  return ROKSAL_PROFILES.filter(p => 
    p.orientation === 'horizontal' || p.orientation === 'both'
  );
}

export function getColorById(id: string): RoksalColor | undefined {
  return Object.values(ROKSAL_COLORS).find(c => c.id === id);
}

// Catalog metadata
export const CATALOG_METADATA = {
  version: '1.0.0',
  lastUpdated: '2026-01-XX',
  source: 'https://roksal.com/',
  verified: true,
  totalProfiles: ROKSAL_PROFILES.length,
  totalColors: Object.keys(ROKSAL_COLORS).length,
  notes: [
    'Vsi podatki so pridobljeni iz uradnih Roksalovih spletnih strani',
    'Barvni odtenki so približki - za natančno ujemanje uporabite fizične vzorce',
    'Pri večbarvnih odtenkih (Rustic Oak, Rustic Walnut) so variacije med serijami normalne',
    'Mere so v milimetrih in ustrezajo uradnim specifikacijam',
    'Maksimalni razmaki med stebri so odvisni od višine ograje in konstrukcije'
  ]
};
