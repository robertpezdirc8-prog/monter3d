/**
 * Mera3D Pro - Guided Multi-Photo Capture
 * 
 * Provides step-by-step guidance for capturing fence photos.
 * Different capture sequences for different fence types.
 */

import { useState, useCallback } from 'react';
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
const captureSequences: Record<string, CaptureSequence> = {
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

interface GuidedCaptureProps {
  objectType: ObjectType;
  capturedSteps: string[];
  onCaptureStep: (stepId: string) => void;
  onSkipStep?: (stepId: string) => void;
}

export function GuidedCapture({
  objectType,
  capturedSteps,
  onCaptureStep,
  onSkipStep
}: GuidedCaptureProps) {
  const [selectedSequence, setSelectedSequence] = useState<string>(() => {
    // Default sequence based on object type
    if (objectType === 'fence') return 'fence';
    if (objectType === 'stairs') return 'stairs';
    if (objectType === 'terrain') return 'sloped';
    return 'fence';
  });

  const sequence = captureSequences[selectedSequence];
  
  const handleSequenceChange = useCallback((seqId: string) => {
    setSelectedSequence(seqId);
  }, []);

  const completedCount = sequence.steps.filter(s => capturedSteps.includes(s.id)).length;
  const requiredCount = sequence.steps.filter(s => s.required).length;
  const requiredCompleted = sequence.steps.filter(s => s.required && capturedSteps.includes(s.id)).length;
  
  const progress = (completedCount / sequence.steps.length) * 100;
  const isComplete = requiredCompleted === requiredCount;

  return (
    <div className="space-y-4">
      {/* Sequence selector */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Vrsta zajema:</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => handleSequenceChange('fence')}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              selectedSequence === 'fence'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Ravna ograja
          </button>
          <button
            onClick={() => handleSequenceChange('corner_fence')}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              selectedSequence === 'corner_fence'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Z vogalom
          </button>
          <button
            onClick={() => handleSequenceChange('balcony')}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              selectedSequence === 'balcony'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Balkonska
          </button>
          <button
            onClick={() => handleSequenceChange('stairs')}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              selectedSequence === 'stairs'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Stopniščna
          </button>
          <button
            onClick={() => handleSequenceChange('sloped')}
            className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
              selectedSequence === 'sloped'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Nagnjen teren
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300">Napredek zajema</h3>
          <span className="text-xs text-slate-400">
            {completedCount}/{sequence.steps.length} posnetkov
            {isComplete && <span className="ml-2 text-emerald-400">✓ Zaključeno</span>}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {sequence.steps.map((step, index) => {
          const isCaptured = capturedSteps.includes(step.id);
          const isNext = !isCaptured && (index === 0 || capturedSteps.includes(sequence.steps[index - 1].id));
          
          return (
            <div
              key={step.id}
              className={`rounded-lg p-4 border-2 transition-all ${
                isCaptured
                  ? 'bg-emerald-900/30 border-emerald-700'
                  : isNext
                  ? 'bg-blue-900/30 border-blue-700'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{step.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">
                      {index + 1}. {step.title}
                    </h4>
                    {step.required && (
                      <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded">
                        Obvezno
                      </span>
                    )}
                    {isCaptured && (
                      <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded">
                        ✓ Zajemljeno
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{step.description}</p>
                  
                  {isNext && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-slate-900/50 rounded p-2">
                        <p className="text-xs text-slate-400 mb-1">💡 Nasveti:</p>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {step.tips.map((tip, i) => (
                            <li key={i}>• {tip}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => onCaptureStep(step.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                        >
                          📸 Zajemli ta pogled
                        </button>
                        {!step.required && onSkipStep && (
                          <button
                            onClick={() => onSkipStep(step.id)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded text-sm transition-colors"
                          >
                            Preskoči
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion message */}
      {isComplete && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-4">
          <p className="text-emerald-200 text-sm">
            ✅ Vsi obvezni posnetki so zajeti. Lahko nadaljujete na merjenje ali zajemite dodatne detajle.
          </p>
        </div>
      )}
    </div>
  );
}
