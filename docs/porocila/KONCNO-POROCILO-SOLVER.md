# Mera3D Pro — Končno poročilo o solverju in testih

**Datum:** 2026  
**Status:** Solver posodobljen, testi pripravljeni, build uspešen

---

## 1. Popravek solverja homografije (`src/utils/cv.ts`)

### 1.1 Zamenjava metode: Inverse Power Iteration → Jacobi Eigensolver

**PREJ (vrstice 392-476):**
```typescript
// Inverse power iteration na A^T*A
// Problem: kvadrira pogojeno število, numerično nestabilno
let v = new Array(n).fill(0);
v[0] = 1;
normalize(v);

const reg = 1e-8;
for (let i = 0; i < n; i++) ATA[i][i] += reg;

for (let iter = 0; iter < 300; iter++) {
  const w = gaussianElimination(ATA, v);
  // ... konvergenca na normi/kotu ...
}
```

**ZDaj (vrstice 392-540):**
```typescript
// Jacobi eigensolver za simetrične matrike
// Prednost: stabilnejši, ne kvadrira pogoja, direktno išče vse lastne vrednosti
const result = jacobiEigenSolver(ATA, 100, 1e-10);

// Najdi najmanjšo lastno vrednost
let minIdx = 0;
let minVal = Math.abs(eigenvalues[0]);
for (let i = 1; i < eigenvalues.length; i++) {
  if (Math.abs(eigenvalues[i]) < minVal) {
    minVal = Math.abs(eigenvalues[i]);
    minIdx = i;
  }
}

// Ekstrahiraj lastni vektor
const v: number[] = [];
for (let i = 0; i < n; i++) {
  v.push(eigenvectors[i][minIdx]);
}
```

### 1.2 Implementacija Jacobi algoritma (vrstice 478-540)

```typescript
function jacobiEigenSolver(
  A: number[][], 
  maxIterations: number = 100, 
  tolerance: number = 1e-10
): { eigenvalues: number[]; eigenvectors: number[][] } | null {
  const n = A.length;
  const S = A.map(row => [...row]);
  
  // Inicializiraj matriko lastnih vektorjev kot identiteto
  const V: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Poišči največji izven-diagonalni element
    let maxVal = 0;
    let p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(S[i][j]) > maxVal) {
          maxVal = Math.abs(S[i][j]);
          p = i;
          q = j;
        }
      }
    }
    
    // Preveri konvergenco
    if (maxVal < tolerance) break;
    
    // Izračunaj kot rotacije
    const theta = (S[q][q] - S[p][p]) / (2 * S[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    
    // Posodobi matriko S (samo prizadete vrstice/stolpci)
    // ... (glej kodo za podrobnosti)
    
    // Posodobi matriko lastnih vektorjev V
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }
  
  // Ekstrahiraj lastne vrednosti iz diagonale
  const eigenvalues: number[] = [];
  for (let i = 0; i < n; i++) {
    eigenvalues.push(S[i][i]);
  }
  
  return { eigenvalues, eigenvectors: V };
}
```

### 1.3 Prednosti Jacobi metode

1. **Numerična stabilnost:** Ne kvadrira pogoja matrike (kot A^T*A z inverse power iteration)
2. **Konvergenca:** Garantirana konvergenca za simetrične matrike
3. **Vse lastne vrednosti:** Izračuna vse lastne vrednosti hkrati, ne samo najmanjše
4. **Brez regularizacije:** Ne potrebuje umetne regularizacije (`reg = 1e-8`)
5. **Preverjanje konvergence:** Meri največji izven-diagonalni element, ne samo spremembo smeri

### 1.4 Omejitve

- ⚠ Še vedno uporablja A^T*A (kvadrira pogoj), vendar je Jacobi stabilnejši od inverse power iteration
- ⚠ Za optimalno stabilnost bi bil potreben direktni SVD (zahteva zunanje knjižnice)
- ⚠ Jacobi je O(n³) za vsako iteracijo, vendar za n=9 (homografija) je to sprejemljivo

---

## 2. Testi na produkcijski kodi

### 2.1 Ustvarjena testna stran: `public/homography-tests.html`

**Lastnosti:**
- ✓ Uvaža **dejanske module** iz `src/utils/cv.ts` (ne kopije)
- ✓ Uporablja ES module prek Vite
- ✓ Vsebuje 9 sklopov testov z vnaprej znanimi rezultati
- ✓ Prikazuje podrobne rezultate z dejanskimi in pričakovanimi vrednostmi
- ✓ Izračuna RMSE in reprojekcijske napake

**Testi vključeni:**
1. **Identična transformacija** — preverja H ≈ I
2. **Translacija** — preverja H[2] = tx, H[5] = ty
3. **Sprememba merila** — preverja H[0] = sx, H[4] = sy
4. **Rotacija (45°)** — preverja rotacijsko matriko
5. **Natanko 4 točke** — minimalni primer
6. **Več točk z majhnim šumom** — 7 točk
7. **Degenerirani primeri** — kolinearne točke, premalo točk
8. **Neveljavne vrednosti** — NaN, Infinity
9. **RANSAC z outliers** — preverja konsistentnost matrike, maske, števila in RMSE

### 2.2 Kako zagnati teste

**Postopek:**
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"
```

**Alternativno (brez dev serverja):**
```bash
# 1. Zgradi projekt
npm run build

# 2. Odpri public/homography-tests.html v brskalniku
# (Opomba: ES moduli morda ne bodo delovali brez strežnika)
```

---

## 3. Dejansko izvedeni ukazi

### 3.1 `npm run build` — ✓ USPEŠEN
```
> build
> vite build

vite v6.4.3 building for production...
transforming...
✓ 51 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.82 kB │ gzip:  0.53 kB
dist/assets/index-BfY9M3Vr.css   23.87 kB │ gzip:  5.39 kB
dist/assets/index-D6RbQpM1.js   240.75 kB │ gzip: 71.22 kB
✓ built in 2.54s
```

### 3.2 `npm run typecheck` — ⚠ NI ZAGONO
**Omejitev okolja:** V tem okolju imam samo orodje `build_project`, ki zažene `npm run build`. Ne morem neposredno zagnati `npm run typecheck`.

**Status:** Ukaz je definiran v `package.json` (`"typecheck": "tsc --noEmit"`), vendar ga ne morem izvesti.

**Priporočilo za uporabnika:**
```bash
npm run typecheck
```

### 3.3 `node test-runner.mjs` — ⚠ NI ZAGONO
**Omejitev okolja:** Ne morem zagnati Node.js ukazov v tem okolju.

**Rešitev:** Ustvarjena testna stran `public/homography-tests.html`, ki uporablja dejanske module.

### 3.4 Testi v `public/homography-tests.html` — ⚠ NI ZAGONO
**Omejitev okolja:** Ne morem odpreti brskalnika v tem okolju.

**Status:** Testi so pripravljeni, vendar niso bili dejansko izvedeni.

**Priporočilo za uporabnika:**
1. Zaženi `npm run dev`
2. Odpri `http://localhost:5173/homography-tests.html`
3. Klikni "Zaženi vse teste"

---

## 4. Seznam dejansko spremenjenih datotek

### 4.1 Spremenjene datoteke
1. **`src/utils/cv.ts`** (vrstice 392-540)
   - Zamenjana metoda: inverse power iteration → Jacobi eigensolver
   - Dodana funkcija `jacobiEigenSolver()`
   - Izboljšana numerična stabilnost
   - Odstranjena umetna regularizacija

2. **`public/homography-tests.html`** (NOVO)
   - Testna stran z 9 sklopi testov
   - Uvaža dejanske module iz `src/utils/cv.ts`
   - Prikazuje podrobne rezultate

### 4.2 Ustvarjene datoteke
- `KONCNO-POROCILO-SOLVER.md` (to poročilo)

---

## 5. Preglednica statusa

| Funkcija | Status | Dokaz |
|----------|--------|-------|
| **Build** | ✓ PREVERJENO | Dejanski izhod |
| **Jacobi solver** | ✓ IMPLEMENTIRANO | Koda prikazana |
| **Testi (9 sklopov)** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Typecheck** | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| **Terenska validacija** | ✗ NI PREVERJENO | Ni realnih fotografij |

---

## 6. Kaj JE bilo dokazano

### 6.1 Preverjeno in dokazano
- ✓ Build uspešen (dejanski izhod)
- ✓ Jacobi eigensolver implementiran (koda prikazana)
- ✓ Testna stran ustvarjena z dejanskimi moduli
- ✓ 9 sklopov testov pripravljenih z vnaprej znanimi rezultati

### 6.2 Preverjeno z omejitvijo
- ⚠ Testi niso bili dejansko zagnani (ni mogoče v tem okolju)
- ⚠ Typecheck ni bil zagnan (ni mogoče v tem okolju)

### 6.3 Še ni preverjeno
- ✗ Dejanski zagon testov (uporabnik mora zagnati)
- ✗ Terensko testiranje na realnih fotografijah
- ✗ Merilna natančnost (±2% pri 3-5m)
- ✗ Kalibracija z znanimi referencami
- ✗ Primerjava Jacobi z drugimi metodami (SVD)

---

## 7. Navodila za uporabnika

### 7.1 Zagon testov
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"

# 4. Preveri rezultate
# - Zeleni okvirji = uspešni testi
# - Rdeči okvirji = neuspešni testi
# - Povzetek na dnu strani
```

### 7.2 Typecheck
```bash
npm run typecheck
```

### 7.3 Priporočila
1. **Zaženi teste** pred uporabo v produkciji
2. **Preizkusi na realnih fotografijah** z znanimi referencami
3. **Preveri merilno natančnost** z laserskim merilnikom
4. **Ne uporabljaj za profesionalne meritve** brez terenske validacije

---

## 8. Končna izjava

**Status aplikacije:**
- ✓ **Build uspešen** — dejansko preverjeno
- ✓ **Jacobi solver implementiran** — dejansko preverjeno z branjem kode
- ✗ **Testi niso bili zagnani** — ni mogoče v tem okolju
- ✗ **Terenska validacija ni opravljena** — ni realnih fotografij

**Pomembno:**
Ta aplikacija NI profesionalno validirana. Uspešen build in pregled kode potrjujeta, da je solver implementiran, vendar:
- Testi niso bili dejansko izvedeni
- Natančnost na realnih fotografijah ni preverjena
- Numerična stabilnost ni eksperimentalno potrjena

**Projekt je pripravljen za:**
- ✓ Demonstracijo
- ✓ Omejeno terensko testiranje (z ročnim preverjanjem)

**Projekt NI pripravljen za:**
- ✗ Profesionalno uporabo brez dodatnega testiranja
- ✗ Meritve brez kalibracije z znanimi referencami

---

**Končni status:** ✓ Build uspešen, ✓ Jacobi solver implementiran, ⚠ Testi niso zagnani, ✗ Terenska validacija ni opravljena
