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
  /** 'fence' = ograjni sistem, 'partition' = pregradni sistem (npr. KUBO). */
  kind?: 'fence' | 'partition';
  maxPostSpacing: number; // mm - maksimalni razmak med stebrički
  maxBeamSpacing: number; // mm - maksimalni razmak med vodoravnimi nosilci
  minBoardSpacing: number; // mm - minimalni razmik med deskami
  maxBoardSpacing: number; // mm - maksimalni razmik med deskami
  recommendedBoardSpacing: number; // mm - priporočen razmik med deskami
  screwVisible: boolean;
  screwSide: 'front' | 'back' | 'both'; // stran vijačenja
  hasAluminumTube: boolean;
  requiresAluminumTube: boolean; // ali profil zahteva ALU cev
  maxPostSpacingLow: number; // mm - max razmak stebričkov za ograje do 150cm
  maxPostSpacingHigh: number; // mm - max razmak stebričkov za ograje nad 150cm
  colors: RoksalColor[];
  verified: boolean;
  source: string;
  notes?: string;
  technicalNotes?: string[]; // dodatne tehnične opombe
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
    maxPostSpacing: 1500, // max razmak stebričkov ne glede na višino
    maxBeamSpacing: 1000, // max razmak vodoravnih nosilcev
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: false,
    screwSide: 'back',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1500, // do 150cm višine
    maxPostSpacingHigh: 1500, // nad 150cm višine
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['golden-teak']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Skrito vijačenje skozi cev iz zadnje strani. Montaža na širino 57mm ali 32mm. Samo za pokončno ograjo.',
    technicalNotes: [
      'Vijak naj bo približno 2/3 globine profila',
      'Predvrtanje obvezno - luknja 1mm večja od vijaka',
      'Maksimalni razmak med stebrički: 150cm ne glede na višino ograje',
      'Maksimalni razmak med vodoravnimi nosilci: 100cm'
    ]
  },
  
  // POLNA DESKA 100 - Vertical only, visible screwing
  {
    id: 'polna-deska-100',
    name: 'POLNA DESKA 100',
    width: 100,
    thickness: 12,
    length: 5800,
    orientation: 'vertical',
    maxPostSpacing: 1800, // max razmak stebričkov (do 150cm višine)
    maxBeamSpacing: 800, // max razmak vodoravnih nosilcev
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: true,
    screwSide: 'front',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1800, // do 150cm višine
    maxPostSpacingHigh: 1500, // nad 150cm višine
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
    notes: 'Vijačenje vidno iz lica - OBVEZNO vijačenje iz lica. Samo za pokončno ograjo. Dolžina 5.8m, reže se na poljubne dolžine.',
    technicalNotes: [
      'OBVEZNO vijačenje iz lica (vidno)',
      'Predvrtanje obvezno - luknja 1mm večja od vijaka',
      'Maksimalni razmak med stebrički: 180cm za ograje do 150cm višine',
      'Maksimalni razmak med stebrički: 150cm za ograje nad 150cm višine',
      'Maksimalni razmak med vodoravnimi nosilci: 80cm',
      'Priporočen razmik med deskami: 0.5-3cm'
    ]
  },
  
  // ROMB DESKA 67 - Both orientations, hidden screwing with aluminum tube
  {
    id: 'romb-deska-67',
    name: 'ROMB DESKA 67',
    width: 67,
    thickness: 26,
    length: 5800,
    orientation: 'both',
    maxPostSpacing: 1450, // max razmak stebričkov (prečna postavitev)
    maxBeamSpacing: 1100, // max razmak vodoravnih nosilcev (pokončna postavitev)
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: false,
    screwSide: 'back',
    hasAluminumTube: true,
    requiresAluminumTube: true, // OBVEZNA aluminijasta cev!
    maxPostSpacingLow: 1450, // do 150cm višine
    maxPostSpacingHigh: 1450, // nad 150cm višine
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
    notes: 'OPOZORILO: MONTAŽA BREZ ALU CEVI NI MOŽNA! Skrito vijačenje skozi aluminijasto cev. Primerna za pokončno in prečno ograjo. Dolžina 5.8m.',
    technicalNotes: [
      '⚠️ OPOZORILO: MONTAŽA BREZ ALUMINIJASTE CEVI NI MOŽNA!',
      'Aluminijasta cev je obvezna in že vključena v ceno',
      'Skrito vijačenje z zadnje strani skozi aluminijasto cev',
      'Potrebni so ustrezni kotniki levo in desno na stebričkih',
      'Maksimalni razmak med stebrički (prečna): 145cm',
      'Maksimalni razmak med vodoravnimi nosilci (pokončna): 110cm',
      'Pri razmaku nad 145cm (prečna) potrebna dodatna povezava do 180cm',
      'Pri razmaku 180cm ali več (prečna) potreben dodatni stebriček',
      'Priporočen razmik med deskami: 0.5-3cm'
    ]
  },
  
  // DESKA 150 - Horizontal only (terrace board), visible screwing
  {
    id: 'deska-150',
    name: 'DESKA 150 (Terasna)',
    width: 150,
    thickness: 25,
    length: 4000,
    orientation: 'horizontal',
    maxPostSpacing: 1300, // max razmak stebričkov (varnejši podatek)
    maxBeamSpacing: 1300, // max razmak vodoravnih nosilcev
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: true,
    screwSide: 'front',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1300, // do 150cm višine
    maxPostSpacingHigh: 1300, // nad 150cm višine
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
    notes: 'Terasna deska za prečno ograjo. Vijačenje vidno iz lica. Na voljo v dolžinah 4m in 2.2m.',
    technicalNotes: [
      'Vijačenje vidno iz lica - skozi desko v konstrukcijo',
      'Predvrtanje obvezno - luknja 1mm večja od vijaka',
      'Maksimalni razmak med stebrički: 130cm (varnejši podatek)',
      'Opomba: Spletna stran navaja 133-140cm, uporabljamo 130cm za varnost',
      'Na voljo v dolžinah 4000mm in 2200mm',
      'Priporočen razmik med deskami: 0.5-3cm'
    ]
  },
  
  // POLNA DESKA 128 - Both orientations (from website, not in PDF)
  {
    id: 'polna-deska-128',
    name: 'POLNA DESKA 128',
    width: 128,
    thickness: 16.5,
    length: 2200,
    orientation: 'both',
    maxPostSpacing: 1100, // max razmak stebričkov (prečna postavitev)
    maxBeamSpacing: 1000, // max razmak vodoravnih nosilcev (pokončna postavitev)
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: true,
    screwSide: 'front',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1100, // do 150cm višine
    maxPostSpacingHigh: 1100, // nad 150cm višine
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
    notes: 'Vijačenje vidno iz lica. Primerna za pokončno in prečno ograjo. Samo spletna stran - ni v PDF katalogu.',
    technicalNotes: [
      'Vijačenje vidno iz lica - skozi desko v konstrukcijo',
      'Predvrtanje obvezno - luknja 1mm večja od vijaka',
      'Maksimalni razmak med stebrički (prečna): 110cm',
      'Maksimalni razmak med vodoravnimi nosilci (pokončna): 100cm',
      'Standardna dolžina: 2200mm',
      'Priporočen razmik med deskami: 0.5-3cm',
      'Opomba: Podatki samo iz spletne strani, niso v PDF katalogu'
    ]
  },
  
  // KUBO 80/42 - Pregradne stene (partition walls)
  {
    id: 'kubo-80-42',
    name: 'KUBO 80/42 (Pregradna stena)',
    width: 80,
    thickness: 42,
    length: 2900,
    orientation: 'both',
    kind: 'partition',
    maxPostSpacing: 1200, // max razmak brez ojačitve
    maxBeamSpacing: 1200, // max razmak brez ojačitve
    minBoardSpacing: 20,
    maxBoardSpacing: 100,
    recommendedBoardSpacing: 40,
    screwVisible: false,
    screwSide: 'back',
    hasAluminumTube: true, // notranja aluminijasta cev 20x60x2mm
    requiresAluminumTube: true, // OBVEZNA za razpone nad 120cm
    maxPostSpacingLow: 1200, // do 150cm višine
    maxPostSpacingHigh: 1200, // nad 150cm višine
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['golden-teak']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/pregradne-stene/pokoncne-deske/',
    notes: 'Profil za pregradne stene. Vidna širina 42mm ali 80mm. Z aluminijasto cevjo 20x60x2mm možen razpon do 260cm.',
    technicalNotes: [
      'Profil 80 × 42 mm, standardna dolžina 2900mm',
      'Vidna širina: 42mm ali 80mm (glede na orientacijo)',
      'Notranja aluminijasta cev 20 × 60 × 2 mm',
      'Brez dodatne ojačitve: max razpon 120cm',
      'Z aluminijasto cevjo: max razpon do 260cm',
      'Skrito vijačenje z zadnje strani',
      'Primerno za notranje in zunanje pregradne stene',
      'Razmik med letvicami se izbere glede na želeni videz',
      'Opomba: KUBO je ločen sistem za pregrade, ni avtomatično združljiv z ograjami'
    ]
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
