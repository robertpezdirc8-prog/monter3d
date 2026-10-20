# FAZA 25 — RAZČLENITEV KONFIGURATORJA OGRAJE

**Projekt:** Mera3D Pro (monter3d)
**Status:** ✅ zaključeno

---

## Problem
`FenceConfigurator.tsx` je bil z 781 vrsticami **največja komponenta** v projektu — vanj
so bila spravljena trije povsem različni vsebinska sklopa (vnosi, vizualni načrt, povzetek
in tehnični podatki) plus izvoz. Spreminjanje enega dela je tvegano, testi pa niso mogli
pokriti posameznega sklopa.

## Rešitev
Razčlenjeno v `src/components/configurator/` (koda prenesena brez sprememb obnašanja):

| Datoteka | Vsebina | Vrstic |
|---|---|---|
| `ConfiguratorInputs.tsx` | profil (z iskanjem), barva, orientacija, mere, razmik med deskami | 178 |
| `ConfiguratorPlan.tsx` | vizualni načrt montaže (SVG: stebri, nosilci, deske, ALU cev, vijaki) | 166 |
| `ConfiguratorSummary.tsx` | povzetek konstrukcije + tehnični podatki | 130 |

`FenceConfigurator.tsx` je tako z 781 na **414 vrstic** — skrbi za stanje, naravnojezikovni
vnos, validacijo in postavitev; vizualni deli so ločeni in tipizirani (`ConfiguratorPlanProps`
ipd.).

## Testi
Nov UI test (`Konfigurator ograje`): iskanje profila filtrira seznam, izbira profila in
»Uporabi v projektu« posreduje konfiguracijo naprej. S tem je razčlenitev pokrita — če bi
kateri od izluščenih sklopov ne deloval, bi test to ujel.

## Preverjanje
`typecheck` (tsc + ESLint 10) ✅ 0 opozoril · `vitest` ✅ **178/178** (3× zaporedoma, tudi
na Node 20) · `test-runner` 21/21 · `test-homography` 40/40 · `build` ✅

## Opomba
Med razčlenitvijo se je pokazalo pravilo izkušenj: **izrezani blok JSX ne sme biti na vrhu
`return (…)`** — takšen blok mora biti ovjen v fragment (`<>…</>`), sicer TypeScript
interpretira `return (` kot izraz in vrže napako pri razčlenitvi. Testi so to ujeli takoj.

## Kaj ostane
1. **Preostale večje komponente** — `GuidedCapture` (587), `MathTestRunner` (577),
   `MeasurementOverlay` (450), `FenceVisualizer` (442), `CameraCapture` (412).
2. **Skupni model ograje** — panelna in deskna konstrukcija sta povezana, a še dva modela.
3. **Pregled zgodovine** (»kaj je bilo narejeno«) in **sinhronizacija med napravami**.
