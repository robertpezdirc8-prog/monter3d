/**
 * Mera3D Pro - Roksal Image Gallery
 * 
 * Original Roksal product images sourced from official website.
 * All images are property of Roksal d.o.o. and used with permission for product visualization.
 * 
 * Source: https://roksal.com/
 * Last verified: 2026
 */

export interface RoksalImage {
  id: string;
  /** Izvirni naslov (vir: roksal.com) — uporabljen kot rezerva, če lokalna kopija ni na voljo. */
  url: string;
  /**
   * Lokalna kopija slike v `public/roksal/images/...` — omogoča delovanje
   * galerije brez povezave. Preveri z `npm run fetch:images`.
   */
  localPath?: string;
  title: string;
  description: string;
  profileId?: string; // Linked profile ID
  colorId?: string; // Linked color ID
  orientation?: 'vertical' | 'horizontal' | 'both';
  category: 'installation' | 'profile' | 'color-swatch';
  verified: boolean;
  source: string;
  notes?: string;
}

export const ROKSAL_GALLERY: RoksalImage[] = [
  // Vertical fence installations
  {
    id: 'vertical-amazon-100',
    url: 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-pokoncna-ograja-amazon-polna-deska-tr5.jpg',
    localPath: '/roksal/images/vertical/vertical-amazon-100.jpg',
    title: 'Pokončna dvoriščna ograja - POLNA DESKA 100',
    description: 'Pokončna dvoriščna ograja v Amazon odtenku, profil POLNA DESKA 100',
    profileId: 'polna-deska-100',
    colorId: 'amazon-wood',
    orientation: 'vertical',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/'
  },
  {
    id: 'vertical-128-balcony',
    url: 'https://roksal.com/wp-content/uploads/2021/11/image000000.jpg',
    localPath: '/roksal/images/vertical/vertical-128-balcony.jpg',
    title: 'Pokončna balkonska ograja - POLNA DESKA 128',
    description: 'WPC vertikalna ograja na balkonu s širšimi deskami, profil POLNA DESKA 128',
    profileId: 'polna-deska-128',
    orientation: 'vertical',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/',
    notes: 'Barva ni potrjena iz slike'
  },
  {
    id: 'vertical-ash-57',
    url: 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-pokoncna-ograja-ash-polna-deska-1.jpg',
    localPath: '/roksal/images/vertical/vertical-ash-57.jpg',
    title: 'Pokončna ograja - POLNA DESKA 57/32',
    description: 'WPC deske v Ash odtenku, profil POLNA DESKA 57/32',
    profileId: 'polna-deska-57-32',
    colorId: 'ash-wood',
    orientation: 'vertical',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/'
  },
  
  // Horizontal fence installations
  {
    id: 'horizontal-romb-amazon',
    url: 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-amazon-precna-ograja2.jpg',
    localPath: '/roksal/images/horizontal/horizontal-romb-amazon.jpg',
    title: 'Prečna dvoriščna ograja - ROMB DESKA',
    description: 'Vrtne WPC ograje brez barvanja in oljenja, profil ROMB DESKA v Amazon odtenku',
    profileId: 'romb-deska-67',
    colorId: 'amazon-wood',
    orientation: 'horizontal',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/'
  },
  {
    id: 'horizontal-romb-golden',
    url: 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-golden-precna-ograja-or1.jpg',
    localPath: '/roksal/images/horizontal/horizontal-romb-golden.jpg',
    title: 'Prečna balkonska ograja - ROMB DESKA',
    description: 'WPC deske na balkonski ograji v Golden odtenku, profil ROMB DESKA',
    profileId: 'romb-deska-67',
    colorId: 'golden-teak',
    orientation: 'horizontal',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/'
  },
  {
    id: 'horizontal-romb-ash',
    url: 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-ash-precna-ograja-lj1.jpg',
    localPath: '/roksal/images/horizontal/horizontal-romb-ash.jpg',
    title: 'Vrtne WPC ograje - ROMB DESKA Ash',
    description: 'Vrtne WPC ograje z deskami Ash Wood, profil ROMB DESKA',
    profileId: 'romb-deska-67',
    colorId: 'ash-wood',
    orientation: 'horizontal',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/'
  },
  {
    id: 'horizontal-romb-burma',
    url: 'https://roksal.com/wp-content/uploads/2021/03/wpc-woodcore-romb-burma-precna-ograja-pez3.jpg',
    localPath: '/roksal/images/horizontal/horizontal-romb-burma.jpg',
    title: 'WPC ograja na stopnicah - ROMB DESKA Burma',
    description: 'WPC ograja na stopnicah za vhod v hišo, profil ROMB DESKA v Burma odtenku',
    profileId: 'romb-deska-67',
    colorId: 'burma-teak',
    orientation: 'horizontal',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/'
  },
  
  // Profile details
  {
    id: 'profile-57-32',
    url: 'https://roksal.com/wp-content/uploads/2025/07/polna-deska-57-32.jpg',
    localPath: '/roksal/images/profiles/profile-57-32.jpg',
    title: 'Profil POLNA DESKA 57/32',
    description: 'WoodCore WPC deska profil polna – dimenzija: 57 x 32 x 5800 mm',
    profileId: 'polna-deska-57-32',
    category: 'profile',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/'
  },
  {
    id: 'profile-100',
    url: 'https://roksal.com/wp-content/uploads/2020/03/ograja-pokoncna.jpg',
    localPath: '/roksal/images/profiles/profile-100.jpg',
    title: 'Profil POLNA DESKA 100',
    description: 'WoodCore WPC deska profil polna – dimenzija: 100 x 12 x 5800 mm',
    profileId: 'polna-deska-100',
    category: 'profile',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/'
  },
  {
    id: 'profile-128',
    url: 'https://roksal.com/wp-content/uploads/2021/12/polna-deska-nova2021.jpg',
    localPath: '/roksal/images/profiles/profile-128.jpg',
    title: 'Profil POLNA DESKA 128',
    description: 'WoodCore WPC polna deska za ograjo – dimenzija: 128 x 16 x 2200 mm',
    profileId: 'polna-deska-128',
    category: 'profile',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/'
  },
  {
    id: 'profile-romb-67',
    url: 'https://roksal.com/wp-content/uploads/2021/12/romb-woodcore-wpc.jpg',
    localPath: '/roksal/images/profiles/profile-romb-67.jpg',
    title: 'Profil ROMB DESKA 67',
    description: 'WoodCore WPC deska profil romb Z ALU CEVJO – dimenzija: 67 x 26 x 5800 mm',
    profileId: 'romb-deska-67',
    category: 'profile',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/'
  },
  
  // Color swatches (from official color palettes)
  {
    id: 'swatch-terasa-150',
    url: 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_1-terasa4-2048x544.png',
    localPath: '/roksal/images/swatches/swatch-terasa-150.png',
    title: 'Barvna lestvica - DESKA 150',
    description: 'Barvni odtenki za profil DESKA 150 (terasna deska)',
    profileId: 'deska-150',
    category: 'color-swatch',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Uradna barvna lestvica z uradne spletne strani'
  },
  {
    id: 'swatch-polna-100',
    url: 'https://roksal.com/wp-content/uploads/2024/10/BARVNA_LESTVICA_2_polna-2048x480.png',
    localPath: '/roksal/images/swatches/swatch-polna-100.png',
    title: 'Barvna lestvica - POLNA DESKA 100',
    description: 'Barvni odtenki za profil POLNA DESKA 100',
    profileId: 'polna-deska-100',
    category: 'color-swatch',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Uradna barvna lestvica z uradne spletne strani'
  },
  {
    id: 'swatch-romb-67',
    url: 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_3-rombi4-2048x536.png',
    localPath: '/roksal/images/swatches/swatch-romb-67.png',
    title: 'Barvna lestvica - ROMB DESKA 67',
    description: 'Barvni odtenki za profil ROMB DESKA 67',
    profileId: 'romb-deska-67',
    category: 'color-swatch',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Uradna barvna lestvica z uradne spletne strani'
  },
  {
    id: 'swatch-polna-128',
    url: 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_4-polna-128-4-2048x547.png',
    localPath: '/roksal/images/swatches/swatch-polna-128.png',
    title: 'Barvna lestvica - POLNA DESKA 128',
    description: 'Barvni odtenki za profil POLNA DESKA 128',
    profileId: 'polna-deska-128',
    category: 'color-swatch',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Uradna barvna lestvica z uradne spletne strani'
  },
  {
    id: 'swatch-kubo-57',
    url: 'https://roksal.com/wp-content/uploads/2024/09/BARVNA_LESTVICA_5-kubo4-2048x624.png',
    localPath: '/roksal/images/swatches/swatch-kubo-57.png',
    title: 'Barvna lestvica - POLNA DESKA 57/32',
    description: 'Barvni odtenki za profil POLNA DESKA 57/32',
    profileId: 'polna-deska-57-32',
    category: 'color-swatch',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/barvni-odtenki/',
    notes: 'Uradna barvna lestvica z uradne spletne strani'
  },
  
  // Additional installation examples
  {
    id: 'installation-domzale',
    url: 'https://roksal.com/wp-content/uploads/2023/07/Domzale-4-2048x1536.jpg',
    localPath: '/roksal/images/stairs/installation-domzale.jpg',
    title: 'Realizacija - Domžale',
    description: 'Primer realizacije WPC ograje',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Profil in barva nista potrjena iz slike'
  },
  {
    id: 'installation-salon',
    url: 'https://roksal.com/wp-content/uploads/2025/09/Polna-deska-57-32_salon3_novo.jpg',
    localPath: '/roksal/images/stairs/installation-salon.jpg',
    title: 'Eksponat v salonu - POLNA DESKA 57/32',
    description: 'WPC ograja eksponat v salonu, profil POLNA DESKA 57/32',
    profileId: 'polna-deska-57-32',
    category: 'installation',
    verified: true,
    source: 'https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/',
    notes: 'Barva ni potrjena iz slike'
  }
];

// Helper functions
export function getImagesByProfile(profileId: string): RoksalImage[] {
  return ROKSAL_GALLERY.filter(img => img.profileId === profileId);
}

export function getImagesByColor(colorId: string): RoksalImage[] {
  return ROKSAL_GALLERY.filter(img => img.colorId === colorId);
}

export function getImagesByCategory(category: 'installation' | 'profile' | 'color-swatch'): RoksalImage[] {
  return ROKSAL_GALLERY.filter(img => img.category === category);
}

export function getImagesByOrientation(orientation: 'vertical' | 'horizontal'): RoksalImage[] {
  return ROKSAL_GALLERY.filter(img => img.orientation === orientation);
}

export function getImageById(id: string): RoksalImage | undefined {
  return ROKSAL_GALLERY.find(img => img.id === id);
}

// Gallery metadata
export const GALLERY_METADATA = {
  version: '1.0.0',
  lastUpdated: '2026-01-XX',
  source: 'https://roksal.com/',
  totalImages: ROKSAL_GALLERY.length,
  verifiedImages: ROKSAL_GALLERY.filter(img => img.verified).length,
  notes: [
    'Vse slike so pridobljene iz uradnih Roksalovih spletnih strani',
    'Slike so last podjetja Roksal d.o.o. in se uporabljajo z dovoljenjem',
    'Barvni odtenki na slikah so približki - za natančno ujemanje uporabite fizične vzorce',
    'Nekatere slike nimajo potrjenega profila ali barve - te so označene kot neklasificirane',
    'AI-generirane teksture niso vključene v galerijo'
  ]
};
