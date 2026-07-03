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
├── icons.js             – Közös SVG ikon-készlet (2026-07-03 óta)
└── TELEPITES.md         – Telepítési útmutató
```

### Vizuális dizájn (2026-07-03 óta)

Mindkét felület egy közös, sötét "prémium" dizájnrendszert használ
(CSS custom property-k a `<style>` blokk elején), emoji helyett
letisztult SVG vonal-ikonokkal (`icons.js`, `icon()`/`hydrateIcons()`
függvények). A két tablet saját "azonosító színt" kapott, hogy első
pillantásra megkülönböztethetők legyenek:

| | Pénztár (`index.html`) | Konyha (`kitchen.html`) |
|---|---|---|
| Azonosító szín | Parázs narancs-piros `#d93a16` | Arany-borostyán `#ffb020` |
| Kiemelt (ár/mennyiség) szín | Arany `#ffb020` | Arany `#ffb020` |
| Figyelmeztető szín | – | Piros `#ef4444` (ÚJ rendelés pulzálás) |

Közös elemek: sötét háttér-gradiens (`#12121a` → `#08080c`), kártyák
`#14141c`/`#1c1c26` réteg-színekkel és halvány (`rgba(255,255,255,.08)`)
szegéllyel, `Outfit` betűtípus a kiemelésekhez/számokhoz, `Rubik` a
törzsszöveghez/gombokhoz (Google Fonts). A Pénztár fejlécében a jobb
felső sarokban, a rendelésszám mellett egy ikon-only fogaskerék gomb
nyitja az Étlap beállítása modalt (korábban egy teljes szélességű,
szöveges gomb volt a jobb panelen).

### Adatmodell (Firebase Realtime Database)

**`orders`** – az aktív/eddigi rendelések, kulcs = Firebase-generált egyedi ID:
```javascript
{
  queue: 3,                 // Pager sorszám (1–16)
  items: [
    { name: "Cheeseburger", qty: 1, note: "", price: 1800 },
    { name: "Pljeskavica",  qty: 1, note: "hagyma nélkül", price: 2000 }
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

**`menu`** – az étlap (eladható tételek + áraik), 2026-07-03 óta (lásd napló),
kulcs = Firebase-generált egyedi ID:
```javascript
{
  "-Nab...": { name: "Cheeseburger", price: 1800 },
  "-Nac...": { name: "Pomfrit", price: 900 }
}
```

### Pénztáros oldal (`index.html`) működése

1. **Pager kiválasztása** – 16 gomb (1–16). Foglalt pagerek (amiknek van
   aktív, még nem törölt rendelése) szürkék és nem kattinthatók.
2. **Kosár összeállítása** – a "KAJÁK" menüből tételekre kattintva kerülnek
   a kosárba; azonos tétel duplikattintásra csak a darabszámot növeli.
   Minden tételhez írható egyedi megjegyzés (pl. "hagyma nélkül"). Minden
   menügomb és kosártétel mutatja az egységárat, a kosártételeknél a
   sorösszeget (egységár × darabszám) is, a kosár alján pedig egy
   "Végösszeg" sor összegzi az egész rendelést – mennyiségváltozáskor
   azonnal frissül.
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
6. **Étlap beállítása modal** (`⚙️ Étlap beállítása`, 2026-07-03 óta):
   - új tétel felvétele: név + ár (din) megadása után "➕ Hozzáadás az
     étlaphoz" → `menuRef.push({name, price})`; kliensoldali validáció
     (nem üres név, 0–100000 közti ár, nincs már ilyen nevű tétel)
   - meglévő tétel törlése: a listában lévő ✕ gomb, megerősítés után
     `menuRef.child(id).remove()`
   - az étlap (`menuGrid`) és ez a lista is valós időben frissül
     (`menuRef.on("value", ...)`), így ha valaki hozzáad egy tételt, az
     azonnal megjelenik minden nyitva lévő lapon

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

### Menü (jelenlegi tételek) és árak

2026-07-03 óta az étlap **nem a kódban van hardkódolva**, hanem a
Firebase `menu` ágában, és a pénztáros oldalon az "⚙️ Étlap beállítása"
menüből szerkeszthető (lásd fent, "Pénztáros oldal működése" 6. pont).
Az alábbi táblázat az induláskor egyszer automatikusan feltöltött
kezdő tételeket mutatja (`DEFAULT_MENU_ITEMS` konstans, `index.html`)
– ezek onnantól ugyanúgy törölhetők/módosíthatók a Beállítások
menüből, mint bármelyik később felvett tétel.

| Tétel | Kezdő ár |
|---|---|
| Dupli Cheeseburger | 2200 din |
| Cheeseburger | 1800 din |
| Gyros Pita | 1900 din |
| Gyros Box | 2400 din |
| Pulled Pork | 2300 din |
| Pulled Chicken | 2100 din |
| Pljeskavica | 2000 din |
| Pomfrit | 900 din |

Bővítés: `TELEPITES.md` "6. LÉPÉS" pontja leírja az új munkafolyamatot.

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

### 2026-07-02 – GitHub Pages deploy hiba vizsgálata és a `.nojekyll` kísérlet visszavonása
**Probléma:** a `962fd61` és `21df49a` commitok pusholása után a GitHub
Pages build minden alkalommal elhasalt, 0 másodperc alatt, generikus
"Page build failed" üzenettel (látszott a repo Deployments nézetében is).

**Első feltételezés (tévesnek bizonyult):** a repo Pages API-ja
`"build_type": "legacy"`-t mutatott, ami a régi, kivezetés alatt álló
Jekyll-alapú Pages-builderre utalt. Mivel az app tiszta statikus
HTML/CSS/JS, és nem talált a diffben Liquid-szerű sablon-jelölést
(dupla kapcsos zárójel vagy százalékjeles blokk-tag), a feltételezés az
volt, hogy a Jekyll-feldolgozás felesleges
és hibázik – ezért bekerült egy üres `.nojekyll` fájl a Jekyll build
kikapcsolására (`7878194`).

**Mi derült ki valójában:** a felhasználó megküldte a tényleges GitHub
Actions futás naplóját ("pages build and deployment" workflow). Abból
kiderült, hogy a hiba forrása **nem Jekyll**, hanem az
`actions/deploy-pages@v5` lépés: a deploy `deployment_queued` állapotban
ragadt percekig, majd 10 perc után időtúllépéssel megszakadt
("Timeout reached, aborting!"). A `github-pages` Environment
ellenőrzése (`GET /repos/.../environments/github-pages`) nem mutatott
kötelező jóváhagyót/reviewert, ami ezt magyarázná – tehát ez
valószínűleg átmeneti GitHub-oldali torlódás/hiba a Pages
deploy-szolgáltatásban, nem a repo tartalmának vagy konfigurációjának
hibája.

**Első visszaállítás:** mivel a `.nojekyll` láthatóan nem oldotta meg a
problémát (a deploy lépés ekkor is elakadt), a felhasználó kérésére a
commitot visszavontuk (`git revert 7878194` → `acafc03`).

**A tényleges, végleges ok (közvetlen build-log alapján igazolva):**
a `acafc03` utáni deploy csak azért "akadt el" és lett "cancelled", mert
egymás után gyors egymásutánban több push történt, és a
`pages-build-deployment` workflow minden újabb push-nál lecancelezi a
még futó korábbi deploy-t ("Canceling since a higher priority waiting
request... exists") – ez **normális, várt működés**, nem hiba.

A valódi build-hibát a következő push (`635fa98`, a napló-frissítés)
job logja mutatta meg egyértelműen: a Jekyll Liquid sablon-motorja
szintaxis-hibát dobott a 172. sorra, mert egy szabálytalanul lezárt,
Liquid-jelöléshez hasonló blokk-tag szerepelt a szövegben.

A `FEJLESZTESI_NAPLO.md` 172. sorában **szó szerint** ott állt a
Liquid blokk-tag jelölése (a Liquid-szintaxist illusztráló példa saját
magunk írta dokumentációban) – ezt a Jekyll build a saját sablon-motorja
(Liquid) parancsaként próbálta értelmezni, és mivel nem volt szabályos
Liquid tag, elszállt rajta a build. Tehát:
- Jekyll **valóban fut** ezen a repón (a Pages API "legacy" jelzése és a
  Jekyll-image (`jekyll-build-pages`) használata is ezt igazolja),
- és **valóban el is tud hasalni** tetszőleges `.md`/`.html` fájl
  tartalmán, ha az véletlenül Liquid-szerű jelölést tartalmaz – ez
  a projekt saját dokumentációjában (ami folyamatosan bővül kódrészletekkel)
  bármikor újra előfordulhat.

**Végleges megoldás:**
1. A hibás szövegrész javítása a naplóban (a szó szerinti Liquid-jelölés
   helyett szöveges körülírás, hogy ne legyen Liquid-nek értelmezhető) –
   megtörtént.
2. A `.nojekyll` **újbóli** hozzáadása – ezúttal nem feltételezésből,
   hanem bizonyítottan: a `7878194` build logja korábban megmutatta,
   hogy `.nojekyll` jelenlétében a "Build with Jekyll" lépés teljesen
   ki is marad, a `build` job zöld lesz. Mivel az app tiszta statikus
   HTML/CSS/JS és semmilyen Jekyll-funkciót nem használ, ez a helyes,
   végleges beállítás – nem csak egy tünetkezelés. Megtörtént.

### 2026-07-02 – Árak megjelenítése a pénztár oldalon

**Igény:** a pénztáros lássa az egyes ételek árát, és a rendelés
összeállításakor automatikusan összeadódjon a végösszeg. Pontos árak
még nincsenek kialakítva, ezért egyelőre becsült, kerekített din-értékek
kerültek be (lásd fenti "Menü és árak" táblázat), amiket bármikor könnyű
módosítani a `MENU_PRICES` objektumban.

**Változások (`index.html`):**
- új `MENU_PRICES` konstans: étel név → ár (din)
- a menügombok mostantól az étel neve alatt az árat is mutatják
  (a korábbi, puszta szöveges gombtartalom helyett név+ár span párra
  állt át; emiatt a "kosárban van-e" jelölés is `data-name` attribútumra
  váltott a korábbi `textContent` összehasonlítás helyett, mert az árral
  bővült szöveg már nem egyezett volna az étel nevével)
- `addToCart()` a kosártételhez elmenti az árat is (`price` mező)
- a kosár (`renderCart()`) tételenként mutatja az egységárat és a
  sorösszeget, alul pedig egy "Végösszeg" sort, ami minden
  mennyiség-/tétel-változáskor újraszámol
- az aktív rendelések listáján (`renderOrders()`) tételenként megjelenik
  az ár, a kártya alján pedig a rendelés végösszege
- a `sendOrder()` által a Firebase-be küldött `order.items` mostantól a
  `price` mezőt is tartalmazza, így a régebbi (ár nélküli) rendelések
  `item.price || 0`-ként kerülnek kiszámolásra, hogy ne dobjon hibát

**Tesztelés:** helyi statikus szerveren (preview), élő Firebase
adatbázis ellen. Tétel hozzáadása, mennyiség növelése/csökkentése és
végösszeg-újraszámolás vizuálisan ellenőrizve. Tesztelés közben egy
korábbi munkamenetből megmaradt böngésző-állapot miatt véletlenül
elküldődött egy teszt-rendelés (#12 pager, Pulled Pork + Pulled
Chicken) az éles adatbázisba – ezt azonnal töröltem a pénztár oldal
"🗑️ Rendelés törlése" gombjával, az éles adatbázis tiszta állapotban
maradt.

### 2026-07-02 – Megerősítve: a konyhai oldal nem mutat árat + pénznem "din"-re állítva

**Igény:** a szakács ne lássa az árakat (felesleges info neki), ez
maradjon kizárólag a pénztáros oldalon; illetve a pénznem "Ft" helyett
"din" legyen mindenhol.

**Ellenőrzés:** a `kitchen.html` eleve sosem kapott ár-megjelenítést
(csak az `index.html` módosult az előző bejegyzésben), így ez a kérés
kódmódosítás nélkül is teljesült. Preview-val igazoltam: azonos élő
rendelés (#15 pager, Cheeseburger) a pénztár oldalon egységárral és
végösszeggel jelenik meg, a konyhai oldalon viszont kizárólag a pager
szám és a tétel neve/darabszáma látszik, ár nélkül. A teszt-rendelést
utána azonnal töröltem, az éles adatbázis tiszta maradt.

**Pénznem váltás (`index.html`, `FEJLESZTESI_NAPLO.md`):** minden
"Ft" felirat (menügombok, kosártételek, kosár végösszeg, aktív
rendelések tételei és végösszege) "din"-re cserélve. Csak
megjelenítési/szöveg-csere, a `MENU_PRICES` értékek és a számítási
logika változatlan.

### 2026-07-03 – Étlap tétel hozzáadása/törlése Beállítások menüből

**Igény:** ne kelljen kódot szerkeszteni ahhoz, hogy új eladási tételt
vegyenek fel az étlapra – a pénztáros tableten, egy Beállítások
menüben lehessen kiválasztani/megadni az új tétel nevét és árát.

**Megoldás – az étlap átköltözött Firebase-be:**
- új `menu` Firebase-ág (`firebase-config.js`: `menuRef = db.ref("menu")`),
  struktúra: `{ [push-ID]: { name, price } }`
- `database.rules.json` (és a vele szinkronban tartott
  `database-rules-COPY-EZT.txt`) kiegészítve egy `"menu"` validációs
  blokkal, az `orders.items` mintáját követve (név: 1–59 karakteres
  string, ár: 0–100000 közti szám)
- `index.html`: a korábban hardkódolt 8 menügomb helyett dinamikus
  `renderMenu()` rajzolja ki a gombokat a Firebase `menu` ág alapján;
  `addToCart()` az árat mostantól innen nézi ki (a korábbi statikus
  `MENU_PRICES` objektum helyett, ami `DEFAULT_MENU_ITEMS` néven csak
  az egyszeri kezdő-feltöltéshez maradt meg)
- **egyszeri seed logika**: app indításkor, ha a `menu` ág teljesen
  üres, automatikusan feltöltődik a korábbi 8 tétellel – így a
  meglévő étlap nem veszett el az átállással
- új "⚙️ Étlap beállítása" modal (`openSettings()`/`closeSettings()`,
  a napi statisztika modal mintájára): tétel hozzáadása név+ár
  megadásával (`addMenuItem()`, kliensoldali validáció: nem üres név,
  0–100000 közti ár, nincs már ilyen nevű tétel), meglévő tétel
  törlése (`deleteMenuItem()`, megerősítés után)
- `TELEPITES.md` "6. LÉPÉS" átírva az új, kódszerkesztés nélküli
  munkafolyamatra

**Fontos, kézi teendő élesítéskor:** a `database.rules.json` frissült
tartalmát be kell másolni a Firebase Console → Realtime Database →
Rules fülre és publikálni (ugyanúgy, mint eddig minden szabály-
változásnál, lásd `TELEPITES.md` 7b lépése) – enélkül a `menu` ágra
írás `permission_denied` hibával elutasításra kerül. Ezt tesztelés
közben meg is erősítettem: publikálás előtt a hozzáadás/törlés
egyértelmű hibaüzenettel ("Hiba a tétel hozzáadása során: ...")
elutasításra kerül, de az app nem omlik össze.

**Tesztelés:** helyi statikus szerveren (preview). A kattintás-alapú
szimuláció ebben a preview-környezetben nem váltotta ki a natív
`onclick` kezelőket (feltehetően a preview eszköz egy korlátja, nem
kódhiba – az azonos DOM-eseménykezelőket közvetlen függvényhívással és
`fill`-lel sikerült tesztelni), ezért a tényleges felhasználói
kattintás-folyamat a `menu` szabályok publikálása után, az éles
Firebase adatbázis ellen még egyszer ellenőrzendő. Amit így is sikerült
igazolni: a Beállítások modal nyit/zár, a form validáció (üres név,
érvénytelen ár, duplikált név) helyesen blokkol, sikeres hozzáadás
esetén a `menuRef.push()` a várt hibaágon landol (mert a szabály még
nincs publikálva), a dinamikus `renderMenu()` helyesen rajzolja ki a
gombokat és árakat szimulált `menuItems` adatból, a kosárba tevés
(`addToCart`) a dinamikus étlapból nézi ki a helyes árat, a kosár
végösszege és az "in-cart" kiemelés is helyesen frissül. Élő
adatbázisba írás nem történt (a `permission_denied` miatt), így
takarítanivaló sem maradt.

### 2026-07-03 – Vizuális redesign: prémium sötét dizájn, SVG ikonok, fejléc-gomb

**Igény:** a Beállítások gomb legyen egy ikon-only fogaskerék a fejléc
jobb felső sarkában (a rendelésszám mellett) a korábbi teljes szélességű
szöveges gomb helyett; illetve az app kinézete ne "átlagos"/sablon
hatású legyen, hanem egyedi, eladható, miközben egyszerű és gyorsan
átlátható maradjon a gyors rendelésfelvitelhez.

**Folyamat:** a `ui-ux-pro-max` skill design-system és domain kereséseit
használtam (`product`/`style`/`color`/`typography` domainek) a "food
truck POS tablet, prémium, nem sablon" kritériumokra. A "Digital
Signage/Kiosk" termék-ajánlás (Minimalizmus + Sötét mód) és a "Modern
Dark (Cinema Mobile)" stílus (mély fekete-közeli háttér, hajszálvékony
szegélyek, lekerekített kártyák) adta az alapot, "étvágygerjesztő"
meleg akcens-színekkel kombinálva (a search script ált. landing
page-eket ajánlott alapból, ezért finomítottam a lekérdezéseket
"POS/kiosk tool" irányba).

**Változások:**
- új `icons.js`: közös SVG vonal-ikon készlet (`icon(name, size)`,
  `hydrateIcons()`) – az `index.html` és `kitchen.html` minden emoji
  ikonja (🍔🔔🛒📤📊⚙️🗑️✅🔴📋📝🍳🍽️↩️🔔🔕➕✕) helyett; a fogaskerék
  ikon matematikailag generált (gyűrű + 8 fog `rotate()`-tel), hogy
  garantáltan helyesen jelenjen meg
- mindkét fájlban CSS custom property-alapú dizájn-token rendszer
  (`--bg`, `--bg-elevated`, `--primary`, `--gold`, `--radius-*` stb.),
  Google Fonts `Outfit` (kiemelések/számok) + `Rubik` (törzsszöveg)
  betűpár
- Pénztár (`index.html`): azonosító szín parázs narancs-piros
  `#d93a16` (a WCAG AA kontrasztkövetelmény miatt sötétebbre húzva a
  kezdeti `#ff5a36`-ról, mert fehér szöveggel kombinálva az alatta
  maradt volna); árak/mennyiségek arany (`#ffb020`) kiemeléssel
- Konyha (`kitchen.html`): azonosító szín arany-borostyán `#ffb020`,
  az "ÚJ rendelés" figyelmeztető szín (pulzáló keret, értesítő sáv)
  piros `#ef4444` maradt (funkcionális "sürgős" jelzés, nem márka-szín)
- **fejléc-gomb**: a "⚙️ Étlap beállítása" szöveges gomb eltávolítva a
  jobb panelből; helyette ikon-only fogaskerék gomb (`.icon-btn`) a
  fejlécben, a rendelésszám mellett, `aria-label="Étlap beállítása"` +
  `title` attribútummal (ikon-only gombnál kötelező a hozzáférhetőségi
  címke)
- `TELEPITES.md` "6. LÉPÉS" pontosítva az új gombhelyre

**Tesztelés:** helyi preview-ban mindkét oldal (`index.html`,
`kitchen.html`) ellenőrizve: konzolhiba nincs, a betűtípusok és
színek a várt token-értékeket adják vissza (`getComputedStyle`),
fogaskerék SVG helyesen renderelődik. A `kitchen.html`
rendeléskártyáit **szimulált, memóriában lévő adattal** teszteltem
(nem valós `sendOrder()` híváson keresztül) – az automatikus
engedélyező réteg blokkolta a tényleges élő rendelés-küldést, mivel az
egy valódi konyhai hangjelzést/értesítést és pager-foglalást váltott
volna ki a felhasználó explicit jóváhagyása nélkül; ez helyes védelem
volt, nem került éles adat az adatbázisba. A Beállítások modal, a
kosár-logika és az étlap-hozzáadás/törlés-validáció (az előző
bejegyzésben leírtak) a redesign után is hibátlanul működik.
