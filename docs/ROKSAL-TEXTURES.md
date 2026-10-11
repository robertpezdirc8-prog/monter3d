# Roksal Texture Assets

## ⚠️ POMEMBNO OPOZORILO

**AI-generirane teksture NISO originalni Roksal vzorci.**

Teksture, ustvarjene med Fazno 5, so bile generirane z AI na podlagi barvnih odtenkov iz Roksal kataloga. Te teksture:
- ❌ Niso originalni Roksal izdelki
- ❌ Ne prikazujejo dejanske strukture WPC desk
- ❌ Se NE uporabljajo v aplikaciji
- ❌ Ne smejo biti prikazane strankam kot originalni vzorci

## Originalni Roksal viri

Za originalne Roksal slike in barvne vzorce glejte:
- **Galerija slik:** `src/data/roksalGallery.ts`
- **Komponenta za prikaz:** `src/components/RoksalGalleryView.tsx`
- **Uradna spletna stran:** https://roksal.com/

Vse originalne slike so last podjetja Roksal d.o.o. in se uporabljajo z dovoljenjem.

---

## AI-generirane teksture (NEUPORABNE)

Med razvojem so bile ustvarjene naslednje AI teksture za Roksal WPC profile:

### 1. Anthracite (temno siva)
- **URL:** https://image.qwenlm.ai/generated-images/900b449a-9a82-482a-a8e0-adcb47aafe3e/_result.png
- **Barva:** Anthracite (#383838)
- **Uporaba:** POLNA DESKA 100, ROMB DESKA 67, POLNA DESKA 128
- **Opis:** Temno siva WPC tekstura z realističnim vzorcem lesnih vlaken

### 2. Golden Oak (topla zlato-rjava)
- **URL:** https://image.qwenlm.ai/generated-images/5564e02d-11d1-4f1d-8e62-90441175df45/_result.png
- **Barva:** Golden (#c9a961)
- **Uporaba:** POLNA DESKA 100, ROMB DESKA 67, POLNA DESKA 128, DESKA 150
- **Opis:** Topla zlato-rjava WPC tekstura z naravnimi variacijami

### 3. Ash (svetlo bež)
- **URL:** https://image.qwenlm.ai/generated-images/5de42740-054f-436c-8c1e-07da7980a487/_result.png
- **Barva:** Ash (#b8a89a)
- **Uporaba:** POLNA DESKA 57/32, POLNA DESKA 100, ROMB DESKA 67, POLNA DESKA 128
- **Opis:** Svetlo bež WPC tekstura s subtilnimi variacijami

### 4. Amazon/Burma (temno rjava)
- **URL:** https://image.qwenlm.ai/generated-images/14de30b7-abc5-484c-b305-09fb2ef4957f/_result.png
- **Barva:** Amazon (#5d4037) / Burma (#6d4c41)
- **Uporaba:** POLNA DESKA 100, ROMB DESKA 67, DESKA 150
- **Opis:** Temno rjava WPC tekstura z naravnim vzorcem lesa

## Navodila za uporabo

### Prenos tekstur
1. Odprite zgornje URL-je v brskalniku
2. Shranite slike v mapo `public/textures/`
3. Preimenujte datoteke v:
   - `anthracite.png`
   - `golden-oak.png`
   - `ash.png`
   - `amazon.png`

### Integracija v aplikacijo
Teksture se uporabljajo v `FenceVisualizer.tsx` komponenti za prikaz realističnih WPC desk na fotografijah.

### Omejitve
- **Približne teksture:** Ustvarjene teksture so približki na podlagi barvnih odtenkov iz Roksalovega kataloga
- **Ni fotografski dokaz:** Za natančno ujemanje barv uporabite fizične vzorce
- **Pravice uporabe:** Preverite pravice za uporabo tekstur v končni distribuciji aplikacije

## Barvni odtenki iz uradnega kataloga

Natančni barvni odtenki so dokumentirani v `src/data/roksalCatalog.ts`:
- Vir: https://roksal.com/woodcore-wpc-deske/barvni-odtenki/
- Hex vrednosti so približki na podlagi vizualnega pregleda barvnih lestvic
- Za produkcijo priporočamo uporabo fizičnih vzorcev za natančno ujemanje

## Naslednji koraki

1. Prenesite teksture in jih shranite v `public/textures/`
2. Posodobite `FenceVisualizer.tsx` za uporabo tekstur namesto solid barv
3. Testirajte vizualizacijo na realnih fotografijah
4. Po potrebi prilagodite teksture za boljše ujemanje z dejanskimi izdelki
