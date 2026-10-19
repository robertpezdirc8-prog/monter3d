# Mera3D Pro (monter3d)

Aplikacija za monterje: zajem fotografij, merjenje, izračun konstrukcije ograje/stopnic,
materiali in predračun. Deluje brez strežnika (React + TypeScript + Vite), vsi podatki so
lokalni (IndexedDB) in ne zapustijo naprave.

## Zagon

```bash
npm ci
npm run dev        # razvojni strežnik (http://localhost:3000)
npm run typecheck  # TypeScript (strict)
npm test           # vitest
npm run build      # produkcijski build
```

CI (`.github/workflows/test.yml`) preverja typecheck, vitest, `node test-runner.mjs`,
`npm audit` in build.

## Delovni tok

`Nov projekt → Zajem → Kakovost → Merilo → Meritve → Materiali → Vizualizacija →
Količine → Predračun → Izvoz`

## Podatki in shranjevanje (FAZA 7 / P0)

- **Projekt** (`projects`) vsebuje stanje: meritve, načrt ograje/stopnic, predračun in
  nastavitve (`settings`). Stanje se samodejno shrani ob vsaki spremembi, zato osvežitev
  strani ne izgubi podatkov.
- **Fotografije** (`photos`) so v ločeni shrambi in se **ne podvajajo** v zapisu projekta.
  Stari zapisi (fotografije v projektu) se ob odpiranju samodejno preselijo in počistijo.
- Projekte je mogoče **odpreti, preklopiti in izbrisati** (brisanje pobriše tudi fotografije).
- Meritev z oznako `isScaleReference` (kalibracija merila) je izključena iz dolžine ograje,
  količin in statistike predračuna.
- **Varnostna kopija** (korak Izvoz → 🧰) izvozi JSON s projektom, stanjem in
  **fotografijami**; uvoz (korak Nov projekt → ⬆) obnovi projekt kot nov (izvirnik ostane).

## Struktura

```
src/App.tsx            # delovni tok in UI
src/components/        # komponente (kamera, merjenje, vizualizacije)
src/utils/geometry.ts  # izračuni (ograja, stopnice, predračun)
src/utils/cv.ts        # računalniška vizija (Harris, deskriptorji, homografija, RANSAC)
src/utils/projectState.ts # shranjevanje/nalaganje stanja projekta
src/utils/backup.ts    # varnostna kopija in obnova
src/utils/storage.ts   # IndexedDB (projekti, fotografije)
src/data/              # katalog Roksal, galerija
src/tests/             # vitest testi
```

Poročila o fazah dela so v korenu (`*-POROCILO.md`) in v `docs/`.
