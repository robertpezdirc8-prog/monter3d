# FAZA 17 — UPRAVLJANJE NAPAK UPORABNIKA (brisanje in izključitev)

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
Aplikacija je bila v glavnem toku **read-only** za napake uporabnika:
- **meritve ni bilo mogoče izbrisati** — napačna meritva je ostala v projektu in je
  napihnila dolžino ograje, količine in predračun;
- **fotografije ni bilo mogoče izbrisati** — zamegljen ali nepotreben posnetek je ostal
  v projektu (brisanje je bilo možno samo v obrtnem zajemu);
- **meritve ni bilo mogoče izključiti** iz načrta — posnetek, ki je namenjen le
  dokumentaciji, je prispeval dolžino.

Za terensko uporabo (npr. napačno odmerjena dolžina) je to pomenilo, da je predračun
lahko tiho napačen — najslabši scenarij za monterja.

## Rešitev
1. **Brisanje meritve** (korak Meritve): gumb 🗑 ob vsaki meritvi. Če je bil izračunan
   načrt, se ga **samodejno preračuna**, da izbrisana dolžina ne ostane v predračunu.
2. **Izključitev meritve iz načrta**: potrditveno polje »v načrtu / izključena« pri vsaki
   meritvi. Nov flag `Measurement.excludedFromPlan` ga izloči iz
   `selectFenceLengthMeasurements` → ni v dolžini, količinah in predračunu, ostane pa
   v projektu kot dokumentacija.
3. **Brisanje fotografije** (korak Zajem): gumb 🗑 na vsaki miniaturi; fotografija se
   izbriše iz shrambe in iz stanja, izbrana pa se odstrani.
4. `calculateFence` sprejme seznam meritev za preračun (`measurementsOverride`) — z
   varovalko, da klik dogodek ne more biti misinterpreted kot seznam.

## Testi
`src/tests/ui/qualityStep.test.tsx` (dopolnitev):
- meritev se izbriše in ne ostane v načrtu;
- izključena meritev ne prispeva k dolžini v načrtu;
- ročno vnesena dolžina je še vedno v načrtu in predračunu.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **145/145** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Uvoz/izvoz po merilih** — trenutno je filtriranje po barvi/profilu le v galeriji;
   v katalogu bi koristilo iskanje po profilu/barvi.
2. **Zgodovina sprememb projekta** — »undo« za brisanje meritve bi bilo prijazno, a
   zahteva zgodovino stanja.
3. **Skupni model ograje** — panelna in deskna konstrukcija sta povezana prek
   `roksalRules.ts` in `boardFence.ts`, a še vedno ločena modela.
