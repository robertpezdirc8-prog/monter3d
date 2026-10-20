/**
 * UndoSnackbar.tsx — FAZA 22
 *
 * Sporočilo z možnostjo razveljavitve po destruktivni akciji (brisanje meritve,
 * fotografije ali projekta). Na terenu je brisanje z enim tapom tvegano, zato je
 * varovalka obvezna, ne le priročna.
 *
 * Vzorec: običajna potenca (material) ponudi »Razveljavi« + sporočilo, ki
 * samodejno izgine.
 */
import { useEffect } from 'react';

interface UndoSnackbarProps {
  message: string;
  /** Akcija ob kliku »Razveljavi«. */
  onUndo: () => void;
  /** Zaprtje brez razveljavitve (tudi ob preteku časovne omejitve). */
  onDismiss: () => void;
  /** Čas do samodejnega zaprtja (ms). */
  timeoutMs?: number;
}

export function UndoSnackbar({ message, onUndo, onDismiss, timeoutMs = 10000 }: UndoSnackbarProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(timer);
  }, [onDismiss, timeoutMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 shadow-lg"
    >
      <span>{message}</span>
      <button
        onClick={() => { onUndo(); }}
        className="rounded bg-amber-600 hover:bg-amber-500 px-3 py-1 text-xs font-semibold text-white"
      >
        ↶ Razveljavi
      </button>
      <button
        onClick={onDismiss}
        className="text-xs text-slate-400 hover:text-slate-200"
        aria-label="Zapri sporočilo"
      >
        ✕
      </button>
    </div>
  );
}
