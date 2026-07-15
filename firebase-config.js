// ============================================================
// FIREBASE KONFIGURÁCIÓ – FoodtrusckSU2 projekt
// ============================================================
// Ezek a te saját Firebase adataid. Ne add meg senkinek!
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBSx3t2hV3befjFHshz6ph0dPHeWGor58E",
  authDomain: "foodtruscksu2.firebaseapp.com",
  databaseURL: "https://foodtruscksu2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "foodtruscksu2",
  storageBucket: "foodtruscksu2.firebasestorage.app",
  messagingSenderId: "18381721367",
  appId: "1:18381721367:web:755a15d7934e68faab3152"
};

// Firebase inicializálás (elindítás)
firebase.initializeApp(firebaseConfig);

// ============================================================
// FIREBASE APP CHECK (opcionális, de erősen ajánlott védelem)
// ============================================================
// Az App Check azt garantálja, hogy CSAK a te tényleges weboldalad
// érheti el az adatbázist – a nyilvános API-kulccsal böngészőn
// kívülről (pl. saját szkripttel) próbálkozókat a Firebase elutasítja.
//
// Bekapcsolás (részletes útmutató: INDULAS_TEENDOK.md, 3. lépés):
//   1. Firebase-konzol → App Check → reCAPTCHA v3 regisztráció
//   2. A kapott site key-t másold be ide a két idézőjel közé
// Amíg a site key üres, ez a blokk semmit nem csinál – az app
// ugyanúgy működik, mint eddig.
const APP_CHECK_SITE_KEY = "";

if (APP_CHECK_SITE_KEY && firebase.appCheck) {
  firebase.appCheck().activate(APP_CHECK_SITE_KEY, true);  // true → a token magától frissül
}

// FONTOS: bejelentkezés nélkül az app nem használható!
// A korábbi névtelen (anonymous) bejelentkezést e-mail/jelszavas
// belépő képernyő váltotta le (auth.js) – a névtelen mód bárkinek
// teljes hozzáférést adott, aki ismerte az oldal címét.
// Az adatbázis-szabályok (database.rules.json) is csak az
// e-mail/jelszóval belépett felhasználót engedik.

// Adatbázis referencia – ezen keresztül olvasunk/írunk adatot
const db = firebase.database();

// A rendelések tárolási helye az adatbázisban
const ordersRef = db.ref("orders");

// A napi statisztika tárolási helye az adatbázisban
// (rendeléskor/állapotváltáskor frissül, és a "Statisztika nullázása"
// gombbal ürül ki – független az "orders" lista tartalmától,
// így törölt rendelések után is helyes marad az összesítés)
const statsRef = db.ref("dailyStats");

// Az étlap (eladható tételek + áraik) tárolási helye az adatbázisban.
// A ⚙️ Beállítások menüből lehet ide új tételt felvenni vagy meglévőt törölni.
const menuRef = db.ref("menu");

// ============================================================
// NAPI STATISZTIKA KÖNYVELÉSE – közös segédfüggvény
// (a pénztár és a konyha oldal is ezt hívja)
//
// A statisztikába CSAK a késznek (teljesítettnek) jelölt rendelések
// kerülnek bele. Ez a függvény egy rendelés összes tételét (ételek ÉS
// italok) hozzáadja a napi statisztikához, vagy levonja belőle.
//
// direction: +1 → rendelés késznek jelölve (hozzáadás)
//            -1 → kész rendelés visszaállítva újra (levonás)
// ============================================================
function applyStatsForOrder(order, direction) {
    const updates = {
        doneCount: firebase.database.ServerValue.increment(direction)
    };
    (order.items || []).forEach(item => {
        updates[`items/${item.name}`] =
            firebase.database.ServerValue.increment(direction * item.qty);
    });
    statsRef.update(updates);
}
