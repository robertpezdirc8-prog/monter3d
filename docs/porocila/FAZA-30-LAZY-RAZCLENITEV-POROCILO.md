# FAZA 30 — LAZY NALAGANJE RAZVOJNIH PRIKAZOV + RAZČLENITEV `GuidedCapture`

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## 1. Lazy nalaganje (manjši začetni paket)
`MathTestRunner` (razvojni prikaz matematičnih testov) in `MeasurementAccuracyTests` sta bila
del začetnega paketa, čeprav ju monter uporablja le v izjemnih primerih. Zdaj se
naložita **šele ob potrebi** (`React.lazy` + `Suspense`).

Učinek: začetni paket je manjši za ~13 kB, ob naloganju aplikacije se razvojni prikazi
ne parseirajo, kar je na terenu (šibka povezava) opazno hitrejše odpiranje.

## 2. Razčlenitev `GuidedCapture` (587 → 201 vrstic)
Komponenta je vsebovala **400 vrstic podatkov** (navodila za voden zajem po vrstah
objektov) in le ~180 vrstic logike. Podatki so zdaj v `src/data/captureSequences.ts`
(»podatki ločeni od komponente« — tipičen vzorec, ki olajša vzdrževanje in testiranje),
`defaultSequenceFor(objectType)` pa izbiro privzete vrste zajema.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **192/192** (2× zaporedoma) ·
`test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Kaj ostane
1. **Preostale večje komponente** — `MathTestRunner` (577, razvojni prikaz),
   `FenceVisualizer` (442), `CameraCapture` (412).
2. **Sinhronizacija med napravami** — za zdaj varen prenos prek varnostne kopije.
3. **Enote vnosa (mm/cm)** poleg metrov — monterji pogosto delajo v centimetrih.
