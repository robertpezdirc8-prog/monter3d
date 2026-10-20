# Stare testne strani (zgodovinsko)

Te strani so bila ročni testni prikazi iz zgodnjih faz razvoja (inline kopije
algoritmov, ki so danes v `src/utils/` in pokrite z vitest testi).

**Zakaj so odstranjene iz `public/`:** ker so bili delani v produkcijski build, podvajali
algoritme iz `src/` in so z vsako spremembo izvora zastareli. Vse, kar so preverjali,
je dane pokrito z avtomatiziranimi testi:

| Stara stran | Danes pokrito z |
|---|---|
| `test.html` (celovit testni komplet) | `src/tests/` (vitest) |
| `fence-tests.html` (konstrukcija ograje) | `src/tests/fenceConstruction.test.ts`, `src/tests/fenceCalculation.test.ts` |
| `homography-tests.html` (homografija) | `src/tests/homography.test.ts` + `test-homography.js` |

Arhivirane so tu zaradi zgodovine; v razvoju se ne uporabljajo.
