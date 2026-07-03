# 📱 Foodtruck App – Telepítési Útmutató

## Az alkalmazás fájljai

```
foodtruck-app/
├── index.html          ← Pénztáros tablet
├── kitchen.html        ← Szakács tablet
└── firebase-config.js  ← Közös beállítások (ezt kell majd kitölteni)
```

---

## 1. LÉPÉS: Firebase fiók létrehozása (ingyenes)

1. Nyisd meg: **https://console.firebase.google.com**
2. Jelentkezz be egy Google fiókkal (ha nincs, csinálj egyet ingyen)
3. Kattints: **"Create a project"** (Projekt létrehozása)
4. Adj nevet: pl. `foodtruck-rendeles`
5. Google Analytics: **nem kell**, kapcsold ki, majd **"Create project"**

---

## 2. LÉPÉS: Realtime Database bekapcsolása

1. A bal oldali menüben kattints: **"Build"** → **"Realtime Database"**
2. Kattints: **"Create Database"**
3. Válaszd a **legközelebbi szervert** (pl. `europe-west1`)
4. Válaszd a **"Start in test mode"** opciót (ezt az induláshoz így kell
   választani, de utána **kötelező** lezárni – lásd a **7. LÉPÉS**-t,
   különben bárki az interneten közvetlenül hozzáférhet az adatbázishoz)
5. Kattints: **"Enable"**

---

## 3. LÉPÉS: Firebase konfiguráció kimásolása

1. A bal oldali menüben kattints a **fogaskerék ikonra** → **"Project settings"**
2. Görgess le a **"Your apps"** részhez
3. Kattints a **"<\/>"** (Web) ikonra
4. App neve: pl. `foodtruck-web`, majd **"Register app"**
5. Megjelenik egy kód blokk, ami így néz ki:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXX",
  authDomain: "foodtruck-rendeles.firebaseapp.com",
  databaseURL: "https://foodtruck-rendeles-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "foodtruck-rendeles",
  storageBucket: "foodtruck-rendeles.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

6. **Másold ki ezt a teljes blokkot**, és a `firebase-config.js` fájlban
   cseréld le a placeholdereket (`IDE_JÖN_AZ_API_KEY` stb.) a valódi értékekre.

---

## 4. LÉPÉS: Fájlok feltöltése webszerverre

Az alkalmazásnak elérhetőnek kell lennie egy webcímen.
A legegyszerűbb ingyenes lehetőség: **GitHub Pages**.

### GitHub Pages (ingyenes, 5 perc)

1. Hozz létre egy ingyenes fiókot: **https://github.com**
2. Kattints: **"New repository"** (Új repository)
3. Név: `foodtruck-app`, tedd **Public**-ra
4. Töltsd fel a 3 fájlt (`index.html`, `kitchen.html`, `firebase-config.js`)
5. Menj: **Settings** → **Pages** → **Source: main branch** → **Save**
6. Néhány perc múlva elérhető lesz itt:
   `https://[felhasznalonevEd].github.io/foodtruck-app/`

---

## 5. LÉPÉS: Telepítés tabletekre (PWA)

### Mindkét tableten:

1. Nyisd meg a **Chrome** böngészőt
2. A pénztáros tableten nyisd meg: `[URL]/index.html`
3. A szakácsos tableten nyisd meg: `[URL]/kitchen.html`
4. Chrome menü (3 pont) → **"Hozzáadás a kezdőképernyőhöz"**
5. Adj nevet (pl. "Pénztár" vagy "Konyha") → **"Hozzáadás"**
6. Mostantól az asztalról indítható, teljes képernyőn fut!

---

## 6. LÉPÉS: Menü testreszabása

Az étlapot mostantól **nem kell kódban szerkeszteni** – a pénztáros
tableten (`index.html`) a jobb oldali panelen található **"⚙️ Étlap
beállítása"** gombra kattintva nyílik egy felugró ablak:

- **Új tétel felvétele:** írd be az étel nevét és az árát (din), majd
  kattints a **"➕ Hozzáadás az étlaphoz"** gombra – a tétel azonnal
  megjelenik az étlapon, mindkét tableten (illetve minden nyitott lapon).
- **Tétel törlése:** a listában minden tétel mellett van egy ✕ gomb.

Az étlap a Firebase adatbázis `menu` ágában tárolódik, ezért valós
időben szinkronban van minden eszközön, és a böngésző bezárása után is
megmarad. Első indításkor, ha az étlap még teljesen üres, a rendszer
egyszeri jelleggel feltölti az alapértelmezett tételekkel (lásd
`FEJLESZTESI_NAPLO.md`).

---

## 7. LÉPÉS: Biztonság – hozzáférés lezárása (kötelező!)

A "test mode" (2. LÉPÉS) azt jelenti, hogy **bárki, aki ismeri a
databaseURL-t, közvetlen HTTP kéréssel (pl. `curl`) olvashatja vagy
írhatja az adatbázist** – akár hamis rendeléseket is beküldhet, anélkül
hogy megnyitná az appot. Ezt zárja le ez a két lépés. A kód már
tartalmazza a szükséges változtatásokat (`firebase-config.js`,
`index.html`, `kitchen.html`, `database.rules.json`), neked már csak a
Firebase Console-ban kell két dolgot bekapcsolnod:

### 7a. Névtelen bejelentkezés engedélyezése

1. Firebase Console → bal menü → **"Build"** → **"Authentication"**
2. **"Get started"** (ha még nem volt bekapcsolva)
3. **"Sign-in method"** fül → válaszd ki: **"Anonymous"**
4. Kapcsold **"Enable"**-re → **"Save"**

Enélkül az app nem fog tudni csatlakozni az adatbázishoz, mert a kód
mostantól bejelentkezést vár, mielőtt olvasna/írna.

### 7b. Security Rules feltöltése

1. Firebase Console → **"Realtime Database"** → **"Rules"** fül
2. Töröld ki a jelenlegi tartalmat, és másold be helyette a repóban
   található `database.rules.json` fájl tartalmát
3. **"Publish"**

(Ha használod a Firebase CLI-t: `firebase login`, majd a `foodtruck-app`
mappában `firebase deploy --only database` ugyanezt elvégzi
parancssorból.)

A szabályok ellenőrzik, hogy a beküldött rendelés adatok (pager szám,
tételek, ár, státusz) formailag helyesek legyenek, és blokkolják egy
már elküldött rendelés utólagos módosítását (pl. az ár meghamisítását) –
csak a "kész" jelölés (status mező) módosítható utólag.

---

## Napi használat

| Lépés | Mit csinálj |
|-------|-------------|
| Reggel | Nyisd meg az appot mindkét tableten |
| Szakácsos tablet | Nyomj a "🔕 Hangjelzés ki" gombra → aktíválja a hangot |
| Rendelésnél | Írd be a sorszámot (csipogó száma), nyomj az ételekre, küldd el |
| Szakácsnál | Láttomásra: sorszám, ételek, megjegyzések – ha kész: "✅ KÉSZ" |
| Este | A pénztáros tableten: "📊 Napi statisztika megtekintése" |

---

## Kérdések / Problémák

Ha valamit nem sikerül beállítani, csak küldj üzenetet!
