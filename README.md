# Mera3D Pro (monter3d)

Aplikacija za monterje: zajem fotografij, merjenje, izračun konstrukcije ograje/stopnic,
materiali in predračun. Deluje brez strežnika (React + TypeScript + Vite), vsi podatki so
lokalni (IndexedDB) in ne zapustijo naprave.

## Zagon

```bash
npm ci
npm run dev            # razvojni strežnik (http://localhost:3000)
npm run typecheck      # TypeScript (strict) + ESLint (CI kliče ta korak)
npm run lint           # ESLint (napake = 0, opozorila pri `any`)
npm test               # vitest (logika + UI testi z jsdom)
npm run test:geometry  # dodatni geometrijski testi (node)
npm run check          # typecheck + lint + geometrijski testi (lokalno, kot v CI)
npm run build          # produkcijski build
```

CI (`.github/workflows/test.yml`) preverja typecheck, ESLint, vitest, `test-runner.mjs`,
`test-homography.js`, `npm audit` in build.

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
- **Kopija celotnega delovnega okolja** (Nov projekt → 🗄️) zajame **vse** projekte in
  fotografije v eno datoteko; isti gumb uvozi obe obliki kopij (projekt ali okolje).
- Pri polni shrambi (kvota) uporabnik dobi opozorilo, ne praznega zaslona.
- **Voden zajem po obrti** (`#trade`) shranjuje posnetke v izbrani projekt (zaščiteno
  pred izgubo ob zaprtju zaslona); projekt je mogoče preklopiti med zajemom.
- **Kalibracija merila** (korak Merilo): izberi dve točki na fotografiji in vpiši
  referenčno dolžino — meritve, narejene pred kalibracijo, se samodejno pretvorijo v metre.
- **Ročni vnos dolžin** (korak Meritve): če dolžine ni mogoče izmeriti po fotografiji
  (npr. po meritvi z metrom), jo vpiši ročno — gre v načrt in predračun enako kot
  meritev na sliki.

## Geometrija in matematika (FAZA 8 / P1)

- **Segmenti ograje** (korak Materiali): vsaka dolžinska meritev dobi **azimut** in
  **dvig**, zato so mogoči koti (L-oblike) in terenski dvigi — prej je bila mogoča samo
  ravna ograja.
- **Cene materialov** so del nastavitev projekta (prej trdo zapisane v kodi).
- **Dve konstrukciji ograje**: panelna (paneli + stebri) in deskna (deske iz kataloga
  Roksal) — obe uporabljata ista pravila, cene in predračun (prej je bila deskna
  konstrukcija izolirana v konfiguratorju in ni šla v predračun).
- **Konfigurator** prenaša izbiro (profil, višina, razmik med deskami) neposredno v
  projekt, zato ni več ločen izračun, temveč napredno orodje istega toka.
- **Homografija** sprejme realen šum značilnic (~0,5 px) in model preveri s reprojekcijo;
  **RANSAC** je determinističen (seed), zato so rezultati ponovljivi in testabilni.
- **Delovanje brez povezave**: service worker (`public/sw.js`) + manifest, namečen ob
  glavi »Offline ✓«.

## Struktura

```
src/App.tsx            # orkestrator: stanje, tok, navigacija, shranjevanje
src/components/        # komponente (kamera, merjenje, vizualizacije, urejevalnik segmentov)
src/components/steps/  # komponente po korakih delovnega toka
src/utils/geometry.ts  # izračuni (ograja, stopnice, predračun)
src/utils/fenceGeometry.ts # segmenti ograje (azimut, dvig, koti)
src/utils/roksalRules.ts   # tehnična pravila kataloga proti načrtu
src/utils/cv.ts        # računalniška vizija (Harris, deskriptorji, homografija, RANSAC)
src/utils/projectState.ts # shranjevanje/nalaganje stanja projekta
src/utils/backup.ts    # varnostna kopija in obnova
src/utils/storage.ts   # IndexedDB (projekti, fotografije)
src/data/              # katalog Roksal, galerija
src/tests/             # vitest testi (logika)
src/tests/ui/          # UI testi (jsdom + Testing Library)
public/sw.js           # service worker (offline)
```

Poročila o fazah dela so v `docs/porocila/`, dodatna dokumentacija v `docs/`.

### Namestitev in delovanje brez povezave
Aplikacija je namestljiva (PWA): manifest + service worker omogočata delovanje brez
omrežja, v glavi pa se pokaže gumb »⬇ Namesti« in opozorilo, ko naprava ni povezana.

### Galerija slik
Slike so shranjene **lokalno** v `public/roksal/images/` (galerija deluje brez povezave),
osveži pa jih z `npm run fetch:images`. Vir slik je roksal.com — pogoje uporabe preveri v
`public/roksal/README.md`.

### Opomba o AI detekciji
AI detekcija objektov (RF-DETR Nano, Apache 2.0) je **izbirna** — model se prenese šele,
ko uporabnik vklopi preklop v kameri, in se izvaja lokalno v brskalniku. Brez tega
aplikacija ne potrebuje omrežja.
