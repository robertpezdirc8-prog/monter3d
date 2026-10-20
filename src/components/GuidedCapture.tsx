/**
 * Mera3D Pro - Guided Multi-Photo Capture
 * 
 * Provides step-by-step guidance for capturing fence photos.
 * Different capture sequences for different fence types.
 */

import { useState, useCallback } from 'react';
import type { ObjectType } from '../types';
import { captureSequences, defaultSequenceFor } from '../data/captureSequences';

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
  const [selectedSequence, setSelectedSequence] = useState<string>(() =>
    defaultSequenceFor(objectType)
  );

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
