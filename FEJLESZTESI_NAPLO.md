# 📋 Fejlesztési napló – Foodtruck App

Ez a dokumentum két részből áll:

1. **Hogyan működik az alkalmazás most** – teljes, naprakész leírás
2. **Fejlesztési napló** – időrendi bejegyzések arról, mi mikor és miért változott

Minden jelentősebb módosítás után ezt a fájlt is frissítem, hogy mindig
visszakövethető legyen, mi történt a projekttel.

---

## 1. Hogyan működik az alkalmazás

### Áttekintés

A Foodtruck App egy **két tabletre** tervezett rendeléskezelő rendszer:

| Tablet | Fájl | Szerepe |
|---|---|---|
| Pénztáros | `index.html` | Rendelés felvétele, aktív rendelések listája, napi statisztika |
| Szakács | `kitchen.html` | Beérkező rendelések megjelenítése, elkészültük jelzése |

A két tablet **valós időben szinkronban van egymással** a Google Firebase
Realtime Database-en keresztül – nincs saját backend szerver, nincs build
folyamat, tiszta HTML/CSS/JavaScript.

```
foodtruck-app/
├── index.html          – Pénztáros felület (rendelésfelvitel)
├── kitchen.html         – Szakács felület (konyhai kijelző)
├── firebase-config.js   – Közös Firebase kapcsolódási adatok
└── TELEPITES.md         – Telepítési útmutató
```

### Adatmodell (Firebase Realtime Database)

**`orders`** – az aktív/eddigi rendelések, kulcs = Firebase-generált egyedi ID:
```javascript
{
  queue: 3,                 // Pager sorszám (1–16)
  items: [
    { name: "Cheeseburger", qty: 1, note: "" },
    { name: "Pljeskavica",  qty: 1, note: "hagyma nélkül" }
  ],
  status: "new" | "done",   // Konyhai állapot
  timestamp: 1782684888781  // Létrehozás ideje (ms)
}
```

**`dailyStats`** – tartósan tárolt napi összesítő (2026-07-02 óta, lásd napló):
```javascript
{
  orderCount: 12,                 // Hány rendelés érkezett a nullázás óta
  doneCount: 9,                   // Hány rendelést jelöltek KÉSZ-nek
  items: { "Cheeseburger": 8, "Pomfrit": 15, ... }  // Eladott tételek darabszáma
}
```

### Pénztáros oldal (`index.html`) működése

1. **Pager kiválasztása** – 16 gomb (1–16). Foglalt pagerek (amiknek van
   aktív, még nem törölt rendelése) szürkék és nem kattinthatók.
2. **Kosár összeállítása** – a "KAJÁK" menüből tételekre kattintva kerülnek
   a kosárba; azonos tétel duplikattintásra csak a darabszámot növeli.
   Minden tételhez írható egyedi megjegyzés (pl. "hagyma nélkül").
3. **Rendelés küldése** – a `sendOrder()` függvény:
   - ellenőrzi, hogy van-e kiválasztott pager és nem üres-e a kosár
   - felpusholja a rendelést az `orders` ághoz (`status: "new"`)
   - **ugyanekkor** növeli a `dailyStats` számlálóit (rendelésszám +
     tételenkénti darabszám) – ez a tartós statisztika, ami nem vész el,
     ha a rendelést utólag törlik
   - kiüríti a kosarat és a pager-kiválasztást
4. **Aktív rendelések listája** – valós időben frissül (`orders.on("value")`),
   legújabb felül, mindegyiken törlés gomb (`🗑️ Rendelés törlése`,
   megerősítést kér).
5. **Napi statisztika modal** (`📊 Napi statisztika megtekintése`):
   - a tartósan tárolt `dailyStats`-ból olvas, nem az aktív rendelésekből
   - mutatja: összes rendelés, ebből teljesített, eladott ételek
     darabszám szerint csökkenő sorrendben
   - **"🗑️ Statisztika nullázása" gomb**: megerősítés után nullázza a
     tárolt statisztikát (`dailyStats.set({orderCount:0, doneCount:0,
     items:{}})`); az aktív rendeléseket nem érinti

### Szakács oldal (`kitchen.html`) működése

1. Valós időben figyeli az `orders` ágat, minden rendelést kártyaként
   jelenít meg (pager szám, tételek, megjegyzések, állapot).
2. **Új rendelés érkezésekor**: hangjelzés (`playBeep()`) + felugró
   értesítő sáv, 3 másodperc után eltűnik. (Első betöltéskor nem szól,
   csak a már ismert ID-kat rögzíti.)
3. **"✅ KÉSZ" gomb**: `status` átállítása `"done"`-ra, **és** növeli a
   `dailyStats.doneCount` értéket.
4. **"↩️ Visszaállítás újra" gomb** (csak kész rendelésen): `status`
   vissza `"new"`-ra, **és** csökkenti a `dailyStats.doneCount` értéket.
5. Rendelés törlése csak a pénztáros oldalról lehetséges; ha ott törlik,
   a konyhai nézetből is azonnal eltűnik (közös Firebase adat).

### Menü (jelenlegi tételek)

Dupli Cheeseburger, Cheeseburger, Gyros Pita, Gyros Box, Pulled Pork,
Pulled Chicken, Pljeskavica, Pomfrit.

Bővítés: `TELEPITES.md` "6. LÉPÉS" pontja leírja, hogyan kell új
tételt/kategóriát felvenni az `index.html`-ben.

### Technológia

- Vanilla HTML/CSS/JavaScript, build-eszköz nélkül
- Firebase JS SDK 9.23.0 (compat mód), Realtime Database
- PWA-ként telepíthető ("Hozzáadás a kezdőképernyőhöz")
- Nincs bejelentkezés/jogosultságkezelés – a két tablet egy közös
  hálózaton, közös Firebase projekten osztozik (test mode-ban van a DB)

---

## 2. Fejlesztési napló

### 2026-06-21 – Kezdeti verzió (`584f4b8`)
Az alkalmazás első, működő változata: pénztáros és szakács felület,
Firebase-szinkron, alap rendelésfelvitel.

### 2026-06-21 – Pagerek átalakítása (`b004cbf`)
Nagy átdolgozás az `index.html`-ben (pager-kezelés és elrendezés
finomítása).

### 2026-06-23 – Étlap, gombok és szöveg átméretezése (`35fa06b`)
Vizuális finomhangolás mindkét felületen (`index.html`, `kitchen.html`):
gombméretek, szövegméretek igazítása jobb tablet-használhatóság
érdekében.

### 2026-06-26 – Pomfrit hozzáadva (`4cb9390`, `0a677ff`)
Új menütétel felvétele az étlapra (PR #1: "Uj-etel-az-etlapon").

### 2026-07-02 – Napi statisztika javítása: tartós tárolás és nullázó gomb (`962fd61`)
**Probléma:** a napi statisztika az élő `orders` listából számolt,
időbélyeg-szűréssel. Amikor a pénztáros törölt egy már kiszolgált
rendelést, annak tételei örökre eltűntek a statisztikából is – emiatt
a "ma eladott ételek" szám folyamatosan alulszámolt volt.

**Megoldás:**
- új, tartós `dailyStats` Firebase-csomópont (`firebase-config.js`)
- `sendOrder()` (`index.html`) rendeléskor azonnal beleírja a
  rendelésszámot és a tételek darabszámát – függetlenül attól, hogy a
  rendelést utólag törlik-e
- `setStatus()` (`kitchen.html`) növeli/csökkenti a teljesített
  darabszámot KÉSZ ↔ ÚJ váltáskor
- `showStats()` mostantól a tárolt `dailyStats`-ból olvas, nem az élő
  rendelésekből
- új "🗑️ Statisztika nullázása" gomb a statisztika modalban, ami
  megerősítés után nullázza a tárolt adatot, és azonnal frissíti a
  nyitva lévő modal tartalmát is

**Tesztelés:** élő Firebase adatbázisban ellenőrizve (a felhasználó
engedélyével, üzemszünetben) – rendelés küldése, majd törlése után a
statisztika megmaradt; nullázás után azonnal 0-ra állt. A teszteléshez
létrehozott ideiglenes adatokat eltávolítottam, az éles adatbázis
tiszta állapotban maradt.

**Branch/merge:** `napi-statisztika-javitas` branch → fast-forward
merge `main`-be → push GitHub-ra (`nacsex51/foodtruck-app`).
