/**
 * download.ts — FAZA 16
 *
 * Pomožna funkcija za prenos datoteke v brskalnik. Izločena iz `App.tsx`,
 * ker je bila prej deklarirana kot `const` PO uporabi (latentna napaka TDZ).
 */
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
