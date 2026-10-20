# Mera3D Pro (monter3d)

Aplikacija za monterje: zajem fotografij, merjenje, izračun konstrukcije ograje/stopnic,
materiali in predračun — **brez strežnika** (React + TypeScript + Vite). Vsi podatki so
lokalni (IndexedDB) in ne zapustijo naprave; deluje tudi brez omrežja.

---

## Zagon

```bash
npm ci
npm run dev            # razvojni strežnik (http://localhost:3000)
npm run typecheck      # TypeScript (strict) + ESLint 10  ← CI kliče ta korak
npm run lint           # ESLint (0 napak, 0 opozoril)
npm test               # vitest: logika + UI testi (jsdom)
npm run test:geometry  # dodatni geometrijski testi (node)
npm run check          # typecheck + lint + geometrijski testi (lokalno, kot v CI)
npm run build          # produkcijski build
npm run fetch:images   # osveži lokalne slike galerije (roksal.com)
```

CI (`.github/workflows/test.yml`) preverja typecheck (vključno z ESLint), vitest,
`test-runner.mjs`, `test-homography.js`, `npm audit` in build — na Node 20 in 22.

---

## Delovni tok

`Nov projekt → Zajem → Kakovost → Merilo → Meritve → Materiali → Vizualizacija →
Količine → Predračun → Zgodovina → Izvoz`

### Zajem in merjenje
- **Voden zajem po obrtih** (`#trade`): navodila korak po korak (ograje, keramika, fasade,
  krovstvo), kamera z ločljivostjo, bliskavico, osredotočenjem in oceno kadra; posnetki se
  shranijo v izbrani projekt.
- **Merjenje na fotografiji**: klik na dve točki + kalibracija z referenčno dolžino.
  Meritve, narejene pred kalibracijo, se ob potrditvi merila samodejno pretvorijo v metre.
- **Ročni vnos dolžin**: kadar dolžine ni mogoče izmeriti po fotografiji (merilni trak).
- **Enote** m / cm / mm — računanje je vedno v metrih, vnos in prikaz v izbrani enoti.
- **Označbe (skice)** čez posnetek z opombo (»vrtanje tukaj«) — vektor, zato ostane ostra
  pri vsaki velikosti in se prikaže v listi, PDF poročilu in deljenem dokumentu.
- **Vloga posnetka**: `pred` / `po` / `detajl` — osnova za primerjavo pred/po.

### Izračun in predračun
- **Dve konstrukciji ograje** — panelna (paneli + stebri) in deskna (deske iz kataloga
  Roksal) — obe skozi **enoten izračun**: geometrija → tehnična pravila → materiali →
  predračun. Kršitev pravil (npr. razmak stebrov) pomeni, da predračuna ni.
- **Koti in dvigi**: vsak segment ima smer in dvig, zato so mogoče L-oblike in terenski
  dvigi; sklenjena ograja se opozori.
- **Tehnična pravila kataloga**: profil, dovoljeni razmiki stebrov in nosilcev, ALU cev.
- **Cene so urejene** in del nastavitev projekta (ne trdo zapisane v kodi).

### Dokumentacija za stranko in pisarno
- **Dokumentacijska lista** (Izvoz → 📸): mreža / trak / primerjava pred-po, napis
  (meritev + čas), glava, noga; izbira posnetkov in samodejna izbira najboljših;
  izvoz v **PNG** in **PDF** (za tisk).
- **PDF predračun** vsebuje galerijo fotografij s skicami, meritve, materiale, predračun in
  **potek dela**.
- **Deljenje brez strežnika** (Izvoz → 📨): **samostojen HTML dokument** s projektom,
  meritvami, fotografijami, predračunom in potekom dela — pisarna ga odpre v
  kateremkoli brskalniku, brez aplikacije.
- **Zgodovina projekta** (korak 🕘): dnevnik opravljenega dela (lokalno).

### Podatki in varnost
- Stanje projekta (meritve, načrti, predračun, nastavitve) se **samodejno shranjuje** —
  osvežitev strani ne izgubi podatkov.
- Fotografije so v ločeni shrambi in se ne podvajajo; stari zapisi se ob odpiranju
  preselijo in počistijo.
- Projekte je mogoče odpreti, preklopiti in izbrisati (brisanje pobriše tudi fotografije).
- **Varnostne kopije**: posamezni projekt ali celotno delovno okolje (JSON) — obnovljivo.
- **Razveljava**: po brisanju meritve, fotografije ali projekta; zaporedne napake se
  razveljavljajo ena za drugo.
- Pri polni shrambi uporabnik dobi opozorilo, ne praznega zaslona.
- **AI detekcija** (RF-DETR Nano, Apache 2.0) je izbirna: model se prenese šele ob
  vklopu v kameri in se izvaja lokalno.

---

## Struktura

```
src/App.tsx              # orkestrator: stanje, tok, navigacija, shranjevanje
src/components/          # kamera, merjenje, vizualizacije, urejevalnik segmentov
src/components/steps/    # komponente po korakih delovnega toka
src/components/overlay/  # sklopi prekrivanja (merilno platno)
src/components/configurator/ # konfigurator ograje (vnosi, načrt, povzetek)
src/utils/geometry.ts    # izračuni (ograja, stopnice, predračun)
src/utils/fenceGeometry.ts # segmenti ograje (azimut, dvig, koti)
src/utils/fenceCalculation.ts # enoten izračun (panelna + deskna)
src/utils/roksalRules.ts # tehnična pravila kataloga proti načrtu
src/utils/boardFence.ts  # deskna konstrukcija (deske, stebri, nosilci)
src/utils/cv.ts          # računalniška vizija (Harris, deskriptorji, homografija, RANSAC)
src/utils/projectState.ts # shranjevanje/nalaganje stanja projekta
src/utils/activityLog.ts  # dnevnik opravljenih dejanj
src/utils/backup.ts      # varnostna kopija in obnova
src/utils/shareExport.ts  # samostojen HTML dokument za deljenje
src/utils/units.ts        # enote dolžin (m / cm / mm)
src/utils/storage.ts      # IndexedDB (projekti, fotografije, dnevnik)
src/data/                # katalog Roksal, galerija, navodila za zajem
src/tests/               # vitest (logika) + src/tests/ui (UI testi)
public/sw.js             # service worker (offline)
public/roksal/           # lokalne slike galerije
```

Dokumentacija: `docs/porocila/` (poročila po fazah, indeks v
`docs/porocila/INDEKS.md`), `docs/legacy-testpages/` (arhivirani stari testni prikazi).

---

## Znane omejitve

- **Ni sinhronizacije med napravami** (ni strežnika): prenos poteka prek samostojnega
  HTML dokumenta ali varnostne kopije.
- Galerija uporablja slike Roksala — pogoje uporabe preveri v `public/roksal/README.md`.
- Razvojni prikazi (`#tests`) so izključeni iz začetnega paketa (lazy nalaganje).
