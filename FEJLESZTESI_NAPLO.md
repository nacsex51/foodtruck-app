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
├── index.html           – Pénztáros felület: HTML váz (rendelésfelvitel)
├── index.css            – Pénztáros stíluslap (2026-07-05 óta külön fájl)
├── index.js             – Pénztáros alkalmazás-logika (2026-07-05 óta külön fájl)
├── kitchen.html         – Szakács felület: HTML váz (konyhai kijelző)
├── kitchen.css          – Szakács stíluslap (2026-07-05 óta külön fájl)
├── kitchen.js           – Szakács alkalmazás-logika (2026-07-05 óta külön fájl)
├── firebase-config.js   – Közös Firebase kapcsolódási adatok
└── icons.js             – Közös SVG ikon-készlet (2026-07-03 óta)
```

### Vizuális dizájn (2026-07-03 óta)

Mindkét felület egy közös, sötét "prémium" dizájnrendszert használ
(CSS custom property-k a stíluslapok – `index.css`, `kitchen.css` –
elején), emoji helyett
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
    { name: "Cheeseburger", qty: 1, note: "", price: 1800, category: "food" },
    { name: "Kóla",         qty: 2, note: "", price: 300,  category: "drink" }
  ],
  status: "new" | "done",   // Kész-e (konyhai KÉSZ gomb VAGY pénztári pipa)
  timestamp: 1782684888781  // Létrehozás ideje (ms)
}
```
A `category` mező 2026-07-05 óta létezik ("food" vagy "drink"); a régebbi,
kategória nélküli tételek mindenhol ételnek számítanak.

**`dailyStats`** – tartósan tárolt napi összesítő (2026-07-02 óta; 2026-07-05
óta **csak a késznek/teljesítettnek jelölt rendelések** kerülnek bele):
```javascript
{
  doneCount: 9,                   // Hány rendelést jelöltek késznek a nullázás óta
  items: { "Cheeseburger": 8, "Kóla": 5, ... }  // Kész rendelések tételei (italokkal együtt)
}
```
(A korábbi `orderCount` mezőt már semmi nem növeli – a nullázás a régi
struktúra miatt még 0-ra állítja, de a felület nem mutatja.)

**`menu`** – az étlap (eladható tételek + áraik), 2026-07-03 óta (lásd napló),
kulcs = Firebase-generált egyedi ID:
```javascript
{
  "-Nab...": { name: "Cheeseburger", price: 1800, category: "food" },
  "-Nac...": { name: "Kóla", price: 300, category: "drink" }
}
```

### Pénztáros oldal (`index.html`) működése

1. **Pager kiválasztása** – 16 gomb (1–16). Foglalt pagerek (amiknek van
   aktív, még nem törölt rendelése) szürkék és nem kattinthatók.
2. **Kosár összeállítása** – az "Ételek" és "Italok" szekciókból (2026-07-05
   óta, korábban egyetlen "KAJÁK" lista volt) tételekre kattintva kerülnek
   a kosárba; azonos tétel duplikattintásra csak a darabszámot növeli.
   Az "Italok" szekció csak akkor látszik, ha van ital az étlapon.
   Az étlap betöltéskor azonnal kirajzolódik egy localStorage-gyorsítótárból
   (`foodtruckMenuCache`, 2026-07-05 óta), a Firebase-ből érkező friss adat
   ezt utána felülírja; amíg se cache, se Firebase-adat nincs, "Étlap
   betöltése…" jelzés látszik.
   Minden tételhez írható egyedi megjegyzés (pl. "hagyma nélkül"). Minden
   menügomb és kosártétel mutatja az egységárat, a kosártételeknél a
   sorösszeget (egységár × darabszám) is, a kosár alján pedig egy
   "Végösszeg" sor összegzi az egész rendelést – mennyiségváltozáskor
   azonnal frissül.
3. **Rendelés küldése** – a `sendOrder()` függvény:
   - ellenőrzi, hogy van-e kiválasztott pager és nem üres-e a kosár
   - felpusholja a rendelést az `orders` ághoz (`status: "new"`)
   - a napi statisztikába itt még **nem** kerül semmi (2026-07-05 óta) –
     a rendelés csak akkor könyvelődik, amikor késznek jelölik
   - kiüríti a kosarat és a pager-kiválasztást
4. **Aktív rendelések listája** – valós időben frissül (`orders.on("value")`),
   legújabb felül. Minden még nem kész rendelésen zöld **"✅ TELJESÍTVE"
   (pipa) gomb** (2026-07-05 óta): a `markOrderDone()` transaction-nel
   `"done"`-ra állítja a státuszt, és ekkor könyveli a rendelés összes
   tételét a napi statisztikába (`applyStatsForOrder`, közös függvény a
   `firebase-config.js`-ben). A csak italt tartalmazó rendelést csak itt
   lehet késznek jelölni, mert az a konyhán meg sem jelenik. Emellett
   mindegyik kártyán törlés gomb (`🗑️ Rendelés törlése`, saját
   megerősítő modallal).
5. **Napi statisztika modal** (`📊 Napi statisztika megtekintése`):
   - a tartósan tárolt `dailyStats`-ból olvas, nem az aktív rendelésekből
   - **csak a késznek jelölt rendelések** szerepelnek benne (2026-07-05
     óta): teljesített rendelések száma + eladott tételek (ételek és
     italok együtt) darabszám szerint csökkenő sorrendben
   - **"🗑️ Statisztika nullázása" gomb**: megerősítés után nullázza a
     tárolt statisztikát; az aktív rendeléseket nem érinti
6. **Beállítások modal** (⚙️ fogaskerék a fejlécben; 2026-07-05-ig "Étlap
   beállítása" néven):
   - **Megjelenés**: sötét / világos mód váltó (2026-07-05 óta). A
     választás localStorage-ben tárolódik (`foodtruckTheme` kulcs),
     tabletenként külön; egy `<head>`-beli mini-script már az első
     kirajzolás előtt alkalmazza, hogy ne villanjon. A világos mód a
     `html[data-theme="light"]` alatti CSS-token felülírásokkal működik.
   - **Étlap** – új tétel felvétele: név + ár (din) + kategória
     (Étel/Ital legördülő) után "➕ Hozzáadás az étlaphoz" →
     `menuRef.push({name, price, category})`; kliensoldali validáció
     (nem üres név, 1–100000 közti ár, nincs már ilyen nevű tétel)
   - **ár módosítása** (2026-07-05 óta): a listában minden tétel ára
     szerkeszthető szám-mező; kilépéskor/Enterre `updateMenuItemPrice()`
     azonnal menti (ugyanazzal az ár-validációval)
   - meglévő tétel törlése: a listában lévő ✕ gomb, megerősítés után
     (saját megerősítő modal) `menuRef.child(id).remove()`
   - az étlap-rácsok és ez a lista is valós időben frissül
     (`menuRef.on("value", ...)`), így ha valaki hozzáad egy tételt, az
     azonnal megjelenik minden nyitva lévő lapon

### Szakács oldal (`kitchen.html`) működése

1. Valós időben figyeli az `orders` ágat, a rendeléseket kártyaként
   jeleníti meg (pager szám, tételek, megjegyzések, állapot). **Az
   italok nem jelennek meg** (2026-07-05 óta, `kitchenItems()` szűrő):
   vegyes rendelésnél csak az ételek látszanak, a csak italt tartalmazó
   rendelés kártyája meg sem jelenik (azt a pénztáros pipálja ki), és az
   "új" számlálóba sem számít bele.
2. **Új rendelés érkezésekor**: hangjelzés (`playBeep()`) + felugró
   értesítő sáv, 3 másodperc után eltűnik. (Első betöltéskor nem szól,
   csak a már ismert ID-kat rögzíti; csak italos rendelésre nem jelez.)
3. **"✅ KÉSZ" gomb**: transaction-nel `"done"`-ra állítja a státuszt,
   **és ekkor** könyveli a rendelés összes tételét (az italokat is) a
   napi statisztikába (`applyStatsForOrder`). A transaction garantálja,
   hogy ha a pénztári pipa gombbal (majdnem) egyszerre nyomnák meg,
   a statisztikába akkor is csak egyszer kerüljön be a rendelés.
4. **"↩️ Visszaállítás újra" gomb** (csak kész rendelésen): `status`
   vissza `"new"`-ra, és a statisztikából levonja, amit a KÉSZ hozzáadott.
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

**Utólagos javítás – fejléc-magasság egyeztetése:** a felhasználó
jelezte, hogy a két oldal fejléce nem egyforma magas. Oka: az
`index.html` fejlécében van egy ikon-gomb (fogaskerék), a
`kitchen.html` fejlécében viszont csak egy kisebb, szöveges badge –
azonos `padding` mellett is más lett a tényleges (tartalom által
meghatározott) magasság. Megoldás: mindkét `header` szabály explicit
`min-height: 65px`-et kapott, az `.icon-btn` mérete 40×40px-ről
44×44px-re nőtt (ez adja ki pontosan a 65px-et: 44 + 2×10px padding +
1px szegély – egyben jobb is accessibility szempontból, közelebb a
44×44pt ajánlott minimum érintési célmérethez), és ennek megfelelően
frissült az `index.html` `.main-layout` magasság-számítása
(`calc(100vh - 65px)`) és a `kitchen.html` `.notification-bar` `top`
pozíciója (`65px`). Preview-ban `getBoundingClientRect().height`
alapján igazolva: mindkét oldal fejléce pontosan 65px.

### 2026-07-05 – Manuális teszt hibáinak javítása (foodtruck-app-hibak.md)

A 2026-07-04-i, éles GitHub Pages-en végzett manuális teszt három
hibát talált (`foodtruck-app-hibak.md`), mindhárom javítva
(`index.html` – a `kitchen.html` nem használt `confirm()`-ot, ott nem
kellett módosítás):

**1. Natív `confirm()` lecserélve saját megerősítő modalra.**
A natív `confirm()` blokkolja a renderelést (kioszk/PWA módban
lefagyást okozhat), és nem illik az app sötét dizájnjához. Új,
a meglévő modalok mintájára készült "Megerősítés" modal
(`#confirmModal`, `showConfirm(üzenet, gombfelirat, teendő)` /
`closeConfirm()` / `acceptConfirm()`): Mégse + piros megerősítő gomb,
a callback csak megerősítéskor fut le. `z-index: 300` (a többi modal
200-as szintje felett), mert az étlaptétel-törlés megerősítése a
Beállítások modal fölött jelenik meg. Mindhárom hívóhely átállt:
`deleteOrder()` (Rendelés törlése), `resetStats()` (Statisztika
nullázása – gombfelirat: "Nullázás"), `deleteMenuItem()` (étlaptétel
törlése). A tétel neve `textContent`-ként kerül a modalba, így
HTML-ként nem értelmeződik.

**2. Üres "KAJÁK" lista első betöltéskor.**
Ok: az étlap kizárólag a Firebase névtelen hitelesítés + adatletöltés
után renderelődött (`onAuthStateChanged` → `menuRef.on("value")` →
`renderMenu()`), így az első másodpercekben a szekció üres volt – a
tesztben ez tűnt úgy, mintha csak a pager-kattintás után jelenne meg.
Javítás: az étlap localStorage-gyorsítótárba kerül
(`foodtruckMenuCache` kulcs, `saveMenuCache()` minden Firebase-
frissüléskor), és az oldal betöltésekor `loadMenuCache()` +
`renderMenu()` szinkron, még bármilyen hálózati válasz előtt kirajzolja
a menügombokat. Amíg se cache, se Firebase-adat nincs (legelső
indítás), "Étlap betöltése…" jelzés látszik az üres szekció helyett;
a "Még nincs felvéve étlap tétel" üzenet csak már megérkezett, tényleg
üres étlapnál jelenik meg (`menuLoaded` flag).

**3. Teszt-szemét az étlapban + input validáció.**
A Firebase `menu` ág REST API-s ellenőrzése (névtelen hitelesítéssel,
csak olvasás) kimutatta, hogy a két teszttétel ("Teszt Kóla" – 500 din,
"Szar" – 1 din) **már nincs az adatbázisban** – a kézi törlés korábban
megtörtént, az étlap a 8 rendes tételt tartalmazza, adattisztításra nem
volt szükség. Az opcionális kódjavítás elkészült: az `addMenuItem()`
ár-validációja `price < 0`-ról `price <= 0`-ra szigorodott (a 0 ár és
az üres ár-mező is elutasításra kerül), a hibaüzenet és az ár input
`min` attribútuma ennek megfelelően frissült (1–100000 din). Az üres
név és a duplikált név elutasítása már korábban is megvolt.

**Tesztelés:** helyi statikus szerveren (preview), élő Firebase ellen,
írás nélkül. Igazolva: a 8 menügomb azonnal renderelődik, a cache
mentődik és újratöltés után is 8 gomb jelenik meg; a "betöltés" /
"üres étlap" állapotok helyesen váltanak; mindhárom megerősítő folyamat
a saját modalt nyitja (helyes üzenettel és gombfelirattal), Mégse után
semmi nem törlődik és a függőben lévő művelet törlődik; a validáció
mind az öt hibás bevitelt (0 / üres / negatív ár, üres név, duplikált
név) elutasítja, az étlapba nem került írás. Konzolhiba nincs, natív
`confirm()` hívás nem maradt a kódban (csak kommentekben szerepel).

### 2026-07-05 – Világos mód, árszerkesztés, Italok kategória, statisztika csak kész rendelésből + pénztári pipa gomb

**Igény (5 kérés egyben):** (1) a Beállításokban lehessen sötét és
világos mód között váltani; (2) az étlapon lehessen módosítani a
tételek árát; (3) a "Kaják" felirat legyen "Ételek"; (4) legyen
"Italok" kategória, ami nem megy át a konyhára, csak a napi
statisztikába; (5) a statisztikába csak az kerüljön bele, ami késznek
van jelölve – ezért legyen pipa gomb a pénztárnál is, amivel a
rendelés teljesítetté tehető.

**1. Sötét/világos mód (`index.html`, `index.css`, `index.js`, `icons.js`):**
- a Beállítások modal tetején új "Megjelenés" szekció két gombbal
  (🌙 Sötét mód / ☀️ Világos mód, új `moon`/`sun` SVG ikonok)
- a világos téma a `html[data-theme="light"]` alatti CSS-token
  felülírásokkal működik (világos hátterek, sötét szöveg; az arany
  ár-szín sötétebb borostyánra vált a kontraszt miatt – a parázs
  narancs-piros azonosító szín marad)
- a választás localStorage-ben tárolódik (`foodtruckTheme` kulcs,
  tabletenként külön), és egy `<head>`-beli mini-script már az első
  kirajzolás előtt alkalmazza, hogy ne villanjon sötét → világos
  váltás; a `theme-color` meta (böngésző-sáv színe) is együtt vált
- a modal címe "Étlap beállítása" helyett "Beállítások" lett

**2. Árszerkesztés a Beállításokban (`index.js`):** a tétellistában az
ár mostantól szerkeszthető szám-mező; kilépéskor/Enterre az
`updateMenuItemPrice()` a felvételkori validációval (1–100000 din)
azonnal menti Firebase-be (`menuRef.child(id).update({price})`), és a
real-time listener miatt minden nyitott lapon frissül.

**3–4. "Ételek" + "Italok" kategória (`index.html`, `index.js`,
`kitchen.js`, `database.rules.json`):**
- a menütételek új `category` mezőt kaptak ("food"/"drink"); a
  Beállítások űrlapján Étel/Ital legördülő; a tétellistában
  kategória-jelölő badge
- a pénztár bal panelén az egykori "KAJÁK" lista helyett "Ételek"
  szekció + külön "Italok" szekció (utóbbi csak akkor látszik, ha van
  ital az étlapon); a kosárba tett tétel viszi magával a kategóriáját
- a konyhai kijelzőn az italok NEM jelennek meg: vegyes rendelésnél
  csak az ételek látszanak (`kitchenItems()` szűrő), a csak italt
  tartalmazó rendelésnek kártyája sincs, az "új" számlálóba és a
  hangjelzésbe sem számít bele
- a régebbi, kategória nélküli tételek/rendelések mindenhol ételnek
  számítanak (visszafelé kompatibilis)
- `database.rules.json`: a `menu` és az `orders.items` validációja
  kiegészült az opcionális `category` mezővel ('food'/'drink')

**5. Statisztika csak kész rendelésből + pénztári pipa gomb
(`index.js`, `kitchen.js`, `firebase-config.js`):**
- a `sendOrder()` már NEM ír a statisztikába – a rendelés akkor
  könyvelődik, amikor késznek jelölik
- új közös `applyStatsForOrder(order, ±1)` függvény a
  `firebase-config.js`-ben: a rendelés összes tételét (italokkal
  együtt) hozzáadja/levonja a `dailyStats`-ból
- a pénztár aktív rendelés kártyáin új zöld "✅ TELJESÍTVE" (pipa)
  gomb (`markOrderDone()`) – a csak italos rendeléseket csak itt lehet
  késznek jelölni; a konyhai "KÉSZ"/"Visszaállítás újra" ugyanígy
  könyvel/von le
- mindkét oldal transaction-nel állítja át a státuszt, így ha a
  pénztár és a konyha (majdnem) egyszerre nyomná meg a gombot, a
  statisztikába akkor is csak egyszer kerül be a rendelés
- a statisztika modal új felirata: "Teljesített rendelés ma" +
  "Eladott tételek" (a félrevezetővé vált "Összes rendelés ma" sor
  kikerült; a `dailyStats.orderCount` mezőt már semmi nem növeli)

**FONTOS, kézi teendő élesítéskor:** a frissült `database.rules.json`
tartalmát publikálni kell a Firebase Console → Realtime Database →
Rules fülön, MIELŐTT az új verzió élesbe kerül – enélkül a `category`
mezős rendelés-küldés és étlap-bővítés `permission_denied` hibával
elutasításra kerül (a `$other: false` szabály miatt).
✅ **Megtörtént:** a szabályokat a felhasználó 2026-07-05-én, a GitHub
Pages deploy (`346cd01`) után publikálta, és megerősítette, hogy az
élő oldalon minden működik – a Firebase szabályok szinkronban vannak
a repóbeli `database.rules.json`-nal.

**Tesztelés:** helyi statikus szerveren (preview), élő Firebase ellen,
adatbázis-írás nélkül. Igazolva: téma-váltás oda-vissza (tokenek,
localStorage, meta szín, gomb-kiemelés), a Beállítások modal új
szekciói (Étel/Ital választó, 8 tétel szerkeszthető ár-mezővel),
"Ételek" cím és a szimulált ital külön "Italok" rácsban, kosárba tett
ital `category: "drink"`-kel, statisztika modal új felirata; a konyhai
nézetben szimulált adattal: vegyes rendelésből csak az étel látszik, a
csak italos rendelés nem jelenik meg, a kategória nélküli régi tétel
ételként renderelődik, az "új" számláló helyes. Konzolhiba nincs. A
teszt közben az adatbázisban lévő élő rendeléshez (#16) nem nyúltam.

### 2026-07-05 – Kódszerkezet: CSS és JS külön fájlokba, tartalomjegyzékek

**Igény:** a CSS kerüljön külön fájlba, és a programkód legyen szépen
tagolva, hogy könnyű legyen benne navigálni.

**Megoldás – szétbontás fájltípusonként:** az eddig egyetlen nagy
`index.html`-ben (~2000 sor) és `kitchen.html`-ben (~700 sor) lévő
inline `<style>` és `<script>` blokkok külön fájlokba kerültek:

| Régi hely | Új fájl | Tartalom |
|---|---|---|
| `index.html` `<style>` | `index.css` | Pénztár stíluslap (14 szekció) |
| `index.html` `<script>` | `index.js` | Pénztár logika (22 szekció) |
| `kitchen.html` `<style>` | `kitchen.css` | Konyha stíluslap (7 szekció) |
| `kitchen.html` `<script>` | `kitchen.js` | Konyha logika (8 szekció) |

- a kód **betűre pontosan**, változtatás nélkül került át (csak a
  közös behúzás tűnt el), a meglévő magyar magyarázó kommentekkel
  együtt – a viselkedés nem változott
- minden új fájl elejére **TARTALOMJEGYZÉK** került: a fájlban lévő
  szekció-bannerek címeit sorolja fel, így a címre keresve (Ctrl+F)
  azonnal a megfelelő részre lehet ugrani
- a HTML fájlok így rövid, átlátható "vázak" lettek (`index.html`
  ~210 sor, `kitchen.html` ~60 sor): csak a felület szerkezete maradt
  bennük, kommentekkel tagolva
- ami szándékosan **helyben maradt**: a `<head>`-beli mini
  téma-alkalmazó script az `index.html`-ben (annak az első kirajzolás
  előtt kell futnia, hogy világos módban ne villanjon a sötét felület),
  valamint a közös `firebase-config.js` és `icons.js` hivatkozások
- a betöltési sorrend változatlan: Firebase SDK-k + `icons.js` a
  fejlécben, `firebase-config.js` + oldal-saját JS a `</body>` előtt;
  az oldal-saját JS nem module, így a HTML `onclick` kezelői ugyanúgy
  elérik a globális függvényeket, mint eddig
- mellékes javítás: a `.claude/launch.json` preview-szerver konfig
  `autoPort`-ot kapott és a kiosztott `PORT` környezeti változót
  használja, így több párhuzamos munkamenet sem ütközik a fix porton

**Tesztelés:** helyi statikus szerveren (preview), élő Firebase ellen,
adatbázis-írás nélkül, mindkét oldalon. Igazolva: a külső CSS
érvényesül (dizájn-tokenek, sötét és világos mód oda-vissza), a külső
JS minden funkciója elérhető és működik (étlap-render cache-ből +
Firebase-ből, megerősítő modal nyit/zár, téma-váltás, konyhai
rendeléskártya-render az élő #16-os rendeléssel, hangjelzés-gomb),
konzolhiba egyik oldalon sincs. Az élő adatbázishoz nem nyúltam.

### 2026-07-05 – Dizájnjavítások: görgethető modal, lebegő küldés gomb, Étel/Ital statisztika

**Igény (4 pont):** (1) hosszú étlapnál a Beállítások modal Bezárás
gombja nem volt elérhető → legyen görgethető; (2) a RENDELÉS KÜLDÉSE
gomb ne az oldal aljára legyen "fixálva", hanem görgetés közben a
tételek felett lebegjen; (3) az étlap alján legyen hely, hogy az
utolsó tételeket ne takarja a gomb; (4) a napi statisztika legyen
Ételek/Italok szerint bontva a leltározás segítésére.

**Megoldások:**

1. **Görgethető modal (`index.css`):** a `.modal` kapott
   `max-height: 88vh`-t és flex-oszlop elrendezést; a két hosszúra
   nyúlható lista (`#menuManageList` az étlap-szerkesztőben,
   `#statsContent` a statisztikában) belül görgethető
   (`overflow-y: auto`), minden más elem (cím, form, gombok) nem
   zsugorodik. Így a Bezárás gomb bármilyen hosszú étlapnál látható
   és kattintható marad.
2. **Lebegő küldés gomb (`index.css`):** a `.send-btn`
   `position: sticky; bottom: 10px`-et kapott – görgetés közben a bal
   panel alján, a tételek FELETT lebeg (mindig kéznél van), a lista
   legaljára érve pedig a természetes helyére, a kosár alá simul.
   Árnyékot kapott, hogy elváljon az alatta elcsúszó tartalomtól.
3. **Hely az étlap alján (`index.css`):** a `.left-panel` alsó
   paddingje 16px→32px, így legaljára görgetve az utolsó tételek és
   a kosár is kényelmesen a gomb fölött látszik.
4. **Étel/Ital bontású statisztika (`index.js`, `showStats()`):** a
   modal mostantól két szekcióban listáz – ÉTELEK és ITALOK – saját
   összesített darabszámmal (pl. "össz. 28 db") a leltározáshoz.
   A kategóriát az aktuális étlapból oldjuk fel tételnév alapján,
   mert a `dailyStats` ág csak név+darab párokat tárol, és a
   Firebase-szabály (`$other: false`) új mezőt nem engedne – így az
   **adatmodell és a szabályok változatlanok**, semmit nem kell újra
   publikálni. Ha egy tétel már nincs az étlapon, Ételnek számít
   (az app többi részével azonos alapértelmezés).

**Tesztelés:** preview szerveren, élő Firebase ellen, **írás nélkül** –
a hosszú étlapot (24 tétel) és a statisztikát csak a memóriában,
lokálisan szimuláltam. Igazolva képernyőképekkel: a küldés gomb
görgetés közben végig látható és a panel alján lebeg; az étlap aljára
görgetve minden tétel + kosár a gomb felett látszik; a Beállítások
modalban a tétellista belül görgethető, a Bezárás gomb végig elérhető;
a statisztika modal két szekcióban, összesítőkkel jelenik meg.
Konzolhiba nincs.

### 2026-07-05 – PWA manifest: keresősáv nélküli, appszerű megnyitás tableten

**Igény:** androidos tableten, Chrome-ban megnyitva ne látsszon fent a
keresősáv (címsor).

**Háttér:** a Chrome csak akkor rejti el a keresősávot, ha az oldal
telepített webalkalmazásként (PWA) fut. Ehhez Web App Manifest kell –
eddig csak a régi `mobile-web-app-capable` meta-tagek voltak, amiket a
mai Chrome már nem vesz figyelembe, ezért a kezdőképernyőre tett
ikon is csak sima böngésző-linkként nyílt meg.

**Megoldás – két külön manifest (tabletenként saját app):**

| Fájl | App neve | Indul | Ikon |
|---|---|---|---|
| `manifest-penztar.webmanifest` | Foodtruck Pénztár | `index.html` | narancs "P" |
| `manifest-konyha.webmanifest` | Foodtruck Konyha | `kitchen.html` | arany "K" |

- mindkettő `display: "standalone"` → telepítés után saját ablakban,
  **keresősáv nélkül** nyílik, saját ikonnal a kezdőképernyőn
- új `icons/` mappa: 192 és 512 px PNG app-ikonok (a tabletek
  azonosító színeivel: pénztár `#d93a16`, konyha `#ffb020`),
  maskable változattal a kerek Android-ikonokhoz
- a `<link rel="manifest">` bekötve az `index.html` és `kitchen.html`
  fejlécébe; adatmodell, Firebase, JS-logika érintetlen
- service worker szándékosan NINCS (a mai Chrome-nak már nem kell a
  telepítéshez, és offline-gyorsítótár nélkül nem fordulhat elő, hogy
  egy tablet régi kódot futtat frissítés után)

**Telepítés a tableten (feltöltés után):** Chrome-ban megnyitni az
oldalt → jobb felső ⋮ menü → „Alkalmazás telepítése" (vagy „Hozzáadás
a kezdőképernyőhöz" → Telepítés) → ezután a kezdőképernyő ikonjáról
indítva keresősáv nélkül, appként fut. A korábbi sima parancsikont
érdemes előtte törölni. FONTOS: csak HTTPS-ről (GitHub Pages) működik,
a változtatások feltöltése után.

**Tesztelés:** preview szerveren igazolva, hogy mindkét manifest és
mind a 4 ikon hibátlanul betöltődik (HTTP 200, érvényes JSON,
`display: standalone`, helyes `start_url`), a manifest-link mindkét
oldal fejlécében jelen van, konzolhiba nincs. A tényleges telepítés
androidos tableten csak a GitHub-ra feltöltés után próbálható ki.

### 2026-07-06 – Kapcsolat-őr: adatbázis-újracsatlakoztatás gomb + automata védelem

**Igény:** gomb a Beállításokban, ami újracsatlakoztatja az
adatbázist – korábban előfordult, hogy a kapcsolat észrevétlenül
megszakadt, és emiatt az összes rendelést törölni kellett.
„Bombabiztos" megoldás kellett.

**Megoldás – három védelmi réteg (új közös fájlok: `connection.js`
+ `connection.css`, mindkét oldal betölti):**

1. **KÉZI újracsatlakoztatás** – új „Adatkapcsolat" szekció a
   Beállításokban: élő állapotjelző (zöld pötty = Kapcsolódva,
   piros = Nincs kapcsolat) + „Újracsatlakoztatás" gomb. A gomb
   teljes újraépítést végez: kapcsolat bontása → újranyitás →
   szükség esetén a névtelen bejelentkezés pótlása. Az eredményről
   felugró értesítés (toast) tájékoztat; dupla kattintás ellen a
   gomb a folyamat alatt letiltva („Csatlakozás…").
2. **PIROS FIGYELMEZTETŐ SÁV** – ha 5 mp-nél tovább nincs
   kapcsolat, a képernyő tetején (minden modal fölött) piros sáv
   jelenik meg mindkét oldalon: „Nincs kapcsolat az adatbázissal –
   a rendelések most NEM frissülnek!", benne saját
   Újracsatlakoztatás gombbal. Nem lehet nem észrevenni.
3. **AUTOMATA újracsatlakozás** – kapcsolatvesztéskor 15
   másodpercenként magától újrapróbálkozik, továbbá azonnal
   próbálkozik a tablet felébredésekor (visibilitychange) és a
   hálózat visszatértekor (online esemény). A kapcsolat állapotát
   a Firebase saját `.info/connected` jelzése adja – ez mindig a
   valós szerver-kapcsolatot mutatja.

**Kapcsolódó javítások ugyanebben a körben:**

- az összes natív `alert()` lecserélve felugró értesítésre (toast)
  – az alert kioszk/PWA módban lefagyást okozhatott (a
  foodtruck-app-hibak.md 1. pontjának kiterjesztése);
- sikeres rendelés-küldés után mostantól pozitív visszajelzés is
  van („A #N rendelés elküldve a konyhára.");
- `syncStarted` őr mindkét oldalon: a Firebase-listenerek garantáltan
  csak egyszer épülnek ki, akkor is, ha a bejelentkezés a kapcsolat-őr
  pótló bejelentkezése miatt később újra lefutna;
- a sáv megjelenítése kikényszerített reflow-val történik (nem
  requestAnimationFrame-mel), így háttérben lévő/alvó lapon is
  garantáltan megjelenik;
- ikon-tartalék: ha az icons.js nem töltődne be, a kapcsolat-őr
  ikonok nélkül is működik.

**Érintett fájlok:** `connection.js` (új), `connection.css` (új),
`index.html`, `kitchen.html` (betöltés + Adatkapcsolat szekció),
`index.js`, `kitchen.js` (alert→toast, syncStarted őr), `index.css`
(Adatkapcsolat szekció stílusa; a sáv/toast stílusok a közös
connection.css-be kerültek), `icons.js` (wifi/wifiOff ikonok).

**Tesztelés:** preview szerveren, élő Firebase ellen, **írás
nélkül**. Igazolva: állapotjelző „Kapcsolódva" zölddel; kézi
újracsatlakoztatás sikeres, „helyreállt" toast megjelenik;
szimulált kapcsolatvesztésnél 5 mp után bejön a piros sáv és elindul
az automata újrapróbálkozás; a sáv gombja helyreállítja a
kapcsolatot, a sáv eltűnik, az automata próbálkozás leáll – mindez a
Pénztár ÉS a Konyha oldalon is. Konzol- és hálózati hiba nincs.

### 2026-07-07 – Netlify: biztonsági HTTP fejlécek (`netlify.toml`)

**Igény:** a DeploySafe biztonsági ellenőrzés hiányzó fejléceket
jelzett az újonnan indított Netlify-verzión
(`warm-cranachan-6724da.netlify.app`): Content-Security-Policy,
Permissions-Policy, Referrer-Policy, X-Content-Type-Options.

**Megoldás:** új `netlify.toml` a repo gyökerében, `[[headers]]`
blokkal minden útvonalra. A CSP csak a ténylegesen használt külső
forrásokat engedi (Firebase SDK, Firebase Realtime DB/Auth, Google
Fonts); `'unsafe-inline'` kell script- és style-src-hez, mert az app
`onclick="..."` attribútumokkal dolgozik.

**Tesztelés közben talált és javított hiba:** az első verzió a
Firebase Realtime Database pontos címét (`foodtruscksu2-default-rtdb...`)
engedte a `connect-src`-ben, de a Firebase a kapcsolatot valójában
egy dinamikus al-szerverre irányítja át (pl.
`s-gke-euw1-nssiX.europe-west1.firebasedatabase.app`) – emiatt az app
folyamatosan „Nincs kapcsolat" állapotban ragadt a Netlify-verzión.
Javítás: `*.firebasedatabase.app` minta a pontos cím helyett.

**Nyitott kérdés / megfigyelés (lezárva):** a fenti javítás után is
tapasztaltam, hogy az automatizált teszt-böngészőben a Netlify-verzió
időnként „Nincs kapcsolat" állapotban ragadt (a Firebase hosszú
lekérdezéses tartalék-csatornája 503-at kapott), miközben ugyanabban
az időablakban a GitHub Pages-verzió mindig hibátlanul csatlakozott.
Ellenőriztem: nincs CSP-hiba a konzolban, a Firebase-kvóta egészséges
(6/100 kapcsolat), App Check nincs bekapcsolva, az Authorized
domains lista mindkét domaint egyformán (egyiket sem) tartalmazza –
tehát a fejlécek nem magyarázzák. **A felhasználó saját eszközén
kipróbálta a Netlify-linket: nincs lecsatlakozási probléma.** Így a
jelenség valóban csak az automatizált teszt-böngésző sajátossága volt,
nem valós hiba – a `netlify.toml` éles használatra rendben van.

**Érintett fájl:** `netlify.toml` (új).

### 2026-07-15 – Indulási checklist: bejelentkezés, XSS-javítás, jogi oldalak, fejlécek, SDK-frissítés, saját betűtípusok

**Igény:** az indulás előtti állapotfelmérés (checklist artifact) nyitott
tételeinek megvalósítása, külön branchen (`feature/indulasi-checklist`),
alapos ellenőrzéssel. Emellett a Netlify-fagyás kivizsgálása és ingyenes
tárhely-ajánlás.

**Megoldások (checklist-tétel szerint):**

1. **Bejelentkező képernyő (crit-1):** új `auth.js` + `auth.css` – teljes
   képernyős, mindkét oldalon közös e-mail/jelszavas belépő (Firebase
   Authentication), magyar hibaüzenetekkel. A névtelen (anonymous)
   bejelentkezés MEGSZŰNT (`firebase-config.js`, `connection.js`).
   A belépést az eszköz megjegyzi (eszközönként egyszeri belépés).
   Kijelentkezés: Beállítások → Fiók (pénztár), fejléc gomb (konyha).
   A `database.rules.json` minden szabálya mostantól
   `auth.provider === 'password'`-ot követel (a névtelen mód a
   szabályok szintjén is kizárva). FONTOS: élesítés előtt a
   Firebase-konzolban fiókot kell létrehozni és a szabályt publikálni –
   lépésről lépésre: `INDULAS_TEENDOK.md`.
2. **XSS-javítás (crit-2):** új közös `escapeHtml()` (`connection.js`);
   minden adatbázisból/bevitelből származó szöveg (tételnév, megjegyzés,
   statisztika-név) escape-elve kerül innerHTML-be (`index.js`:
   renderMenu, renderCart, renderOrders, showStats,
   renderMenuSettingsList; `kitchen.js`: renderOrders). Az inline
   onclick-paraméterek data-attribútumra váltottak
   (`this.dataset.name` / `this.dataset.id`), a kosár-kiemelés nem épít
   attribútum-szelektort.
3. **App Check előkészítés (crit-5):** app-check-compat SDK betöltve,
   `APP_CHECK_SITE_KEY` konstans a `firebase-config.js`-ben – amíg üres,
   inaktív; bekapcsolás a konzolban + kulcs beillesztése
   (INDULAS_TEENDOK.md 3. lépés). CSP előre engedélyezi a szükséges
   reCAPTCHA/App Check végpontokat.
4. **Jogi oldalak (legal-1, legal-2):** új `impresum.html` +
   `adatvedelem.html` szerb jogszabályi hivatkozásokkal (Zakon o
   elektronskoj trgovini; Zakon o zaštiti podataka o ličnosti,
   Poverenik). A cégadatok helyén sárga `[KITÖLTENDŐ]` jelölők – ezeket
   a felhasználónak kell kitöltenie. Linkek: belépő képernyő alja +
   Beállítások modal.
5. **Fejléc-keményítés (harden-1, harden-2):** `netlify.toml` –
   Strict-Transport-Security (1 év), X-Frame-Options: DENY,
   CSP frame-ancestors 'self'→'none'.
6. **Firebase SDK frissítés (harden-4):** 9.23.0 → 12.16.0 (compat,
   mindkét oldal). Élő teszten igazolva: adatbázis-kapcsolat,
   ServerValue.increment, auth API rendben.
7. **Saját betűtípusok (harden-5):** Outfit + Rubik variable-woff2
   fájlok letöltve (`fonts/`, latin + latin-ext – magyar ő/ű és szerb
   latin karakterekkel), új `fonts.css`; a Google Fonts linkek és a
   CSP fonts.googleapis.com/fonts.gstatic.com forrásai eltávolítva.
8. **Új ikon:** `lock` (`icons.js`) – belépő képernyő + kijelentkezés gomb.

**Netlify-fagyás elemzése (a felhasználó kérdésére):** a tünet („egy idő
után kifagy, GitHub Pages-en nincs gond") egybevág a 2026-07-07-én már
azonosított és javított CSP-hibával (a Firebase dinamikus al-szerverének
tiltása miatt az app „Nincs kapcsolat"-ban ragadt). A javítás
(d35ea5d) óta a felhasználó saját eszközén a Netlify hibátlan volt;
a mostani tapasztalat valószínűleg a javítás ELŐTTI időszakból származik.
Döntés a felhasználónál: maradhat GitHub Pages (hátrány: nincs biztonsági
fejléc), visszaállhat Netlify-ra, vagy átállhat Cloudflare Pages /
Firebase Hostingra (mindkettő ingyenes és támogat fejléceket).

**Tesztelés:** helyi statikus szerveren (preview), élő Firebase ellen,
**adatbázis-írás nélkül**. Igazolva: SDK 12.16.0 betölt, konzolhiba
nincs egyik oldalon sem; a belépő overlay a teljes nézetet takarja
(z-index 350, elementFromPoint-teszt), sötét és világos módban is jó;
DB-kapcsolat él (.info/connected = true); szándékosan hibás
belépési próbánál a Firebase `auth/operation-not-allowed` kódot ad
(az Email/Password mód még nincs bekapcsolva a konzolban – várt
viselkedés), a magyar hibaüzenet-fordítás működik; XSS-próba
(`<img onerror>` minden szövegmezőben, lokális adattal) egyik render
függvénynél sem futott le, minden szövegként jelenik meg, a
data-name/data-id oda-vissza út pontos; a betűtípusok kizárólag
helyből töltődnek (hálózati napló ellenőrizve), a jogi oldalak
hibátlanul renderelődnek. Az élő adatbázishoz nem nyúltam.

**Érintett fájlok:** `auth.js`, `auth.css`, `fonts.css`, `fonts/`,
`impresum.html`, `adatvedelem.html`, `INDULAS_TEENDOK.md` (újak);
`index.html`, `kitchen.html`, `index.js`, `kitchen.js`,
`connection.js`, `firebase-config.js`, `database.rules.json`,
`netlify.toml`, `icons.js` (módosítva).

### 2026-07-16 – Bejelentkezés felhasználónévvel (e-mail cím helyett)

**Igény:** a dolgozóknak ne kelljen e-mail címet beírni a belépéshez,
csak egy egyszerű felhasználónevet. („Nem baj, ha az adatbázisban
máshogy tárolódik el.")

**Háttér:** a Firebase Authentication e-mail/jelszavas módja mindig
e-mail címet vár – felhasználónév-alapú belépést natívan nem tud.

**Megoldás (`auth.js`):** a felületen felhasználónév-mező van; a
Firebase felé küldött e-mail címet a kód állítja össze a háttérben egy
rögzített végződéssel (`LOGIN_EMAIL_DOMAIN = "foodtruck.local"`):

- `usernameToEmail("penztar")` → `penztar@foodtruck.local` (trim +
  kisbetűsítés; ha valaki mégis teljes címet ír be, azt változtatás
  nélkül elfogadjuk – nem duplázza a végződést)
- `emailToUsername()` – a Beállítások „Fiók" sorában a végződés
  levágva jelenik meg, a dolgozó a saját felhasználónevét látja
- `USERNAME_PATTERN` – ékezet/szóköz esetén saját, érthető magyar
  üzenet, még a Firebase-hívás előtt (különben `auth/invalid-email`
  hibakódot kapna a felhasználó)
- a mező `type="email"` → `type="text"`, `autocapitalize="none"`,
  `spellcheck="false"` (tableten a nagybetűsítés zavaró lenne)
- a hibaüzenetek szövege „e-mail cím" → „felhasználónév"

A végződés **nem valódi postafiók** – csak a Firebase belső
azonosítója, sehol nem jelenik meg a felületen.

**Útmutató-frissítés (`INDULAS_TEENDOK.md`, 1. lépés):** a fiókokat a
konzolban `penztar@foodtruck.local` / `konyha@foodtruck.local`
formában kell létrehozni. **Fontos pontosítás:** mivel a végződés nem
valódi postafiók, a konzol „Reset password" gombja (e-mailt küldene)
NEM használható – jelszócsere: fiók törlése és újra létrehozása.

**Tesztelés:** preview szerveren, élő Firebase ellen, **írás nélkül**.
Igazolva képernyőképekkel és egységteszt-jellegű ellenőrzéssel:
a mező felirata „Felhasználónév", a régi e-mail mező megszűnt;
`usernameToEmail` minden ága helyes (sima név, szóközös/nagybetűs,
teljes cím, idegen domain); `emailToUsername` a végződést levágja,
idegen címet érintetlenül hagy; a karakter-ellenőrzés az 5 érvényes
mintát elfogadja, a 4 érvénytelent (ékezet, szóköz, felkiáltójel,
üres) elutasítja. Valódi gépeléssel: „pénztár" → magyar figyelmeztetés;
„penztar" + jelszó → a kérés eljut a Firebase-ig, és a localhostot az
API-kulcs referer-korlátozása (helyesen) elutasítja – ez a védelem
működésének bizonyítéka, élesben ez sikeres belépés lesz.
Konzolhiba egyik oldalon sincs.

**Érintett fájlok:** `auth.js`, `INDULAS_TEENDOK.md`.

---

### 2026-07-24 – Beállítások menü fekvő nézetben görgethető + bejelentkezés csak app-nyitásig érvényes

Két, teszteléskor talált probléma javítása.

**1. Beállítások menü elforgatott (fekvő) nézetben – nem lehetett görgetni.**
A modal `max-height: 88vh` méretű, középre igazított, és csak a belső
étlap-lista (`#menuManageList`) görgethető. Fekvő nézetben a képernyő
magassága kicsi (pl. telefon oldalra fordítva ~375px), így a modal
teteje/alja lelógott a képernyőről, a fix részek – téma-váltó, Fiók,
**Bezárás gomb** – pedig elérhetetlenné váltak.

Megoldás (`index.css`): új `@media (max-height: 600px)` szabály (csak a
`#settingsModal` és `#statsModal` tartalmas ablakokra). Fekvő nézetben sok
a vízszintes hely, kevés a függőleges, ezért a modal **teljes szélességű,
teljes képernyős** (`max-width:none; border-radius:0`), a tartalma pedig
`display:block` mellett **több oszlopba folyik** (`column-width:13rem` →
jellemzően 3 oszlop), így egyszerre sokkal több beállítás látszik, alig kell
görgetni. A cím és a Bezárás gomb a teljes szélességet átfogja
(`column-span:all`), a szekciók nem törnek ketté oszlophatáron
(`break-inside:avoid`, `settings-section-title { break-after:avoid }`).

**FONTOS (élesítés közben, képernyőképes teszttel talált hiba):** ha a
modalnak fix magassága van (`height/max-height:100%`), a több oszlop nem
függőlegesen, hanem **vízszintesen** csordul túl – az étlap-lista a
képernyőn kívülre került. Ezért a modalnak **nincs magasság-korlátja**
(`min-height:100%; max-height:none; overflow:visible`), és inkább az
**overlay** görget függőlegesen (`overflow-y:auto; align-items:flex-start`),
ha a tartalom magasabb a képernyőnél. Álló nézet és a tabletek (magas
képernyő) változatlanok.

**2. Bejelentkezés magától belépett jelszó nélkül (iPhone-on tesztelve).**
A Firebase alapból **tartósan** (LOCAL persistence) megjegyezte a belépést
az eszközön, ezért megnyitáskor jelszó nélkül belépett. A felhasználó
kérése: mindig kérje a jelszót, ne lehessen jelszó nélkül belépni.

Megoldás (`auth.js`): a belépés élettartama `SESSION`-re állítva
(`firebase.auth().setPersistence(...Persistence.SESSION)`, a belépés
elküldése előtt). Így: **oldalfrissítés** után bejelentkezve maradsz
(napközben a tableten nem zavar), de az **app teljes bezárása** után
vagy **másik eszközön** újra kéri a felhasználónevet és jelszót. A belépő
mezők amúgy is `required`-ek – üres mezővel nem lehet belépni.
(Választott mód: „amíg nyitva van" – nem a legszigorúbb „minden
frissítéskor".)

**Tesztelés:** preview szerveren, **DB-írás nélkül**. Fekvő 812×375
méreten a modal a teljes szélességet kitölti (812px), több oszlopos, és
görgetés nélkül minden elfér (`scrollHeight == clientHeight`), a Bezárás
gomb is látszik. Álló 390×844 méreten változatlan: középre igazított,
`max-width:400px`, egyoszlopos. A bejelentkezésnél újratöltés után a
belépő overlay megjelenik és eltakarja az appot; a felhasználónév- és
jelszó-mező `required`; a `setPersistence` hiba nélkül lefutott,
konzolhiba nincs. (A belépés localhostról az API-kulcs referer-
korlátozása miatt szándékosan tiltott – élesben működik.)

**Érintett fájlok:** `index.css`, `auth.js`.

---

### 2026-07-24 – Álló nézet elérhetőség, szigorúbb belépés (NONE), egységes görgetősáv, cache-busting

Manuális teszt (iPhone) alapján talált három probléma.

**1. Álló nézetben a beállítások menü elemei elérhetetlenek voltak.**
A modal korábban flex-oszlop volt, és CSAK a belső étlap-lista görgött; ha a
fix részek (téma, Adatkapcsolat, Fiók, Étlap-űrlap) magasabbak voltak a
képernyőnél, a lenti gombok (pl. Bezárás) elérhetetlenné váltak.
Megoldás (`index.css`): az **egész modal görgethető** (`overflow-y:auto`, a
flex-oszlopos belső görgetés megszüntetve, `#menuManageList/#statsContent →
overflow-y:visible`), így álló nézetben MINDEN elem elérhető – ha nem fér ki,
legalább végig lehet görgetni.

**2. iPhone-on továbbra is magától belépett, jelszó nélkül.**
Két ok: (a) a korábbi `SESSION` sem volt elég szigorú; (b) valószínűleg a régi
`auth.js` maradt a böngésző gyorsítótárában (nincs service worker, a
`netlify.toml` nem állít cache-fejlécet). Megoldás:
- `auth.js`: a persistence `SESSION` → **`NONE`** (in-memory) – a belépés SEHOL
  nem tárolódik, így MINDEN megnyitáskor/oldalfrissítéskor kell a
  felhasználónév + jelszó; jelszó nélkül nem lehet belépni. (Az eszköz, ahol
  korábban tartósan beléptél, a friss kód első betöltésekor még beléphet
  egyszer, utána már mindig kér jelszót.)
- **Cache-busting:** `index.html`/`kitchen.html` a módosított `auth.js`,
  `index.css`, `kitchen.css` hivatkozásokhoz `?v=2` verziót kapott, hogy az
  eszközök biztosan a friss kódot töltsék.

**3. Egységes, témába illő görgetősáv (`/ui-ux-pro-max`).**
`index.css` és `kitchen.css`: globális, a dizájn tokenekből (`--border-strong`,
`--text-faint`) színeződő görgetősáv (`scrollbar-color` + `::-webkit-scrollbar`),
így a görgő „csúszkája" is a felülethez illik, sötét és világos módban is,
stílustörés nélkül.

**Tesztelés:** preview szerveren, **DB-írás nélkül**. Álló 390×720: az egész
modal görgethető, a Bezárás gomb görgetés után elérhető, a görgetősáv a
token-színt kapja, nincs vízszintes túlcsordulás. Belépés: `Persistence.NONE`
elérhető, mindkét mező `required`, a `?v=2` fájlok 200-asak, konzolhiba nincs
(a `favicon.ico` 404 régóta fennáll, ártalmatlan).

**Érintett fájlok:** `index.css`, `auth.js`, `kitchen.css`, `index.html`, `kitchen.html`.

---

### 2026-07-24 – A beállítások „széles" (fekvő, több oszlopos) nézete eltávolítva

Felhasználói kérésre a beállítások/statisztika modalnak megszűnt a külön fekvő
(teljes képernyős, több oszlopos) elrendezése: a `@media (max-height: 600px)`
blokk törölve az `index.css`-ből. Fekvőben ezután ugyanúgy néz ki, mint állóban
– középre igazított, `max-width: 400px`, `max-height: 88vh`, **görgethető**
ablak (az alap `.modal` szabály `overflow-y: auto`-ja miatt minden elem
elérhető). Teszt (812×375): a modal középen, 400px széles, görgethető, nincs
több oszlop és nincs vízszintes túlcsordulás.

**Érintett fájlok:** `index.css`.
