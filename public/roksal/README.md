# Struktura map za Roksal slike

Ta dokument opisuje strukturo map za lokalne Roksal slike in teksture.

## Struktura

```
public/roksal/
├── images/              # Originalne fotografije dokončanih ograj
│   ├── vertical/        # Pokončne ograje
│   ├── horizontal/      # Prečne ograje
│   └── stairs/          # Stopniščne ograje
├── profiles/            # Fotografije posameznih profilov
├── swatches/
│   ├── source/          # Izvirne barvne lestvice
│   └── crops/           # Izrezani posamezni vzorci
└── textures/            # Teksture za vizualizacijo
    ├── vertical/        # Teksture za pokončne deske
    └── horizontal/      # Teksture za prečne deske
```

## Status

**⚠️ OMEJITEV OKOLJA:**

V trenutnem razvojnem okolju **NI MOGOČE** neposredno prenesti slik z roksal.com. 

Za prenos slik je potrebno:
1. Ročno prenesti slike z uradnih Roksal strani
2. Shraniti jih v ustrezne mape
3. Posodobiti `src/data/roksalGallery.ts` z lokalnimi potmi

## Navodila za prenos

### 1. Prenos originalnih slik

Obiščite naslednje strani in prenesite slike:

**Glavna stran:**
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/

**Pokončne ograje:**
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-ograja-pokoncna/

**Prečne ograje:**
- https://roksal.com/woodcore-wpc-deske/balkonske-ograje-in-dvoriscne-ograje/wpc-precna-ograja/

**Barvni odtenki:**
- https://roksal.com/woodcore-wpc-deske/barvni-odtenki/

### 2. Organizacija slik

Shranite slike v ustrezne mape glede na kategorijo:
- Izvedbe ograj → `public/roksal/images/`
- Profili → `public/roksal/profiles/`
- Barvne lestvice → `public/roksal/swatches/source/`

### 3. Izrezovanje vzorcev

Iz barvnih lestvic izrežite posamezne vzorce:
- Uporabite slikovni urejevalnik (GIMP, Photoshop, itd.)
- Izrežite samo notranjost vzorca (brez obrobe in besedila)
- Shranite v `public/roksal/swatches/crops/`

### 4. Priprava tekstur

Iz izrezanih vzorcev pripravite teksture:
- Ohranite originalno strukturo in barvo
- Ne raztezajte majhnih vzorcev čez celotno desko
- Shranite v `public/roksal/textures/`

## Seznam slik za prenos

Glejte `src/data/roksalGallery.ts` za popoln seznam slik z URL-ji.
