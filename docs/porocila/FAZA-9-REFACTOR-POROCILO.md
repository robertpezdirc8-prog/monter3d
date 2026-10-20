# FAZA 9 — RAZČLENITEV APLIKACIJE IN UI TESTI

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## 1. Razčlenitev `App.tsx` (2497 → 1299 vrstic)

`App.tsx` je bil monolit z vsemi komponentami delovnega toka. Razdeljen je na module po
korakih — koda je bila prenesena **besedilo za besedilom** (brez spremembe obnašanja),
za vsak modul so dodani ustrezni tipi in uvozi.

```
src/App.tsx                      # orkestrator: stanje, tok, navigacija, shranjevanje
src/components/icons.tsx         # SVG ikone (brez odvisnosti)
src/components/steps/
  NewProjectView.tsx             # nov projekt, odpiranje/brisanje, uvoz kopije
  CaptureView.tsx                # zajem
  QualityCheckView.tsx           # kakovost
  ScaleView.tsx                  # merilo
  MeasurementsView.tsx           # meritve
  MaterialView.tsx               # materiali, segmenti, cene
  QuantityView.tsx               # količine
  EstimateView.tsx               # predračun
  ExportView.tsx                 # izvoz
src/utils/labels.ts              # prevod tipov objektov (getObjectTypeLabel)
```

Koristi: sprememba enega koraka ne več tveganja celotnega `App.tsx`, lažji pregled,
manjši količnik pri uvozu in lažje pisanje testov (komponente se testirajo posamično).

## 2. UI testi (jsdom + Testing Library)

Dodane odvisnosti (dev): `jsdom`, `@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`. Vitest privzeto teče v okolju `node` (hitri testi logike);
UI testi uporabljajo oznako `// @vitest-environment jsdom` v prvi vrstici datoteke.
Skupna nastavitev: `src/tests/setup.ts` (fake-indexeddb, `URL.createObjectURL`, `matchMedia`).

| Datoteka | Kaj preverja |
|---|---|
| `src/tests/ui/App.test.tsx` | ustvarjanje projekta, **preživetje osvežitve** (projekt se znova naloži iz IndexedDB), brisanje projekta, preklic brisanja |
| `src/tests/ui/components.test.tsx` | `ErrorBoundary` ulovi napako, urejevalnik segmentov vrne posodobljen azimut, izbira Roksal profila vrne `profileId` |

Testi so **ponovljivi** (101/101 trikrat zaporedoma brez flake) in neodvisni od vrstnega
reda (vsak test začne s prazno bazo in čistim `localStorage`).

## 3. Drobne izboljšave ob prenosu
- `MaterialView`: oznake so povezane s polji (`htmlFor`/`id`) — deluje `getByLabelText`
  in je bolj dostopno (pred tem je bil dostop do polj samo z miško).
- `QualityBadge` in `StatusIcon` sta izvozena iz `QualityCheckView` (uporablja ju tudi
  `CaptureView`).

## 4. Dve težavi, ki ju je pokazal CI (in popravki)

**a) `jsdom@30` ne deluje na Node 20.** `jsdom 30` → `undici 8` uporablja
`zlib.createZstdDecompress`, ki ga Node 20 še nima → ob zagonu UI testov:
`Cannot read properties of undefined (reading 'bind')`. Znižano na `jsdom@^26.1.0`
(undici 6), ki deluje na Node 18+. Preverjeno lokalno na Node 20.20.2, Node 22 in Node 24.

**b) `npm ci` v CI je redno odpovedal.** `@huggingface/transformers` ima odvisnost
`onnxruntime-node`, katere install skripta prenese ~100 MB naravnih binarnih datotek
z CDN-ja (`ETIMEDOUT`). Ta vezava za brskalnik ni potrebna (tam se uporablja
`onnxruntime-web`/WASM). Rešitev: repo-level `.npmrc` z `ignore-scripts=true`, kar
onemogoča skripte, ki prenašajo binarne artefakte. Preverjeno: `npm ci` brez napake,
build še vedno vsebuje WASM (dist 27 MB), 101/101 testov.

To je dober primer, zakaj CI ni le »formalnost« — obe napaki bi v produkciji pomenili
neuspelo namestitev odvisnosti pri uporabniku.

## Preverjanje
`typecheck` ✅ · `lint` ✅ 0 napak · `vitest` ✅ **101/101** · `test-runner` 21/21 ·
`test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Lokalne slike za galerijo** — danes 18 vroče-povezanih slik z `roksal.com`
   (licenca, offline).
2. **`TradeCapture` shranjuje posnetke le v pomnilniku** — ob zaprtju so izgubljeni;
   vključiti v shrambo fotografij istega projekta.
3. **Skupni model ograje** — panelna (`geometry.ts`) in deskna (`fenceConstruction.ts`)
   sta še dva modela; povezani sta prek `roksalRules.ts`.
4. **Več UI testov** — meritve na platnu (risanje), izvoz CSV/JSON, PDF.
