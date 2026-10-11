/**
 * Mera3D Pro - Measurement Accuracy Tests
 * 
 * ACTUALLY RUNS tests using real functions from cv.ts.
 * Displays results with pass/fail status and actual values.
 */

import { useState, useCallback } from 'react';
import { runActualTests, type TestResult } from '../tests/actualTests';

export function MeasurementAccuracyTests() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runTests = useCallback(() => {
    setRunning(true);
    
    // Actually run the tests
    const testResults = runActualTests();
    
    setResults(testResults);
    setRunning(false);
    setHasRun(true);
    
    // Log to console for verification
    console.log('=== Mera3D Pro - Actual Test Results ===');
    testResults.forEach((r, i) => {
      console.log(`${i + 1}. ${r.passed ? '✓' : '✗'} ${r.name}`);
      if (!r.passed) {
        console.log(`   Expected: ${r.expected}`);
        console.log(`   Actual: ${r.actual}`);
        if (r.error) console.log(`   Error: ${r.error}`);
      }
    });
    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    console.log(`\nResults: ${passed}/${total} passed (${((passed/total)*100).toFixed(1)}%)`);
  }, []);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Dejanski testi matematičnih funkcij</h3>
        <button
          onClick={runTests}
          disabled={running}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {running ? '⏳ Izvajam...' : hasRun ? '🔄 Ponovi teste' : '▶ Zaženi teste'}
        </button>
      </div>

      <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
        <p className="text-blue-200 text-sm">
          Ti testi dejansko izvajajo funkcije iz <code className="bg-blue-900/50 px-1 rounded">src/utils/cv.ts</code> in preverjajo rezultate.
          Testi se izvedejo v brskalniku in preverjajo:
        </p>
        <ul className="text-blue-300 text-xs mt-2 space-y-1 list-disc list-inside">
          <li>calculateScaleFromReference() — validacija vhoda, osnovni primeri, robni pogoji</li>
          <li>calculateRealDistance() — validacija, osnovni primeri, neveljavni podatki</li>
          <li>assessMeasurementReliability() — ocena zanesljivosti, opozorila</li>
          <li>estimateHomography() — identiteta, translacija, degenerirani primeri</li>
          <li>ransacHomography() — z outlierji</li>
          <li>End-to-end test merjenja</li>
        </ul>
      </div>

      {hasRun && results.length > 0 && (
        <div className="space-y-2">
          {/* Summary */}
          <div className={`rounded-lg p-4 ${failed === 0 ? 'bg-emerald-900/50 border border-emerald-700' : 'bg-red-900/50 border border-red-700'}`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{total}</div>
                <div className="text-xs text-slate-300">Skupaj</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-400">{passed}</div>
                <div className="text-xs text-slate-300">Uspešnih ✓</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{failed}</div>
                <div className="text-xs text-slate-300">Neuspešnih ✗</div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-sm text-slate-300">
                Uspešnost: <strong className="text-white">{((passed/total)*100).toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          {/* Individual results */}
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 ${r.passed ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-red-900/30 border border-red-800'}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{r.passed ? '✓' : '✗'}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm text-white mb-1">{r.name}</div>
                  {r.expected !== undefined && r.actual !== undefined && (
                    <div className="text-xs text-slate-400 space-y-0.5">
                      <div>Pričakovano: <span className="text-slate-300 font-mono">{String(r.expected)}</span></div>
                      <div>Dejansko: <span className="text-slate-300 font-mono">{
                        typeof r.actual === 'number' ? r.actual.toFixed(6) : String(r.actual)
                      }</span></div>
                    </div>
                  )}
                  {r.error && (
                    <div className="text-xs text-red-400 mt-1">Napaka: {r.error}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasRun && (
        <div className="bg-slate-800 rounded-lg p-6 text-center">
          <p className="text-slate-400 mb-4">Kliknite "Zaženi teste" za izvedbo dejanskih testov.</p>
          <p className="text-xs text-slate-500">
            Testi se izvedejo v brskalniku in uporabljajo funkcije iz src/utils/cv.ts.
            Rezultati so prikazani tukaj in v konzoli brskalnika (F12).
          </p>
        </div>
      )}

      {/* Info about what's tested */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Kaj je testirano:</h4>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li>Validacija vhodnih podatkov (NaN, Infinity, negativne vrednosti)</li>
          <li>Robni pogoji (enake točke, ničelna razdalja, neveljavne dimenzije)</li>
          <li>Osnovni primeri z znanimi rezultati</li>
          <li>Homografija: identiteta, translacija, kolinearne točke</li>
          <li>RANSAC z outlierji</li>
          <li>End-to-end test: referenca → merilo → meritev</li>
        </ul>
        <h4 className="text-sm font-semibold text-slate-300 mb-2 mt-4">Kaj NI testirano:</h4>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li>Realne fotografije s perspektivo</li>
          <li>Terenski pogoji (senca, odsev, zamegljenost)</li>
          <li>Primerjava z znanimi merami iz terena</li>
          <li>Delovanje kamere na mobilni napravi</li>
          <li>Lokalno shranjevanje po osvežitvi strani</li>
        </ul>
      </div>
    </div>
  );
}
