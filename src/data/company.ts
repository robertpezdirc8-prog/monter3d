/**
 * Roksal d.o.o. — uradni podatki podjetja za dokumente (ponudbe, pobirnice).
 *
 * Viri (preverjeno 19. 10. 2026):
 * - https://roksal.com/kontakt/ (salon, skladišče, telefoni, e-pošta)
 * - https://roksal.com/ (noga strani: sedež podjetja)
 * - https://roksal.com/splosni-pogoji/
 * - Davčna številka, matična številka in TRR: AJPES prek portala bizi.si
 *
 * OPOMBA: davčno številko, matično številko in TRR pred uporabo v uradnih
 * dokumentih preverite pri računovodstvu.
 */

export interface CompanyPhone {
  label: string;
  number: string;
}

export interface CompanyWorkingHours {
  label: string;
  hours: string;
  note?: string;
}

export interface CompanyInfo {
  legalName: string;
  shortName: string;
  /** Sedež podjetja (na sedežu ni več pisarne - obisk samo v salonu). */
  seatAddress: string;
  seatNote?: string;
  /** Salon in skladišče - naslov za prevzem in ogled. */
  showroomAddress: string;
  taxNumber: string;
  vatPayer: boolean;
  registrationNumber: string;
  iban: string;
  email: string;
  website: string;
  onlineCatalogUrl: string;
  phones: CompanyPhone[];
  workingHours: CompanyWorkingHours[];
  sources: string[];
}

export const ROKSAL_COMPANY: CompanyInfo = {
  legalName: 'Roksal d.o.o.',
  shortName: 'Roksal',
  seatAddress: 'Zgornje Bitnje 186, 4209 Žabnica, Slovenija',
  seatNote: 'Na sedežu podjetja ni več pisarne - obisk je možen v salonu.',
  showroomAddress: 'Savska Loka 21, 4000 Kranj',
  taxNumber: 'SI46431829',
  vatPayer: true,
  registrationNumber: '2238578000',
  iban: 'SI56 0206 8025 6047 345',
  email: 'info@roksal.com',
  website: 'roksal.com',
  onlineCatalogUrl: 'https://roksal.com/woodcore-wpc-deske/',
  phones: [
    { label: 'Terase in prevzem', number: '064 123 020' },
    { label: 'Ograje', number: '064 123 030' },
    { label: 'Fasade', number: '064 120 969' }
  ],
  workingHours: [
    {
      label: 'Salon',
      hours: 'pon–čet 7.30–15.30, pet 7.30–14.00',
      note: 'Pon in sre do 18.00 samo po dogovoru. Sob, ned in prazniki zaprto.'
    },
    {
      label: 'Skladišče',
      hours: 'pon–čet 7.30–15.00, pet 7.30–14.00',
      note: 'Pon–čet do 16.30 samo po dogovoru. Sob, ned in prazniki zaprto.'
    }
  ],
  sources: [
    'https://roksal.com/kontakt/',
    'https://roksal.com/splosni-pogoji/',
    'https://www.bizi.si/ROKSAL-D-O-O/ (AJPES)'
  ]
};

/** Ena vrstica za nogo dokumenta (uporabljena v PDF izvozu). */
export function companyFooterLine(company: CompanyInfo = ROKSAL_COMPANY): string {
  return [
    company.legalName,
    company.showroomAddress,
    `Davčna št.: ${company.taxNumber}`,
    `Matična št.: ${company.registrationNumber}`,
    `TRR: ${company.iban}`,
    company.email,
    company.website
  ].join(' · ');
}
