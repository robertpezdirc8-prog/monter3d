/**
 * Mera3D Pro - Roksal Product Catalog
 * 
 * Official Roksal WPC fence products data sourced from:
 * - PDF Catalog: https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf
 * - https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/
 * - https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/
 * - https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/
 * - https://roksal.com/woodcore-wpc-deske/barvni-odtenki/
 * 
 * Last verified: 2026
 * 
 * IMPORTANT: All data is sourced from official Roksal catalogs and websites.
 * HEX colors are approximations - actual colors may vary. Always verify with physical samples.
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
// IMPORTANT: HEX values are approximations for screen display only.
// Actual colors may vary between batches and should be verified with physical samples.
// Original names from PDF catalog: Amazon Wood, Ash Wood, Burma Teak, Golden Teak, Oak Wood, Rustic

export const ROKSAL_COLORS: Record<string, RoksalColor> = {
  'amazon-wood': {
    id: 'amazon-wood',
    name: 'Amazon Wood',
    hex: '#5d4037',
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Temno rjava barva z naravnim videzom lesa'
  },
  'ash-wood': {
    id: 'ash-wood',
    name: 'Ash Wood',
    hex: '#b8a89a',
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Svetlo sivo-rjava barva, videz jesena'
  },
  'burma-teak': {
    id: 'burma-teak',
    name: 'Burma Teak',
    hex: '#6d4c41',
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Srednje rjava barva z videzom tika'
  },
  'golden-teak': {
    id: 'golden-teak',
    name: 'Golden Teak',
    hex: '#c9a961',
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Zlato-rjava barva z videzom tika'
  },
  'oak-wood': {
    id: 'oak-wood',
    name: 'Oak Wood',
    hex: '#8b6f47',
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Srednje rjava barva z videzom hrasta'
  },
  'rustic': {
    id: 'rustic',
    name: 'Rustic (Staran les)',
    hex: '#6b5b4f',
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Staran videz lesa z naravnimi variacijami. Na eni strani gladka, na drugi rebrasta površina.'
  },
  // Additional colors from website (not in PDF catalog)
  'anthracite': {
    id: 'anthracite',
    name: 'Anthracite',
    hex: '#383838',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Temno siva barva (samo spletna stran, ni v PDF katalogu)'
  },
  'white': {
    id: 'white',
    name: 'White',
    hex: '#f5f5f5',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Bela barva (samo spletna stran, ni v PDF katalogu)'
  }
};

// Profile definitions based on official Roksal specifications from PDF catalog and website
// IMPORTANT: Colors listed are based on available sources. PDF catalog shows 5-6 colors,
// website shows more. Always verify availability with Roksal for specific projects.

export const ROKSAL_PROFILES: RoksalProfile[] = [
  // POLNA DESKA 57/32 - Vertical only, hidden screwing
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
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['golden-teak']
    ],
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Skrito vijačenje skozi cev iz zadnje strani. Montaža na širino 57mm ali 32mm. Samo za pokončno ograjo.'
  },
  
  // POLNA DESKA 100 - Vertical only, visible screwing
  {
    id: 'polna-deska-100',
    name: 'POLNA DESKA 100',
    width: 100,
    thickness: 12,
    length: 5800,
    orientation: 'vertical',
    maxSpacing: 2000,
    screwVisible: true,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['golden-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic']
    ],
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Vijačenje vidno iz lica - OBVEZNO vijačenje iz lica. Samo za pokončno ograjo. Dolžina 5.8m, reže se na poljubne dolžine.'
  },
  
  // ROMB DESKA 67 - Both orientations, hidden screwing with aluminum tube
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
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['golden-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic']
    ],
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'OPOZORILO: MONTAŽA BREZ ALU CEVI NI MOŽNA! Skrito vijačenje skozi aluminijasto cev. Primerna za pokončno in prečno ograjo. Dolžina 5.8m.'
  },
  
  // DESKA 150 - Horizontal only (terrace board), visible screwing
  {
    id: 'deska-150',
    name: 'DESKA 150 (Terasna)',
    width: 150,
    thickness: 25,
    length: 4000,
    orientation: 'horizontal',
    maxSpacing: 1400,
    screwVisible: true,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['golden-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic']
    ],
    verified: true,
    source: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
    notes: 'Terasna deska za prečno ograjo. Vijačenje vidno iz lica. Na voljo v dolžinah 4m in 2.2m. Stebrički na max 140cm razmiku.'
  },
  
  // POLNA DESKA 128 - Both orientations (from website, not in PDF)
  {
    id: 'polna-deska-128',
    name: 'POLNA DESKA 128',
    width: 128,
    thickness: 16.5,
    length: 2200,
    orientation: 'both',
    maxSpacing: 1100,
    screwVisible: true,
    hasAluminumTube: false,
    colors: [
      ROKSAL_COLORS['anthracite'],
      ROKSAL_COLORS['white'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['golden-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/',
    notes: 'Vijačenje vidno iz lica. Primerna za pokončno in prečno ograjo. Samo spletna stran - ni v PDF katalogu.'
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
  version: '2.0.0',
  lastUpdated: '2026-01-XX',
  primarySource: 'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf',
  secondarySources: [
    'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/',
    'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/',
    'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/'
  ],
  verified: true,
  totalProfiles: ROKSAL_PROFILES.length,
  totalColors: Object.keys(ROKSAL_COLORS).length,
  notes: [
    'Primarni vir: PDF katalog WPS Ograje in Terase (2020)',
    'Sekundarni viri: uradne Roksal spletne strani',
    'HEX barve so PRIBLIŽKI za zaslonski prikaz - NISO laboratorijsko potrjene',
    'Za natančno ujemanje barv uporabite FIZIČNE VZORCE',
    'Barvni odtenki se lahko razlikujejo med serijami (5-10% posvetlitev skozi čas)',
    'ROMB DESKA zahteva aluminijasto cev - montaža brez nje NI mogoča',
    'POLNA DESKA 100 je samo za pokončno ograjo',
    'DESKA 150 je primarna za terase, lahko se uporabi tudi za ograje',
    'Priporočen razmik med deskami: 0.5cm do 3cm',
    'Montaža ni primerna pri temperaturi pod 5°C'
  ]
};
