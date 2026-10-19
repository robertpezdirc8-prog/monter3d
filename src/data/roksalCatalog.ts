/**
 * Roksal Product Catalog — WoodCore WPC
 *
 * Uradni podatki, povzeti z Roksalovih strani (preverjeno 19. 10. 2026):
 * - Barvni odtenki:        https://roksal.com/woodcore-wpc-deske/barvni-odtenki/
 * - Prečne ograje:         https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/
 * - Pokončne ograje:       https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/
 * - Preglednica ograj:     https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/
 * - PDF katalog (2020):    https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf
 *
 * Barvne lestvice (slike, iz katerih so povzeta imena odtenkov):
 * - TERASA 150 / ROMB: 2024/09/BARVNA_LESTVICA_1-terasa4.png, BARVNA_LESTVICA_3-rombi4.png
 * - POLNA 100:         2024/10/BARVNA_LESTVICA_2_polna.png
 * - POLNA 128:         2024/09/BARVNA_LESTVICA_4-polna-128-4.png
 * - KUBO:              2024/09/BARVNA_LESTVICA_5-kubo4.png
 *
 * POMEMBNO: HEX vrednosti so približki za zaslonski prikaz, niso laboratorijsko
 * potrjene. Za natančno ujemanje uporabite fizične vzorce (Roksal pošilja
 * brezplačne vzorce po pošti).
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
  maxPostSpacingLow: number; // mm - max razmak stebričkov za ograje do 150cm (pokončno)
  maxPostSpacingHigh: number; // mm - max razmak stebričkov za ograje nad 150cm (pokončno)
  /** Razpoložljive površine (npr. KLASIK / RUSTIK). */
  surfaces?: string[];
  colors: RoksalColor[];
  verified: boolean;
  source: string;
  notes?: string;
  technicalNotes?: string[]; // dodatne tehnične opombe
}

// ---------------------------------------------------------------------------
// Barvni odtenki — uradna lestvica 2024 (8 odtenkov, White samo za POLNA 100)
// ---------------------------------------------------------------------------

const PALETTE_SOURCE = 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/';

export const ROKSAL_COLORS: Record<string, RoksalColor> = {
  'amazon-wood': {
    id: 'amazon-wood',
    name: 'Amazon Wood',
    hex: '#6e6763',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Sivo-rjav odtenek z naravnim videzom lesa'
  },
  'ash-wood': {
    id: 'ash-wood',
    name: 'Ash Wood',
    hex: '#c2bfba',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Svetel sivo-srebrn odtenek, videz jesena'
  },
  'golden-teak': {
    id: 'golden-teak',
    name: 'Golden Teak',
    hex: '#d6a191',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Topel rožnato-rjav odtenek z videzom tika'
  },
  'burma-teak': {
    id: 'burma-teak',
    name: 'Burma Teak',
    hex: '#ac8f88',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Sivkasto-rjav odtenek z videzom tika'
  },
  'oak-wood': {
    id: 'oak-wood',
    name: 'Oak Wood',
    hex: '#d9ba95',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Svetel peščen odtenek z videzom hrasta'
  },
  'white': {
    id: 'white',
    name: 'White',
    hex: '#efece7',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Bela barva — na voljo samo za profil POLNA DESKA 100'
  },
  'rustic-oak': {
    id: 'rustic-oak',
    name: 'Rustic Oak',
    hex: '#bf9d6f',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Večbarvni videz starega hrasta - odtenek in razpored lis lahko variirata med deskami in serijami'
  },
  'rustic-walnut': {
    id: 'rustic-walnut',
    name: 'Rustic Walnut',
    hex: '#8e8074',
    verified: true,
    source: PALETTE_SOURCE,
    notes: 'Večbarvni videz starega oreha - odtenek in razpored lis lahko variirata med deskami in serijami'
  }
};

// Vsi klasični odtenki (brez bele, ki je samo za POLNA 100)
const CLASSIC_7 = [
  ROKSAL_COLORS['amazon-wood'],
  ROKSAL_COLORS['ash-wood'],
  ROKSAL_COLORS['golden-teak'],
  ROKSAL_COLORS['burma-teak'],
  ROKSAL_COLORS['oak-wood'],
  ROKSAL_COLORS['rustic-oak'],
  ROKSAL_COLORS['rustic-walnut']
];

// ---------------------------------------------------------------------------
// Profili — uradne mere in pravila montaže
// ---------------------------------------------------------------------------

export const ROKSAL_PROFILES: RoksalProfile[] = [
  // POLNA DESKA 57/32 — pokončna ograja, skrito vijačenje
  {
    id: 'polna-deska-57-32',
    name: 'POLNA DESKA 57/32',
    width: 57,
    thickness: 32,
    length: 5800,
    orientation: 'vertical',
    maxPostSpacing: 1500,
    maxBeamSpacing: 1000,
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: false,
    screwSide: 'back',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1500,
    maxPostSpacingHigh: 1500,
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic-oak'],
      ROKSAL_COLORS['rustic-walnut']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Skrito vijačenje. Montaža na širino 57 mm ali 32 mm. Samo za pokončno ograjo. Dolžina profila 5,8 m, reže se na poljubne dolžine.',
    technicalNotes: [
      'Maksimalni razmak med stebrički: 150 cm ne glede na višino ograje',
      'Maksimalna razdalja med vodoravnima nosilcema: 100 cm',
      'Vijak naj bo dolg približno 2/3 globine profila',
      'V kompozit se vrta luknja, manjša od vijaka; v konstrukcijo večja (dilatacija)',
      'Priporočen razmik med deskami 0,5–3 cm (večji razmik je estetsko lepši)',
      'Opomba: na strani so navedene 3–4 trenutno razpoložljive barve - preverite pri Roksalu'
    ]
  },

  // POLNA DESKA 100 — pokončna ograja, vidno vijačenje
  {
    id: 'polna-deska-100',
    name: 'POLNA DESKA 100',
    width: 100,
    thickness: 12,
    length: 5800,
    orientation: 'vertical',
    maxPostSpacing: 1800,
    maxBeamSpacing: 800,
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: true,
    screwSide: 'front',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1800,
    maxPostSpacingHigh: 1500,
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['golden-teak'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['white'],
      ROKSAL_COLORS['rustic-oak'],
      ROKSAL_COLORS['rustic-walnut']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Vijačenje vidno z lica. Samo za pokončno ograjo. Dolžina 5,8 m. Edini profil, ki je na voljo v beli barvi.',
    technicalNotes: [
      'Maksimalni razmak med stebrički: 180 cm (ograje do 150 cm višine) oz. 150 cm (nad 150 cm)',
      'Maksimalna razdalja med vodoravnima nosilcema: 80 cm',
      'Predvrtanje obvezno - luknja 1 mm večja od vijaka',
      'Vijaki so vidni z lica',
      'Priporočen razmik med deskami 0,5–3 cm'
    ]
  },

  // ROMB DESKA 67 — pokončno in prečno, skrito vijačenje skozi ALU cev
  {
    id: 'romb-deska-67',
    name: 'ROMB DESKA 67',
    width: 67,
    thickness: 26,
    length: 5800,
    orientation: 'both',
    maxPostSpacing: 1450,
    maxBeamSpacing: 1100,
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: false,
    screwSide: 'back',
    hasAluminumTube: true,
    requiresAluminumTube: true,
    maxPostSpacingLow: 1450,
    maxPostSpacingHigh: 1450,
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['golden-teak'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic-oak'],
      ROKSAL_COLORS['rustic-walnut']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/',
    notes: 'OPOZORILO: MONTAŽA BREZ ALU CEVI NI MOŽNA! Alu cev je v sredini profila in je vključena v ceno. Skrito vijačenje z zadnje strani. Dolžina 5,8 m.',
    technicalNotes: [
      '⚠️ Aluminijasta cev v sredini romba je obvezna in že vključena v ceno',
      'Prečno: maksimalni razmak stebričkov 145 cm (možno samo s kotnikom levo in desno)',
      'Prečno: pri razmaku 145–180 cm je potrebna dodatna vmesna povezava',
      'Prečno: pri razmaku 180 cm ali več je potreben dodatni stebriček',
      'Pokončno: maksimalna razdalja med vodoravnima nosilcema 110 cm',
      'Pokončno: pri razmikih med deskami je vidna aluminijasta cev v sredini profila',
      'Vijaki: predvrtanje v romb in alu 3,2 mm, nato v romb 4,2–4,5 mm (za kniping vijak 3,9)',
      'Priporočen razmik med deskami 0,5–3 cm'
    ]
  },

  // DESKA 150 — terasna deska, prečna ograja
  {
    id: 'deska-150',
    name: 'DESKA 150 (Terasna)',
    width: 150,
    thickness: 25,
    length: 4000,
    orientation: 'horizontal',
    maxPostSpacing: 1300,
    maxBeamSpacing: 1300,
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: true,
    screwSide: 'front',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1300,
    maxPostSpacingHigh: 1300,
    surfaces: [
      'KLASIK - gosto rebrasta stran',
      'KLASIK - široko rebrasta stran',
      'RUSTIK - ena stran gladka, druga gosto rebrasta'
    ],
    colors: CLASSIC_7,
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/',
    notes: 'Terasna deska za prečno ograjo. Vidno vijačenje. Dolžina 4 m (na voljo tudi 2,2 m). KLASIK: 5 odtenkov, RUSTIK: 2 odtenka (Rustic Oak, Rustic Walnut).',
    technicalNotes: [
      'Stebrički za vodoravno postavitev na maksimalni razdalji 130 cm',
      'Opomba: stran navaja tudi 133–140 cm; aplikacija uporablja varnejših 130 cm',
      'Vijači se na sredini deske, kjer je rebro v profilu',
      'Predvrtanje obvezno - luknja 1 mm večja od vijaka',
      'Vmesna povezava brez pritrditve v tla je možna do razmaka 180 cm',
      'Priporočen razmik med deskami 0,5–3 cm'
    ]
  },

  // POLNA DESKA 128 — pokončno in prečno
  {
    id: 'polna-deska-128',
    name: 'POLNA DESKA 128',
    width: 128,
    thickness: 16,
    length: 2200,
    orientation: 'both',
    maxPostSpacing: 1100, // prečno
    maxBeamSpacing: 1000, // pokončno - vodoravni nosilci
    minBoardSpacing: 5,
    maxBoardSpacing: 30,
    recommendedBoardSpacing: 20,
    screwVisible: true,
    screwSide: 'front',
    hasAluminumTube: false,
    requiresAluminumTube: false,
    maxPostSpacingLow: 1800, // pokončno do 150 cm višine
    maxPostSpacingHigh: 1500, // pokončno nad 150 cm višine
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['ash-wood'],
      ROKSAL_COLORS['burma-teak'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic-oak'],
      ROKSAL_COLORS['rustic-walnut']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Vijačenje vidno z lica. Primerna za pokončno in prečno ograjo. Dolžina 2,2 m.',
    technicalNotes: [
      'Prečno: maksimalni razmak stebričkov 110 cm',
      'Pokončno: maksimalna razdalja med vodoravnima nosilcema 100 cm',
      'Pokončno: razmak stebričkov 180 cm (do 150 cm višine) oz. 150 cm (nad 150 cm)',
      'Vijaki so vidni z lica',
      'Predvrtanje obvezno - luknja 1 mm večja od vijaka',
      'Opomba: stran navaja debelino 16 mm in 16,5 mm - preverite pri Roksalu',
      'Priporočen razmik med deskami 0,5–3 cm'
    ]
  },

  // KUBO 80/42 — pregradne stene (partition)
  {
    id: 'kubo-80-42',
    name: 'KUBO 80/42 (Pregradna stena)',
    width: 80,
    thickness: 42,
    length: 2900,
    orientation: 'both',
    kind: 'partition',
    maxPostSpacing: 1200,
    maxBeamSpacing: 1200,
    minBoardSpacing: 20,
    maxBoardSpacing: 100,
    recommendedBoardSpacing: 40,
    screwVisible: false,
    screwSide: 'back',
    hasAluminumTube: true,
    requiresAluminumTube: true,
    maxPostSpacingLow: 1200,
    maxPostSpacingHigh: 1200,
    colors: [
      ROKSAL_COLORS['amazon-wood'],
      ROKSAL_COLORS['oak-wood'],
      ROKSAL_COLORS['rustic-oak'],
      ROKSAL_COLORS['rustic-walnut']
    ],
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Profil za pregradne stene. Vidna širina 42 mm ali 80 mm. Z aluminijasto cevjo 20x60x2 mm možen razpon do 260 cm. Na voljo 4 barve.',
    technicalNotes: [
      'Profil 80 × 42 mm, standardna dolžina 2900 mm',
      'Notranja aluminijasta cev 20 × 60 × 2 mm',
      'Brez dodatne ojačitve: max razpon 120 cm; z ALU cevjo do 260 cm',
      'Skrito vijačenje z zadnje strani',
      'Primerno za notranje in zunanje pregradne stene',
      'KUBO je ločen sistem za pregrade, ni del ograjnega konfiguratorja'
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
  version: '3.0.0',
  lastUpdated: '2026-10-19',
  primarySource: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
  secondarySources: [
    'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/',
    'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/',
    'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    'https://www.montaze-mlakar.si/wp-content/uploads/2020/03/WPSOgrajeTerase.pdf'
  ],
  verified: true,
  totalProfiles: ROKSAL_PROFILES.length,
  totalColors: Object.keys(ROKSAL_COLORS).length,
  notes: [
    'Podatki povzeti z uradnih Roksal strani (preverjeno 19. 10. 2026)',
    'Barvna lestvica 2024: 8 odtenkov; White je na voljo samo za POLNA DESKA 100',
    'Rustic Oak in Rustic Walnut sta večbarvna - odtenek variira med serijami',
    'HEX barve so PRIBLIŽKI za zaslonski prikaz - za natančno ujemanje uporabite fizične vzorce',
    'Roksal pošilja brezplačne vzorce po pošti',
    'ROMB DESKA zahteva aluminijasto cev - montaža brez nje NI mogoča (vključena v ceno)',
    'POLNA DESKA 100 je samo za pokončno ograjo in edina na voljo v beli barvi',
    'DESKA 150 je primarna za terase, uporablja se tudi za prečne ograje',
    'Minimalen odmik vijaka od roba reza je 3 cm',
    'Priporočen razmik med deskami: 0,5 cm do 3 cm',
    'Vijaki so vidni pri profilih DESKA 150, POLNA 100 in POLNA 128; skriti pri 57/32 in ROMB',
    'Montaža ni primerna pri temperaturi pod 5 °C'
  ]
};
