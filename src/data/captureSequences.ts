/**
 * captureSequences.ts — FAZA 30
 *
 * Navodila za voden zajem po različnih vrstah objektov (ograja, stopnice, teren …).
 * Izluščeno iz `GuidedCapture.tsx`, da je komponenta lahko branljiva brez 400 vrstic
 * opisov korakov.
 */
import type { ObjectType } from '../types';

export interface CaptureStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  tips: string[];
}

export interface CaptureSequence {
  objectType: ObjectType;
  steps: CaptureStep[];
}

// Define capture sequences for different fence types
export const captureSequences: Record<string, CaptureSequence> = {
  fence: {
    objectType: 'fence',
    steps: [
      {
        id: 'start',
        title: 'Začetni pogled',
        description: 'Fotografirajte začetek ograje od spredaj',
        icon: '🏁',
        required: true,
        tips: [
          'Stojte 2-3 metre pred ograjo',
          'Vključite začetni steber ali vogal',
          'Poskrbite za dobro svetlobo'
        ]
      },
      {
        id: 'reference',
        title: 'Referenčna mera',
        description: 'Fotografija z znano merilo (letvica, meter)',
        icon: '📏',
        required: true,
        tips: [
          'Postavite letvico ali meter ob ograjo',
          'Fotografirajte od blizu, da je mera jasna',
          'Zapišite dejansko dolžino reference'
        ]
      },
      {
        id: 'middle',
        title: 'Sredinski pogled',
        description: 'Fotografirajte sredino ograje',
        icon: '📸',
        required: true,
        tips: [
          'Premaknite se vzdolž ograje',
          'Ohranite podobno razdaljo in kot',
          'Vključite vsaj 30% prekrivanja s prejšnjo sliko'
        ]
      },
      {
        id: 'end',
        title: 'Končni pogled',
        description: 'Fotografirajte konec ograje',
        icon: '🏁',
        required: true,
        tips: [
          'Fotografirajte zadnji steber ali vogal',
          'Ohranite enak kot kot pri začetku',
          'Poskrbite, da je celoten konec viden'
        ]
      },
      {
        id: 'posts',
        title: 'Detajli stebrov',
        description: 'Posamezni posnetki stebrov in pritrdilnih mest',
        icon: '🔩',
        required: false,
        tips: [
          'Fotografirajte vsak steber posebej',
          'Prikažite način pritrditve',
          'Posnemite od blizu za detajle'
        ]
      }
    ]
  },
  
  corner_fence: {
    objectType: 'fence',
    steps: [
      {
        id: 'start',
        title: 'Začetni pogled',
        description: 'Fotografirajte začetek ograje pred vogalom',
        icon: '🏁',
        required: true,
        tips: [
          'Stojte 2-3 metre pred ograjo',
          'Vključite začetni steber',
          'Posnemite celotno ravno sekcijo'
        ]
      },
      {
        id: 'reference',
        title: 'Referenčna mera',
        description: 'Fotografija z znano merilo',
        icon: '📏',
        required: true,
        tips: [
          'Postavite letvico ob ograjo',
          'Fotografirajte od blizu',
          'Zapišite dejansko dolžino'
        ]
      },
      {
        id: 'corner',
        title: 'Vogal',
        description: 'Fotografirajte vogal iz dveh kotov',
        icon: '📐',
        required: true,
        tips: [
          'Posnemite vogal od spredaj',
          'Nato fotografirajte iz drugega kota',
          'Prikažite spremembo smeri'
        ]
      },
      {
        id: 'after_corner',
        title: 'Za vogalom',
        description: 'Fotografirajte ograjo za vogalom',
        icon: '📸',
        required: true,
        tips: [
          'Premaknite se za vogal',
          'Ohranite podobno razdaljo',
          'Vključite 30% prekrivanja'
        ]
      },
      {
        id: 'end',
        title: 'Končni pogled',
        description: 'Fotografirajte konec ograje',
        icon: '🏁',
        required: true,
        tips: [
          'Fotografirajte zadnji steber',
          'Prikažite celoten konec',
          'Ohranite enak kot'
        ]
      }
    ]
  },
  
  balcony: {
    objectType: 'fence',
    steps: [
      {
        id: 'overview',
        title: 'Pregledni posnetek',
        description: 'Fotografirajte celotno balkonsko ograjo',
        icon: '📷',
        required: true,
        tips: [
          'Stojte na razdalji 3-5 metrov',
          'Vključite celotno ograjo',
          'Posnemite iz spodnjega kota'
        ]
      },
      {
        id: 'reference',
        title: 'Referenčna mera',
        description: 'Fotografija z znano merilo',
        icon: '📏',
        required: true,
        tips: [
          'Postavite meter ob ograjo',
          'Fotografirajte od blizu',
          'Zapišite dejansko dolžino'
        ]
      },
      {
        id: 'left',
        title: 'Leva stran',
        description: 'Detajlni posnetek leve strani',
        icon: '◀️',
        required: true,
        tips: [
          'Fotografirajte levo stran od blizu',
          'Prikažite pritrdilna mesta',
          'Vključite steber ali vogal'
        ]
      },
      {
        id: 'middle',
        title: 'Sredina',
        description: 'Detajlni posnetek sredine',
        icon: '📸',
        required: true,
        tips: [
          'Fotografirajte sredinski del',
          'Prikažite vzorec ali panele',
          'Ohranite enakomerno razdaljo'
        ]
      },
      {
        id: 'right',
        title: 'Desna stran',
        description: 'Detajlni posnetek desne strani',
        icon: '▶️',
        required: true,
        tips: [
          'Fotografirajte desno stran od blizu',
          'Prikažite pritrdilna mesta',
          'Vključite steber ali vogal'
        ]
      },
      {
        id: 'height',
        title: 'Višina ograje',
        description: 'Posnetek za merjenje višine',
        icon: '📏',
        required: false,
        tips: [
          'Postavite meter vertikalno',
          'Fotografirajte od spredaj',
          'Prikažite celotno višino'
        ]
      }
    ]
  },
  
  stairs: {
    objectType: 'stairs',
    steps: [
      {
        id: 'overview',
        title: 'Pregled stopnišča',
        description: 'Fotografirajte celotno stopnišče od spodaj',
        icon: '📷',
        required: true,
        tips: [
          'Stojte na dnu stopnišča',
          'Vključite vse stopnice',
          'Posnemite iz spodnjega kota'
        ]
      },
      {
        id: 'reference',
        title: 'Referenčna mera',
        description: 'Fotografija z znano merilo na stopnici',
        icon: '📏',
        required: true,
        tips: [
          'Postavite meter na stopnico',
          'Fotografirajte od blizu',
          'Zapišite dejansko dolžino'
        ]
      },
      {
        id: 'bottom',
        title: 'Spodnji del',
        description: 'Detajlni posnetek spodnjega dela ograje',
        icon: '⬇️',
        required: true,
        tips: [
          'Fotografirajte prvih 3-5 stopnic',
          'Prikažite začetni steber',
          'Prikažite naklon ograje'
        ]
      },
      {
        id: 'middle',
        title: 'Srednji del',
        description: 'Detajlni posnetek sredine stopnišča',
        icon: '📸',
        required: true,
        tips: [
          'Fotografirajte srednji del',
          'Prikažite prehod med stopnicami',
          'Vključite 30% prekrivanja'
        ]
      },
      {
        id: 'top',
        title: 'Zgornji del',
        description: 'Detajlni posnetek zgornjega dela',
        icon: '⬆️',
        required: true,
        tips: [
          'Fotografirajte zadnjih 3-5 stopnic',
          'Prikažite končni steber',
          'Prikažite zaključek ograje'
        ]
      },
      {
        id: 'handrail',
        title: 'Ograja od zgoraj',
        description: 'Posnetek ograje od zgoraj za merjenje višine',
        icon: '📏',
        required: false,
        tips: [
          'Stojte na vrhu stopnišča',
          'Fotografirajte ograjo od zgoraj',
          'Prikažite višino handraila'
        ]
      }
    ]
  },
  
  sloped: {
    objectType: 'terrain',
    steps: [
      {
        id: 'overview',
        title: 'Pregled terena',
        description: 'Fotografirajte celoten nagnjen teren',
        icon: '📷',
        required: true,
        tips: [
          'Stojte na razdalji 5-10 metrov',
          'Vključite celoten padec',
          'Posnemite iz spodnjega kota'
        ]
      },
      {
        id: 'reference',
        title: 'Referenčna mera',
        description: 'Fotografija z znano merilo na terenu',
        icon: '📏',
        required: true,
        tips: [
          'Postavite letvico vodoravno na teren',
          'Fotografirajte od blizu',
          'Zapišite dejansko dolžino'
        ]
      },
      {
        id: 'bottom',
        title: 'Spodnji del',
        description: 'Fotografirajte spodnji del ograje',
        icon: '⬇️',
        required: true,
        tips: [
          'Fotografirajte začetek ograje',
          'Prikažite pritrditev na tleh',
          'Vključite prvi steber'
        ]
      },
      {
        id: 'middle',
        title: 'Srednji del',
        description: 'Fotografirajte sredino na padcu',
        icon: '📸',
        required: true,
        tips: [
          'Fotografirajte sredinski del',
          'Prikažite spremembo višine',
          'Vključite 30% prekrivanja'
        ]
      },
      {
        id: 'top',
        title: 'Zgornji del',
        description: 'Fotografirajte zgornji del ograje',
        icon: '⬆️',
        required: true,
        tips: [
          'Fotografirajte konec ograje',
          'Prikažite zaključek na terenu',
          'Vključite zadnji steber'
        ]
      },
      {
        id: 'slope',
        title: 'Meritve naklona',
        description: 'Posnetki za določitev naklona terena',
        icon: '📐',
        required: false,
        tips: [
          'Postavite meter vertikalno na različnih točkah',
          'Fotografirajte vsako meritev',
          'Zapišite višinske razlike'
        ]
      }
    ]
  }
};

/** Izbrana zaporedja zajema glede na vrsto objekta. */
export function defaultSequenceFor(objectType: ObjectType): string {
  if (objectType === 'fence') return 'fence';
  if (objectType === 'stairs') return 'stairs';
  if (objectType === 'terrain') return 'sloped';
  return 'fence';
}
