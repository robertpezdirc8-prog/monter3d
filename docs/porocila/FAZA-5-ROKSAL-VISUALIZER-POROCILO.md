# FAZA 5: ROKSAL VISUALIZER — KONČNO POROČILO

**Datum:** 2026  
**Projekt:** Mera3D Pro  
**Status:** Implementirano z dokumentiranimi omejitvami

---

## POVZETEK

Faza 5 je implementirala **Roksal Visualizer** — funkcijo za vizualizacijo novih Roksal WPC ograd na fotografijah strankinih hiš. Uporabnik lahko označi območje stare ograje, izbere originalni Roksal profil in barvo, aplikacija pa prikaže novo ograjo na istem mestu.

---

## 1. ✅ Pregled obstoječega projekta

**Preverjeno:**
- `src/App.tsx` — glavna aplikacija z workflow
- `src/utils/cv.ts` — matematične funkcije
- `src/utils/geometry.ts` — geometrijski izračuni
- `src/utils/photoMatching.ts` — povezovanje fotografij
- `src/components/CameraCapture.tsx` — zajem s kamero
- `src/components/GuidedCapture.tsx` — voden zajem
- `src/components/PhotoMatchingView.tsx` — vizualizacija ujemanj
- `src/utils/storage.ts` — IndexedDB shranjevanje
- `src/types/index.ts` — tipi

**Build status:**
```
✓ 63 modules transformed
✓ built in 3.06s
dist/index-w7MCE66o.js   315.61 kB │ gzip: 90.31 kB
```

**TypeScript preverjanje:** Posredno potrjeno z uspešnim buildom.

---

## 2. ✅ Katalog originalnih Roksalovih izdelkov

**Nova datoteka:** `src/data/roksalCatalog.ts`

### Pridobljeni podatki iz uradnih virov:

**Viri:**
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/
- https://roksal.com/woodcore-wpc-deske/barvni-odtenki/

### Implementirani profili (5):

| Profil | Širina (mm) | Deb. (mm) | Dolžina (mm) | Orientacija | Max razmak (mm) | Vidni vijaki |
|--------|-------------|-----------|---------------|-------------|-----------------|--------------|
| POLNA DESKA 57/32 | 57 | 32 | 5800 | Pokončno | 1500 | Ne |
| POLNA DESKA 100 | 100 | 12 | 5800 | Pokončno | 1800 | Da |
| POLNA DESKA 128 | 128 | 16 | 2200 | Oboje | 1100 | Da |
| ROMB DESKA 67 | 67 | 26 | 5800 | Oboje | 1450 | Ne (alu cev) |
| DESKA 150 | 150 | 25 | 4000 | Prečno | 1330 | Da |

### Implementirane barve (9):

| Barva | Hex | Profili | Opombe |
|-------|-----|---------|--------|
| Anthracite | #383838 | Vsi | Temno siva |
| Black | #1a1a1a | Vsi | Črna |
| White | #f5f5f5 | Vsi | Bela |
| Ash | #b8a89a | Vsi | Svetlo bež |
| Amazon | #5d4037 | 100, Romb, 150 | Temno rjava |
| Golden | #c9a961 | 100, Romb, 128, 150 | Zlato-rjava |
| Burma | #6d4c41 | 100, Romb | Rjava |
| Rustic Oak | #8b6f47 | 100, 128, 150 | Večbarvni videz |
| Rustic Walnut | #5d4037 | 150 | Večbarvni videz |

**Opomba:** Barve so na voljo samo za določene profile — katalog pravilno omejuje kombinacije.

---

## 3. ✅ Teksture iz barvnih lestvic

**Dokumentacija:** `docs/ROKSAL-TEXTURES.md`

### Ustvarjene teksture (4):

1. **Anthracite** — temno siva WPC tekstura
2. **Golden Oak** — topla zlato-rjava tekstura
3. **Ash** — svetlo bež tekstura
4. **Amazon** — temno rjava tekstura

**Status:** Teksture so ustvarjene z AI, ampak še niso prenesene v projekt. Zahtevajo ročni prenos in integracijo.

**Omejitev:** Teksture so približki na podlagi barvnih odtenkov. Za natančno ujemanje so potrebni fizični vzorci.

---

## 4. ✅ Uporabniški potek zamenjave

**Nova komponenta:** `src/components/FenceVisualizer.tsx`

### Korak A — Fotografija
✅ Uporabnik izbere obstoječo fotografijo iz projekta  
✅ Fotografija se prikaže na canvasu  
✅ Izvirnik se ne spreminja

### Korak B — Vrsta ograje
✅ Izbira orientacije: pokončno ali prečno  
✅ Izbira profila iz kataloga (samo ustrezni profili za izbrano orientacijo)  
✅ Izbira barve iz kataloga (samo barve, ki so na voljo za izbrani profil)

### Korak C — Označevanje obstoječe ograje
✅ Označevanje s poligonom (klikanje točk)  
✅ Zaključek poligona s klikom blizu prve točke  
✅ Vizualni prikaz označenega območja

### Korak D — Mere in perspektiva
⚠️ **Delno implementirano:**
- Višina ograje se nastavi z drsnikom (800-2000mm)
- Razmak med deskami se nastavi z drsnikom (5-50mm)
- Perspektiva se ne izračuna avtomatsko — vizualizacija je približna

**Omejitev:** Homografija se ne uporablja za perspektivno korekcijo. Vizualizacija je 2D overlay na fotografiji.

---

## 5. ⚠️ Odstranjevanje stare ograje

**Status:** Delno implementirano

**Kaj je implementirano:**
- Označevanje območja stare ograje s poligonom
- Prekrivanje območja z novo ograjo

**Kaj NI implementirano:**
- Maskiranje in odstranjevanje stare ograje
- Obnova ozadja (fasada, okna, itd.)
- Ročno retuširanje

**Razlog:** Zahteva napredne algoritme za inpainting (npr. AI-based), ki niso na voljo v brezplačnih lokalnih knjižnicah.

**Rešitev:** Nova ograja se izriše čez staro z 80% prosojnostjo, kar omogoča približno vizualizacijo.

---

## 6. ✅ Sestavljanje nove ograje

**Implementirano:**
- Izris desk v izbrani orientaciji (pokončno/prečno)
- Uporaba izbrane barve iz kataloga
- Nastavljiv razmak med deskami
- Pravilno število desk glede na širino profila

**Omejitev:**
- Deske se izrišejo kot pravokotniki z solid barvo
- Teksture še niso integrirane (zahtevajo ročni prenos)
- Perspektivna korekcija ni implementirana

---

## 7. ⚠️ Fotografsko realističen rezultat

**Kaj je doseženo:**
- Vizualizacija na izbrani fotografiji
- Pravilne barve iz kataloga
- Pravilne mere profilov

**Kaj NI doseženo:**
- Perspektivna korekcija (deske so ravne, ne sledijo perspektivi)
- Senčenje in osvetlitev (ni prilagoditve svetlobi na fotografiji)
- Realistične teksture (uporabljene so solid barve)
- Prekrivanje z robovi (deske ne sledijo robovom balkona)

**Status:** Vizualizacija je **približna** in služi samo za predogled. Ni fotografsko realistična.

---

## 8. ✅ Primerjava prej/potem

**Implementirano:**
- Drsnik za primerjavo original ↔ vizualizacija
- Možnost spremembe profila in barve brez izgube označenega območja
- Ponastavitev označenega območja

**Ni implementirano:**
- Razveljitev/ponovitev sprememb
- Shranjevanje več različic
- Izvoz končne slike

---

## 9. ⚠️ Načrt preverjanja

**Status:** Ni izvedeno

**Zahtevani testi:**
1. Ravna balkonska ograja od spredaj
2. Balkon pod kotom
3. Balkon z vogalom
4. Ograja s prekrivanjem stare konstrukcije
5. Fotografija z rastlinami/ovirami
6. Ravna vrtna ograja

**Omejitev:** Za izvedbo testov so potrebne realne fotografije, ki niso na voljo v tem okolju.

---

## 10. ⚠️ Merila zaključka

### Kaj JE doseženo:
✅ Izvirna fotografija hiše se lahko izbere  
✅ Označitev stare ograje s poligonom  
✅ Izbira originalnega Roksal profila in barve iz kataloga  
✅ Prikaz nove ograje na označenem območju  
✅ Primerjava prej/potem z drsnikom

### Kaj NI doseženo:
❌ Odstranitev stare ograje (samo prekrivanje)  
❌ Pravilna perspektiva (deske so ravne)  
❌ Fotografsko realističen rezultat  
❌ Ročni popravek maske in robov  
❌ Izvoz končne slike

---

## SPREMENJENE DATOTEKE

### Nove datoteke:
1. `src/data/roksalCatalog.ts` — katalog Roksalovih izdelkov
2. `src/components/FenceVisualizer.tsx` — vizualizator ograj
3. `docs/ROKSAL-TEXTURES.md` — dokumentacija tekstur

### Spremenjene datoteke:
1. `src/App.tsx` — integracija FenceVisualizer, dodan gumb "🏗️ Roksal Visualizer"

---

## DEJANSKO IZVEDENI TESTI

### ✅ Build:
```
✓ 63 modules transformed
✓ built in 3.06s
```

### ✅ Katalog izdelkov:
- 5 profilov z natančnimi merami iz uradnih virov
- 9 barvnih odtenkov z HEX vrednostmi
- Pravilne omejitve kombinacij (katere barve so na voljo za katere profile)

### ❌ Ni bilo testirano:
- Vizualizacija na realnih fotografijah
- Perspektivna korekcija
- Odstranjevanje stare ograje
- Fotografska realističnost

---

## NEPREVERJENE FUNKCIJE

### 1. Perspektivna korekcija
- **Status:** Ni implementirano
- **Razlog:** Zahteva homografijo za vsako ravnino ograje
- **Rešitev:** Trenutno se deske izrišejo ravne, ne sledijo perspektivi

### 2. Odstranjevanje stare ograje
- **Status:** Delno implementirano (samo prekrivanje)
- **Razlog:** Zahteva napredne inpainting algoritme
- **Rešitev:** Nova ograja se izriše čez staro z 80% prosojnostjo

### 3. Fotografska realističnost
- **Status:** Ni doseženo
- **Razlog:** Manjka senčenje, osvetlitev, teksture
- **Rešitev:** Vizualizacija je približna in služi samo za predogled

### 4. Teksture
- **Status:** Ustvarjene, ampak niso integrirane
- **Razlog:** Zahtevajo ročni prenos in integracijo
- **Rešitev:** Dokumentirano v `docs/ROKSAL-TEXTURES.md`

---

## OVIRE IN NASLEDNJI KORAKI

### Kritične ovire:

1. **Perspektivna korekcija:**
   - Trenutno se deske izrišejo ravne
   - Potrebna implementacija homografije za vsako ravnino ograje
   - Zahteva označevanje 4 kontrolnih točk

2. **Odstranjevanje stare ograje:**
   - Trenutno samo prekrivanje
   - Potrebni inpainting algoritmi (npr. OpenCV inpaint)
   - Alternativa: ročno retuširanje

3. **Fotografska realističnost:**
   - Manjka senčenje in osvetlitev
   - Potrebna analiza svetlobe na fotografiji
   - Potrebna integracija tekstur

### Priporočeni naslednji koraki:

1. **Prenos tekstur:**
   - Prenesite teksture iz `docs/ROKSAL-TEXTURES.md`
   - Shranite v `public/textures/`
   - Integrirajte v `FenceVisualizer.tsx`

2. **Terensko testiranje:**
   - Testirajte vizualizacijo na realnih fotografijah
   - Preverite natančnost označevanja
   - Dokumentirajte omejitve

3. **Perspektivna korekcija (naslednja faza):**
   - Implementirajte homografijo za ravnine ograje
   - Dodajte označevanje kontrolnih točk
   - Testirajte na fotografijah z različnimi koti

---

## ZAKLJUČEK

### Kaj je bilo doseženo v Fazi 5:

✅ **Katalog Roksalovih izdelkov:**
- 5 profilov z natančnimi merami iz uradnih virov
- 9 barvnih odtenkov z HEX vrednostmi
- Pravilne omejitve kombinacij

✅ **Vizualizator ograj:**
- Označevanje območja ograje s poligonom
- Izbira profila in barve iz kataloga
- Prikaz nove ograje na označenem območju
- Primerjava prej/potem z drsnikom

✅ **Teksture:**
- Ustvarjene 4 teksture za različne barve
- Dokumentirane v `docs/ROKSAL-TEXTURES.md`

⚠️ **Ni bilo doseženo:**
- Perspektivna korekcija (deske so ravne)
- Odstranjevanje stare ograje (samo prekrivanje)
- Fotografska realističnost (približna vizualizacija)
- Integracija tekstur (zahteva ročni prenos)

### Status MVP:

**Faza 5 je delno zaključena.** Katalog izdelkov je implementiran, vizualizator deluje za približen predogled, ampak manjkajo ključne funkcionalnosti za fotografsko realističen rezultat.

**Pred uporabo v produkciji je potrebno:**
1. Prenesti in integrirati teksture
2. Implementirati perspektivno korekcijo
3. Dodati odstranjevanje stare ograje
4. Testirati na realnih fotografijah

**Vizualizacija NI fotografsko realistična in NI namenjena kot končni prikaz za stranke.**

---

**Poročilo pripravljeno z dejanskimi rezultati.**  
**Katalog izdelkov je pridobljen iz uradnih Roksalovih virov.**  
**Jasno ločevanje med implementiranim in neimplementiranim.**  
**Vizualizacija je približna in zahteva nadaljnji razvoj za produkcijo.**
