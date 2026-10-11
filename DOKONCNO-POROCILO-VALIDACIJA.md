# Mera3D Pro — Dokončno poročilo o validaciji QR-solverja

**Datum:** 2026  
**Status:** QR-solver implementiran, build uspešen, testi pripravljeni (ne izvedeni)

---

## 1. Pregled QR-solver implementacije

### 1.1 Funkcija `solveHomogeneousSystem()` (vrstice 392-451)

```typescript
function solveHomogeneousSystem(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  // Validacija: vsaj 4 enačbe, 9 neznank
  if (m < 4) return null;
  if (n !== 9) return null;
  
  // Preveri neveljavne vrednosti
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (!isFinite(A[i][j])) return null;
    }
  }
  
  let v: number[];
  
  if (m >= n) {
    // Tall/square: one-sided Jacobi SVD na A
    const result = oneSidedJacobiSVD(A, 100, 1e-10);
    if (!result) return null;
    
    const { singularValues, V } = result;
    let minIdx = 0;
    let minVal = Math.abs(singularValues[0]);
    for (let i = 1; i < singularValues.length; i++) {
      if (Math.abs(singularValues[i]) < minVal) {
        minVal = Math.abs(singularValues[i]);
        minIdx = i;
      }
    }
    
    v = [];
    for (let i = 0; i < n; i++) {
      v.push(V[i][minIdx]);
    }
  } else {
    // Wide matrix (npr. 8×9 za 4 točke)
    // QR-based null space computation
    const nullSpaceResult = computeNullSpaceQR(A);
    if (!nullSpaceResult) return null;
    v = nullSpaceResult;
  }
  
  // Preveri veljavnost
  if (v.some(x => !isFinite(x))) return null;
  
  // Preveri residual ||A * v||
  const residual = computeResidual(A, v);
  if (residual > 1e-6) return null;
  
  return v;
}
```

### 1.2 Funkcija `computeNullSpaceQR()` (vrstice 618-709)

```typescript
function computeNullSpaceQR(A: number[][]): number[] | null {
  const m = A.length;
  const n = A[0].length;
  
  if (m >= n) return null; // Samo za široke matrike
  
  // Transponira A v A^T (n×m)
  const AT: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      AT[j][i] = A[i][j];
    }
  }
  
  // QR dekompozicija A^T z Householderjevimi reflektzijami
  // A^T = Q * R, kjer je Q ortogonalna (n×n), R zgornje trikotna (n×m)
  const Q: number[][] = Array.from({ length: n }, (_, i) => 
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
  const R = AT.map(row => [...row]);
  
  for (let k = 0; k < m; k++) {
    // Izračunaj Householderjev vektor za stolpec k
    let norm = 0;
    for (let i = k; i < n; i++) {
      norm += R[i][k] * R[i][k];
    }
    norm = Math.sqrt(norm);
    
    if (norm < 1e-15) continue;
    
    const sign = R[k][k] >= 0 ? 1 : -1;
    const alpha = -sign * norm;
    
    const v: number[] = new Array(n).fill(0);
    for (let i = k; i < n; i++) {
      v[i] = R[i][k];
    }
    v[k] -= alpha;
    
    // Normaliziraj v
    let vNorm = 0;
    for (let i = k; i < n; i++) {
      vNorm += v[i] * v[i];
    }
    vNorm = Math.sqrt(vNorm);
    
    if (vNorm < 1e-15) continue;
    
    for (let i = k; i < n; i++) {
      v[i] /= vNorm;
    }
    
    // Uporabi Householderjevo reflektijo na R
    for (let j = k; j < m; j++) {
      let dot = 0;
      for (let i = k; i < n; i++) {
        dot += v[i] * R[i][j];
      }
      for (let i = k; i < n; i++) {
        R[i][j] -= 2 * v[i] * dot;
      }
    }
    
    // Uporabi Householderjevo reflektijo na Q
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = k; j < n; j++) {
        dot += Q[i][j] * v[j];
      }
      for (let j = k; j < n; j++) {
        Q[i][j] -= 2 * dot * v[j];
      }
    }
  }
  
  // Zadnji stolpec Q (indeks n-1) je v ničelnem prostoru A
  // Za homografijo s 4 točkami: n=9, m=8, ničelni prostor je 1D
  const nullVector: number[] = [];
  for (let i = 0; i < n; i++) {
    nullVector.push(Q[i][n - 1]);
  }
  
  // Preveri, ali je res v ničelnem prostoru: ||A * nullVector|| naj bo majhen
  const residual = computeResidual(A, nullVector);
  if (residual > 1e-6) return null;
  
  return nullVector;
}
```

### 1.3 Analiza algoritma

**Koraki:**
1. Transponira A (8×9) v A^T (9×8)
2. QR dekompozicija A^T = Q*R z Householderjevimi reflektijami
3. Q je 9×9 ortogonalna matrika
4. Zadnji stolpec Q (indeks 8) je vektor ničelnega prostora A
5. Preveri residual ||A * nullVector|| < 1e-6

**Prednosti:**
- ✓ Ne kvadrira pogojenosti (ne uporablja A^T*A)
- ✓ QR dekompozicija je numerično stabilna
- ✓ Householderjeve reflektije ohranjajo ortogonalnost
- ✓ Preverjanje residuala zagotavlja pravilnost

**Teoretična utemeljitev:**
- Za matriko A (8×9) z rangom 8 je ničelni prostor 1-dimenzionalen
- QR dekompozicija A^T (9×8) da Q (9×9) in R (9×8)
- Zadnji stolpec Q je ortogonalen na vse stolpce R
- Ker je R = Q^T * A^T, je zadnji stolpec Q ortogonalen na vse vrstice A^T
- To pomeni, da je v ničelnem prostoru A

---

## 2. Testi

### 2.1 Testna datoteka: `test-homography.js`

**Uvoz funkcij:**
```javascript
import { estimateHomography, ransacHomography } from './src/utils/cv.ts';
```

✓ Testi uvažajo **dejanske funkcije** iz `src/utils/cv.ts`, ne kopij.

**Testi vključeni (8 sklopov):**

1. **Identična transformacija** (4 točke)
   - Pričakovano: H ≈ I, RMSE ≈ 0
   
2. **Translacija** (4 točke)
   - tx=10, ty=20
   - Pričakovano: H[2]=10, H[5]=20, RMSE < 0.1
   
3. **Sprememba merila** (4 točke)
   - sx=2, sy=3
   - Pričakovano: H[0]=2, H[4]=3, RMSE < 0.1
   
4. **Perspektivna transformacija** (4 točke)
   - Splošna homografija
   - Pričakovano: RMSE < 0.5
   
5. **Več točk z majhnim šumom** (7 točk)
   - Šum ±0.5 pikslov
   - Pričakovano: RMSE < 2
   
6. **Degenerirane/kolinearne točke**
   - Pričakovano: vrne null
   
7. **Neveljavne koordinate**
   - NaN, Infinity
   - Pričakovano: vrne null
   
8. **RANSAC z znanimi napačnimi ujemanji**
   - 6 točk, 1 outlier
   - Pričakovano: pravilno identificira outlier, konsistentni RMSE

### 2.2 Testna stran: `public/homography-tests.html`

Obstaja tudi spletna testna stran z enakimi testi, ki uvaža dejanske funkcije:

```javascript
import { estimateHomography, ransacHomography } from './src/utils/cv.ts';
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
dist/assets/index-B27yWADA.js   241.51 kB │ gzip: 71.41 kB
dist/assets/index-BfY9M3Vr.css   23.87 kB │ gzip:  5.39 kB
✓ built in 2.39s
```

### 3.2 `npm run typecheck` — ⚠ NI ZAGONO

**Omejitev okolja:** Orodje `run_command` ni na voljo. Imam samo `build_project`, ki zažene `npm run build`.

**Status:** Ni izvedeno.

**Priporočilo za uporabnika:**
```bash
npm run typecheck
```

### 3.3 `node test-homography.js` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem zagnati Node.js ukazov v tem okolju.

**Status:** Ni izvedeno.

**Postopek za uporabnika:**
```bash
node test-homography.js
```

### 3.4 Testi v `public/homography-tests.html` — ⚠ NI ZAGONO

**Omejitev okolja:** Ne morem odpreti brskalnika.

**Status:** Ni izvedeno.

**Postopek za uporabnika:**
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"
```

---

## 4. Preglednica statusa

| Kategorija | Status | Dokaz |
|------------|--------|-------|
| Build | ✓ USPEŠEN | Dejanski izhod |
| QR null space solver | ✓ IMPLEMENTIRANO | Koda prikazana |
| Ne kvadrira pogojenosti | ✓ DA | QR dekompozicija |
| Preverjanje residuala | ✓ DA | ||A * v|| < 1e-6 |
| Testi (8 sklopov) | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| Typecheck | ⚠ NI ZAGONO | Ni mogoče v tem okolju |
| Terenska validacija | ✗ NI PREVERJENO | Ni realnih fotografij |

---

## 5. Kaj JE bilo dokazano

### 5.1 Preverjeno in dokazano
- ✓ Build uspešen (dejanski izhod)
- ✓ QR-based null space solver implementiran (vrstice 618-709)
- ✓ Ne kvadrira pogojenosti (QR dekompozicija, ne A^T*A)
- ✓ Preverjanje residuala ||A * v|| < 1e-6
- ✓ Testi uvažajo dejanske funkcije iz `src/utils/cv.ts`
- ✓ 8 sklopov testov pripravljenih

### 5.2 Preverjeno z omejitvijo
- ⚠ Testi niso bili dejansko zagnani (ni mogoče v tem okolju)
- ⚠ Typecheck ni bil zagnan (ni mogoče v tem okolju)
- ⚠ Numerična stabilnost ni eksperimentalno potrjena

### 5.3 Še ni preverjeno
- ✗ Dejanski zagon testov (uporabnik mora zagnati)
- ✗ Terensko testiranje na realnih fotografijah
- ✗ Merilna natančnost (±2% pri 3-5m)
- ✗ Kalibracija z znanimi referencami

---

## 6. Navodila za uporabnika

### 6.1 Typecheck
```bash
npm run typecheck
```

### 6.2 Node.js testi
```bash
node test-homography.js
```

### 6.3 Spletni testi
```bash
# 1. Zaženi razvojni strežnik
npm run dev

# 2. Odpri v brskalniku
http://localhost:5173/homography-tests.html

# 3. Klikni "Zaženi vse teste"
```

### 6.4 Priporočila
1. **Zaženi typecheck** za preverjanje tipov
2. **Zaženi teste** (`node test-homography.js`) pred uporabo v produkciji
3. **Preveri rezultate** — vsi testi morajo biti uspešni
4. **Preizkusi na realnih fotografijah** z znanimi referencami
5. **Preveri merilno natančnost** z laserskim merilnikom
6. **Ne uporabljaj za profesionalne meritve** brez terenske validacije

---

## 7. Končna izjava

**Status aplikacije:**
- ✓ **Build uspešen** — dejansko preverjeno
- ✓ **QR null space solver implementiran** — dejansko preverjeno z branjem kode
- ✓ **Ne kvadrira pogojenosti** — QR dekompozicija
- ✓ **Preverjanje residuala** — ||A * v|| < 1e-6
- ✗ **Testi niso bili zagnani** — ni mogoče v tem okolju
- ✗ **Terenska validacija ni opravljena** — ni realnih fotografij

**Pomembno:**
Ta aplikacija NI profesionalno validirana. Uspešen build in pregled kode potrjujeta, da je solver implementiran, vendar:
- Testi niso bili dejansko izvedeni
- Natančnost na realnih fotografijah ni preverjena
- Numerična stabilnost ni eksperimentalno potrjena

**Projekt je pripravljen za:**
- ✓ Demonstracijo (po zagonu testov)
- ✓ Omejeno terensko testiranje (z ročnim preverjanjem)

**Projekt NI pripravljen za:**
- ✗ Profesionalno uporabo brez dodatnega testiranja
- ✗ Meritve brez kalibracije z znanimi referencami

---

## 8. Spremenjene datoteke

| Datoteka | Sprememba |
|----------|-----------|
| `src/utils/cv.ts` | QR-based null space solver (vrstice 618-709) |
| `test-homography.js` | Testna datoteka (obstaja od prej) |
| `public/homography-tests.html` | Testna stran (obstaja od prej) |

---

**Končni status:** ✓ Build uspešen, ✓ QR solver implementiran, ⚠ Testi niso zagnani, ✗ Terenska validacija ni opravljena
