/**
 * ErrorBoundary.tsx — FAZA 8 (P1)
 *
 * Zajame napake pri renderiranju, da aplikacija ne pokaže belega zaslona.
 * Uporabnik dobi razumljivo sporočilo, možnost osvežitve in pot do varnostne kopije
 * (podatki v IndexedDB ostanejo nedotaknjeni).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Napaka v aplikaciji:', error, info.componentStack);
    this.setState({ info: info.componentStack ?? null });
  }

  render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl bg-slate-800 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-400 mb-2">Napaka v aplikaciji</h1>
          <p className="text-sm text-slate-300 mb-4">
            Aplikacija je naletla na nepričakovano napako. Tvoji projekti in meritve so
            še vedno shranjeni v napravi — osveži stran in nadaljuj.
          </p>
          <pre className="text-xs text-slate-400 bg-slate-900 rounded p-3 overflow-auto max-h-40 mb-4">
            {error.message}
            {info ? `\n${info.slice(0, 800)}` : ''}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
            >
              Osveži stran
            </button>
            <button
              onClick={() => this.setState({ error: null, info: null })}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm"
            >
              Poskusi znova brez osvežitve
            </button>
          </div>
        </div>
      </div>
    );
  }
}
