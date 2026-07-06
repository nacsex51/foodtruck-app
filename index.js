// ============================================================
// PÉNZTÁR OLDAL – ALKALMAZÁS LOGIKA (az index.html tölti be)
// ============================================================
// TARTALOMJEGYZÉK – a címre keresve (Ctrl+F) ugorhatsz a
// megfelelő szekcióra:
//     1. ÁLLAPOT (state)
//     2. KEZDETI ÉTLAP
//     3. ÉTLAP GYORSÍTÓTÁR (localStorage)
//     4. PAGER GOMBOK GENERÁLÁSA
//     5. PAGER KIVÁLASZTÁSA
//     6. ÉTLAP GOMBOK GENERÁLÁSA
//     7. ÉTEL HOZZÁADÁSA A KOSÁRHOZ
//     8. KOSÁR MEGJELENÍTÉSE
//     9. MENNYISÉG VÁLTOZTATÁSA (+/-)
//    10. MEGJEGYZÉS FRISSÍTÉSE
//    11. TÉTEL ELTÁVOLÍTÁSA A KOSÁRBÓL
//    12. RENDELÉS ELKÜLDÉSE FIREBASE-BE
//    13. MEGERŐSÍTŐ MODAL
//    14. RENDELÉS TÖRLÉSE
//    15. RENDELÉS KÉSZNEK (TELJESÍTETTNEK) JELÖLÉSE
//    16. RENDELÉSEK LISTÁJÁNAK MEGJELENÍTÉSE (jobb panel)
//    17. VALÓS IDEJŰ SZINKRON BEÁLLÍTÁSA
//    18. NAPI STATISZTIKA
//    19. NAPI STATISZTIKA NULLÁZÁSA
//    20. TÉMA (SÖTÉT / VILÁGOS MÓD)
//    21. BEÁLLÍTÁSOK (téma + étlap tétel hozzáadása / törlése / ár)
//    22. KEZDETI RENDERELÉS (a fájl legalján)
// ============================================================

// ============================================================
// ÁLLAPOT (state) – az alkalmazás "memóriája"
// ============================================================

let cart = [];
let orders = {};
let selectedQueue = null;  // A kiválasztott pager sorszáma (1-16)
let dailyStats = { orderCount: 0, doneCount: 0, items: {} };  // Tartósan tárolt napi statisztika
let menuItems = {};  // Az étlap Firebase-ből: { itemId: { name, price } }
let menuLoaded = false;  // Megérkezett-e már az étlap a Firebase-ből

// ============================================================
// KEZDETI ÉTLAP – csak akkor kerül fel a Firebase "menu" ágába,
// ha az még teljesen üres (első indításkor). Utána az étlapot
// kizárólag az Étlap beállítása modal kezeli.
// ============================================================
const DEFAULT_MENU_ITEMS = {
    "Dupli Cheeseburger": { price: 2200, category: "food" },
    "Cheeseburger":       { price: 1800, category: "food" },
    "Gyros Pita":         { price: 1900, category: "food" },
    "Gyros Box":          { price: 2400, category: "food" },
    "Pulled Pork":        { price: 2300, category: "food" },
    "Pulled Chicken":     { price: 2100, category: "food" },
    "Pljeskavica":        { price: 2000, category: "food" },
    "Pomfrit":            { price: 900,  category: "food" }
};


// ============================================================
// ÉTLAP GYORSÍTÓTÁR (localStorage)
// A Firebase-ből érkező étlapot elmentjük localStorage-be, hogy
// a következő betöltéskor AZONNAL ki tudjuk rajzolni a menü-
// gombokat, még mielőtt a hitelesítés + adatletöltés befejeződne.
// (Enélkül az "ÉTELEK" szekció első betöltéskor másodpercekig üres
// maradt.) A Firebase-ből megérkező friss adat felülírja a cache-t.
// ============================================================
const MENU_CACHE_KEY = "foodtruckMenuCache";

function loadMenuCache() {
    try {
        return JSON.parse(localStorage.getItem(MENU_CACHE_KEY)) || {};
    } catch (err) {
        return {};  // Sérült/hiányzó cache → üres étlappal indulunk
    }
}

function saveMenuCache(items) {
    try {
        localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(items));
    } catch (err) {
        // Ha a localStorage nem elérhető (pl. privát mód), nincs baj:
        // az app cache nélkül, kicsit lassabban indulva is működik.
    }
}


// ============================================================
// PAGER GOMBOK GENERÁLÁSA
// Ez lefut egyszer, az oldal betöltésekor.
// 16 gombot hoz létre (1-től 16-ig) és berakja a .pager-grid-be.
// ============================================================
function renderPagerButtons() {
    const grid = document.querySelector(".pager-grid");

    // Összegyűjtjük a FOGLALT pager számokat az aktív rendelésekből.
    // Object.values(orders) → az orders objektum értékeit adja vissza tömbként
    // .map(o => o.queue) → minden rendelésből csak a pager számát vesszük ki
    // Eredmény pl.: [3, 7, 12] ha ezek a pagerek ki vannak adva
    const occupiedPagers = Object.values(orders).map(o => o.queue);

    // Array.from({length: 16}, (_, i) => i + 1) → [1, 2, 3, ..., 16]
    grid.innerHTML = Array.from({length: 16}, (_, i) => i + 1)
        .map(num => {
            const isSelected = selectedQueue === num;
            const isOccupied = occupiedPagers.includes(num);  // Foglalt-e ez a pager?

            // Ha foglalt ÉS nem ez a kiválasztott (ami küldés előtt van)
            // akkor szürke és nem kattintható
            if (isOccupied && !isSelected) {
                return `
          <button
            class="pager-btn occupied"
            disabled
            title="#${num} pager már ki van adva"
          >${num}</button>
        `;
            }

            // Szabad vagy éppen kiválasztott pager → normál gomb
            return `
        <button
          class="pager-btn ${isSelected ? 'selected' : ''}"
          onclick="selectPager(${num})"
        >${num}</button>
      `;
        }).join("");
}


// ============================================================
// PAGER KIVÁLASZTÁSA
// num: a megnyomott gomb száma (1-16)
// ============================================================
function selectPager(num) {
    // Ellenőrzés: foglalt-e ez a pager?
    // (Biztonsági check, bár a disabled gomb elvileg nem kattintható)
    const occupiedPagers = Object.values(orders).map(o => o.queue);
    if (occupiedPagers.includes(num)) {
        showToast(`A #${num} pager már ki van adva! Várj, amíg visszahozzák.`, "error");
        return;
    }

    // Ha ugyanazt nyomja meg újra, töröljük a kiválasztást
    if (selectedQueue === num) {
        selectedQueue = null;
        document.getElementById("selectedQueueDisplay").innerHTML =
            "Még nincs sorszám kiválasztva";
    } else {
        selectedQueue = num;
        document.getElementById("selectedQueueDisplay").innerHTML =
            `Kiválasztott pager: <span>#${num}</span>`;
    }

    // Újrarajzoljuk a gombokat, hogy a kiválasztott kiemelve legyen
    renderPagerButtons();
}


// ============================================================
// ÉTLAP GOMBOK GENERÁLÁSA
// A menuItems (Firebase "menu" ág) alapján rajzolja ki a
// menügombokat. Lefut minden real-time frissüléskor is, hogy az
// étlap mindkét tableten (illetve minden nyitott lapon) azonnal
// frissüljön, ha valaki hozzáad vagy töröl egy tételt.
// ============================================================
function renderMenu() {
    const foodGrid = document.getElementById("menuGridFood");
    const drinkGrid = document.getElementById("menuGridDrinks");
    const drinksSection = document.getElementById("drinksSection");

    // Szétválogatás kategória szerint. A régebbi (kategória nélküli)
    // tételek ételnek számítanak, így semmi nem veszik el.
    const items = Object.values(menuItems);
    const foods = items.filter(item => item.category !== "drink");
    const drinks = items.filter(item => item.category === "drink");

    // Egy menügomb HTML-je (közös az étel- és italrácsnak)
    const menuBtn = item => `
    <button class="menu-btn" data-name="${item.name}" onclick="addToCart('${item.name.replace(/'/g, "\\'")}')">
        <span class="menu-btn-name">${item.name}</span>
        <span class="menu-btn-price">${item.price} din</span>
    </button>
  `;

    if (foods.length === 0) {
        // Amíg a Firebase-ből nem érkezett meg az étlap, "betöltés"
        // jelzést mutatunk – az "üres étlap" üzenet csak már
        // megérkezett (tényleg üres) adat esetén jogos.
        foodGrid.innerHTML = menuLoaded
            ? '<p style="color:var(--text-faint);font-size:0.85rem;">Még nincs felvéve étlap tétel. Add hozzá a fejléc fogaskerék ikonjával!</p>'
            : '<p style="color:var(--text-faint);font-size:0.85rem;">Étlap betöltése…</p>';
    } else {
        foodGrid.innerHTML = foods.map(menuBtn).join("");
    }

    // Az Italok szekció csak akkor látszik, ha van ital az étlapon
    drinksSection.style.display = drinks.length > 0 ? "" : "none";
    drinkGrid.innerHTML = drinks.map(menuBtn).join("");

    // A kosárban lévő tételek kiemelése (pl. étlap-frissítés után is)
    cart.forEach(cartItem => {
        document.querySelectorAll(`.menu-btn[data-name="${cartItem.name}"]`)
            .forEach(btn => btn.classList.add("in-cart"));
    });

    hydrateIcons();
}


// ============================================================
// ÉTEL HOZZÁADÁSA A KOSÁRHOZ
// Ezt hívja meg minden menü gomb kattintáskor.
// ============================================================
function addToCart(itemName) {
    // Megnézzük, hogy az étel már szerepel-e a kosárban
    const existing = cart.find(i => i.name === itemName);

    // Az árat a jelenlegi étlapból (menuItems) keressük ki
    const menuItem = Object.values(menuItems).find(i => i.name === itemName);

    if (existing) {
        // Ha már benne van, növeljük a mennyiségét
        existing.qty += 1;
    } else {
        // Ha még nincs benne, hozzáadjuk (árát és kategóriáját az
        // étlapból vesszük – az ital tételeket a konyha majd kiszűri)
        cart.push({
            name: itemName,
            qty: 1,
            note: "",
            price: menuItem ? menuItem.price : 0,
            category: menuItem && menuItem.category === "drink" ? "drink" : "food"
        });
    }

    // Frissítjük a kosár megjelenítést
    renderCart();
}


// ============================================================
// KOSÁR MEGJELENÍTÉSE
// Ez rajzolja ki a képernyőre az aktuális kosár tartalmát.
// ============================================================
function renderCart() {
    const container = document.getElementById("cartItems");

    // Ha üres a kosár
    if (cart.length === 0) {
        container.innerHTML = '<p style="color:var(--text-faint);font-size:0.85rem;">Még nincs tétel a kosárban.</p>';
        document.getElementById("cartTotal").innerHTML = "";
        // Menü gombok visszaállítása (egyik sem kiemelve)
        document.querySelectorAll(".menu-btn").forEach(btn => btn.classList.remove("in-cart"));
        return;
    }

    // Kiemeljük azokat a menü gombokat, amik a kosárban vannak
    document.querySelectorAll(".menu-btn").forEach(btn => {
        const inCart = cart.some(i => i.name === btn.dataset.name);
        btn.classList.toggle("in-cart", inCart);
    });

    // Minden kosár tételt kirajtolunk
    // cart.map() → végigmegy a tömbön és minden elemből HTML-t csinál
    // .join("") → az elemeket összefűzi egy szöveggé
    container.innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <div class="cart-item-header">
        <span class="cart-item-name">${item.name}</span>
        <button class="remove-item-btn" onclick="removeFromCart(${index})" aria-label="Tétel eltávolítása" data-icon="close" data-icon-size="14"></button>
      </div>

      <div class="cart-item-header">
        <span class="cart-item-price">${item.price} din / db</span>
        <span class="cart-item-line-total">${item.price * item.qty} din</span>
      </div>

      <!-- Mennyiség +/- kezelő -->
      <div class="qty-controls">
        <button class="qty-btn" onclick="changeQty(${index}, -1)">−</button>
        <span class="qty-display">${item.qty} db</span>
        <button class="qty-btn" onclick="changeQty(${index}, +1)">+</button>
      </div>

      <!-- Megjegyzés mező
           oninput → azonnal menti amit beírunk (nem kell Enter)
           A ${index} megmondja, melyik tételhez tartozik a megjegyzés -->
      <textarea
        class="item-note"
        placeholder="Megjegyzés (pl. hagyma nélkül)..."
        oninput="updateNote(${index}, this.value)"
      >${item.note}</textarea>
    </div>
  `).join("");

    // Végösszeg kiszámítása: minden tétel ára × mennyisége, összeadva
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    document.getElementById("cartTotal").innerHTML = `
    <span>Végösszeg:</span>
    <span>${total} din</span>
  `;

    hydrateIcons();
}


// ============================================================
// MENNYISÉG VÁLTOZTATÁSA (+/-)
// index: melyik tételt változtatjuk (0, 1, 2, ...)
// delta: +1 vagy -1
// ============================================================
function changeQty(index, delta) {
    cart[index].qty += delta;

    // Ha 0-ra csökkenne, töröljük a tételt
    if (cart[index].qty <= 0) {
        removeFromCart(index);
    } else {
        renderCart();
    }
}


// ============================================================
// MEGJEGYZÉS FRISSÍTÉSE
// index: melyik tétel megjegyzése változott
// value: az új szöveg
// ============================================================
function updateNote(index, value) {
    cart[index].note = value;
    // Nem kell renderCart() mert a szöveg már ott van a mezőben
}


// ============================================================
// TÉTEL ELTÁVOLÍTÁSA A KOSÁRBÓL
// splice(index, 1) → kitöröl 1 elemet az adott pozícióból
// ============================================================
function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}


// ============================================================
// RENDELÉS ELKÜLDÉSE FIREBASE-BE
// ============================================================
function sendOrder() {
    // Ellenőrzések: pager kiválasztva és kosár nem üres
    if (!selectedQueue) {
        showToast("Kérlek válassz pager sorszámot!", "error");
        return;
    }

    if (cart.length === 0) {
        showToast("A kosár üres, adj hozzá ételeket!", "error");
        return;
    }

    // Rendelés objektum összeállítása
    const order = {
        queue: selectedQueue,     // Kiválasztott pager száma
        items: cart,              // Ételek listája
        status: "new",            // Állapot: "new" = Új
        timestamp: Date.now()     // Időbélyeg
    };

    // Küldés Firebase-be.
    // A napi statisztikába itt még NEM kerül bele semmi – a rendelés
    // csak akkor könyvelődik, amikor késznek jelölik (pipa gomb itt,
    // vagy KÉSZ gomb a konyhán). Lásd markOrderDone() lentebb.
    // A pager számát elmentjük a visszajelzéshez (a küldés után
    // a selectedQueue már nullázva lesz)
    const sentQueue = selectedQueue;

    ordersRef.push(order)
        .then(() => {
            // Sikeres küldés után visszaállítunk mindent
            cart = [];
            selectedQueue = null;
            document.getElementById("selectedQueueDisplay").innerHTML =
                "Még nincs sorszám kiválasztva";
            renderPagerButtons();   // Gombok visszaállítása (egyik sem kijelölt)
            renderCart();
            // Pozitív visszajelzés: a rendelés biztosan beíródott az
            // adatbázisba (a .then() csak sikeres mentés után fut le)
            showToast(`A #${sentQueue} rendelés elküldve a konyhára.`, "success");
        })
        .catch(err => {
            showToast("Hiba a küldés során: " + err.message, "error", 6000);
        });
}


// ============================================================
// MEGERŐSÍTŐ MODAL – a natív confirm() kiváltása
// showConfirm(üzenet, gombfelirat, teendő) → megnyitja a modalt;
// a "teendő" callback csak a piros megerősítő gomb megnyomásakor
// fut le, Mégse/bezárás esetén nem történik semmi.
// ============================================================
let confirmAction = null;  // A megerősítésre váró művelet

function showConfirm(message, confirmLabel, onConfirm) {
    // textContent → a tétel neve biztonságosan, HTML-ként nem
    // értelmezve kerül a modalba
    document.getElementById("confirmMessage").textContent = message;
    document.getElementById("confirmOkBtn").innerHTML =
        `${icon("trash", 16)} ${confirmLabel}`;
    confirmAction = onConfirm;
    document.getElementById("confirmModal").classList.add("open");
}

function closeConfirm() {
    confirmAction = null;
    document.getElementById("confirmModal").classList.remove("open");
}

function acceptConfirm() {
    const action = confirmAction;
    closeConfirm();
    if (action) action();
}


// ============================================================
// RENDELÉS TÖRLÉSE
// orderId: a Firebase által generált egyedi azonosító (pl. "-Nab123")
// ============================================================
function deleteOrder(orderId) {
    // Megerősítés kérése törlés előtt (saját modal, nem natív confirm)
    showConfirm("Biztosan törlöd ezt a rendelést?", "Törlés", () => {
        // remove() → törli az adott rendelést Firebase-ből
        // Ez automatikusan szinkronizálódik a szakácsos tabletre is!
        ordersRef.child(orderId).remove();
    });
}


// ============================================================
// RENDELÉS KÉSZNEK (TELJESÍTETTNEK) JELÖLÉSE – pipa gomb
//
// Ugyanazt csinálja, mint a konyhai "KÉSZ" gomb: átállítja a
// státuszt, és EKKOR könyvelődik a rendelés a napi statisztikába
// (applyStatsForOrder, közös függvény a firebase-config.js-ben).
//
// Erre a gombra azért van szükség a pénztárnál is, mert a csak
// italt tartalmazó rendelések a konyhán meg sem jelennek – azokat
// csak itt lehet késznek jelölni.
//
// A transaction() garantálja, hogy ha a konyha és a pénztár
// (majdnem) egyszerre jelölné késznek ugyanazt a rendelést, a
// statisztikába akkor is csak egyszer könyvelődjön.
// ============================================================
function markOrderDone(orderId) {
    const order = orders[orderId];
    if (!order || order.status === "done") return;

    ordersRef.child(orderId).child("status").transaction(current => {
        if (current === "done") return;  // már kész → megszakítjuk
        return "done";
    }, (err, committed) => {
        if (err || !committed) return;
        applyStatsForOrder(order, +1);
    });
}


// ============================================================
// RENDELÉSEK LISTÁJÁNAK MEGJELENÍTÉSE (jobb panel)
// ============================================================
function renderOrders() {
    const container = document.getElementById("ordersList");

    // Az orders objektumból kulcsokat (ID-kat) kivesszük
    const orderKeys = Object.keys(orders);

    // Számlálót frissítjük a fejlécben
    document.getElementById("orderCount").textContent =
        orderKeys.length + " rendelés";

    if (orderKeys.length === 0) {
        container.innerHTML = '<p class="empty-state">Jelenleg nincs aktív rendelés.</p>';
        return;
    }

    // Rendezés: legújabb elöl (timestamp alapján)
    orderKeys.sort((a, b) => orders[b].timestamp - orders[a].timestamp);

    container.innerHTML = orderKeys.map(id => {
        const order = orders[id];
        const isDone = order.status === "done";

        return `
      <div class="order-card ${isDone ? 'done' : ''}">
        <div class="order-card-header">
          <span class="order-queue">#${order.queue}</span>
          <span class="order-status ${isDone ? 'status-done' : 'status-new'}">
            ${isDone ? icon('checkCircle', 13) + ' KÉSZ' : '<span class="status-dot"></span> ÚJ'}
          </span>
        </div>

        <!-- Ételek listája a rendelésen belül -->
        ${order.items.map(item => `
          <div class="order-item-line">
            <strong>${item.qty}× ${item.name}</strong>
            <span class="order-item-price">${(item.price || 0) * item.qty} din</span>
            ${item.note ? `<div class="order-item-note">${icon('pencil', 12)} ${item.note}</div>` : ''}
          </div>
        `).join("")}

        <!-- Rendelés végösszege -->
        <div class="order-total">
          <span>Végösszeg:</span>
          <span>${order.items.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0)} din</span>
        </div>

        ${isDone ? '' : `
        <!-- Pipa gomb: rendelés késznek jelölése (ekkor kerül a
             rendelés a napi statisztikába) -->
        <button class="complete-btn" onclick="markOrderDone('${id}')">
          <span data-icon="checkCircle" data-icon-size="16"></span> TELJESÍTVE
        </button>`}

        <!-- Törlés gomb (csak a pénztáros tableten van) -->
        <button class="delete-btn" onclick="deleteOrder('${id}')">
          <span data-icon="trash" data-icon-size="14"></span> Rendelés törlése
        </button>
      </div>
    `;
    }).join("");

    hydrateIcons();
}


// ============================================================
// VALÓS IDEJŰ SZINKRON BEÁLLÍTÁSA
//
// Az "on('value', ...)" folyamatosan "figyeli" a Firebase-t.
// Minden változáskor (új rendelés, törlés, státusz változás)
// automatikusan lefut a callback függvény, és frissíti a képernyőt.
// Ez az, ami miatt a két tablet szinkronban van!
// ============================================================
// A listenereket csak a névtelen bejelentkezés sikeres létrejötte után
// kapcsoljuk be – a security rules hitelesítést követelnek meg, enélkül
// a lekérdezés "permission denied" hibával elutasítódna.
// A syncStarted őr garantálja, hogy a listenerek csak EGYSZER épüljenek
// ki akkor is, ha a bejelentkezés később (pl. a kapcsolat-őr pótló
// bejelentkezése után) újra lefutna – különben duplán frissülne minden.
let syncStarted = false;

firebase.auth().onAuthStateChanged((user) => {
    if (!user || syncStarted) return;
    syncStarted = true;

    ordersRef.on("value", (snapshot) => {
        // snapshot.val() → az adatbázisból jövő adat
        orders = snapshot.val() || {};  // Ha null (üres), legyen üres objektum
        renderOrders();
        // Pager gombokat is frissítjük, mert változhattak a foglalt pagerek
        // Pl. ha töröltek egy rendelést, az a pager újra szabad lesz
        renderPagerButtons();
    });

    // A tartósan tárolt napi statisztikát is folyamatosan figyeljük,
    // hogy a modal mindig a legfrissebb adatot mutassa.
    statsRef.on("value", (snapshot) => {
        dailyStats = snapshot.val() || { orderCount: 0, doneCount: 0, items: {} };
    });

    // Az étlapot (menu) is folyamatosan figyeljük, hogy real-time
    // frissüljön minden nyitott lapon, ha valaki hozzáad/töröl egy
    // tételt. Első indításkor, ha az ág teljesen üres, egyszeri
    // jelleggel feltöltjük az alapértelmezett tételekkel.
    menuRef.once("value").then((snapshot) => {
        if (!snapshot.exists()) {
            const seed = {};
            Object.entries(DEFAULT_MENU_ITEMS).forEach(([name, def]) => {
                const key = menuRef.push().key;
                seed[key] = { name, price: def.price, category: def.category };
            });
            return menuRef.set(seed);
        }
    }).finally(() => {
        menuRef.on("value", (snapshot) => {
            menuLoaded = true;
            menuItems = snapshot.val() || {};
            saveMenuCache(menuItems);   // gyorsítótár a következő betöltéshez
            renderMenu();
            renderCart();               // árak/gombok újraszinkronizálása
            renderMenuSettingsList();    // ha a beállítások modal nyitva van
        });
    });
});


// ============================================================
// NAPI STATISZTIKA
// ============================================================
function showStats() {
    // A statisztikában CSAK a késznek (teljesítettnek) jelölt
    // rendelések szerepelnek – a beérkezett, de még el nem készült
    // vagy törölt rendelések nem számítanak bele.
    const doneCount = dailyStats.doneCount || 0;
    const items = dailyStats.items || {};

    // A statisztika csak tételnév + darabszám párokat tárol, ezért a
    // kategóriát (Étel/Ital) az aktuális étlapból keressük ki név
    // alapján. Ha egy tétel már nincs az étlapon, Ételnek számít
    // (ugyanaz az alapértelmezés, mint mindenhol máshol az appban).
    const isDrink = (name) => {
        const menuItem = Object.values(menuItems).find(i => i.name === name);
        return !!menuItem && menuItem.category === "drink";
    };

    // Rendezés: legtöbbet eladott tétel előre, majd bontás kategóriára
    const sorted = Object.entries(items)
        .sort((a, b) => b[1] - a[1]);  // b[1] - a[1] → csökkenő sorrend
    const foods = sorted.filter(([name]) => !isDrink(name));
    const drinks = sorted.filter(([name]) => isDrink(name));

    // Egy szekció (cím + összesített darabszám + tételsorok) HTML-je.
    // Az összesített darabszám a leltározást segíti.
    const section = (title, list) => {
        const sum = list.reduce((total, [, count]) => total + count, 0);
        let h = `
      <p class="stats-section-title">
        <span>${title}</span>
        <span class="stats-section-sum">össz. ${sum} db</span>
      </p>
    `;
        h += list.map(([name, count]) => `
      <div class="stat-row">
        <span>${name}</span>
        <span class="stat-value">${count} db</span>
      </div>
    `).join("");
        return h;
    };

    // HTML összeállítása a modalhoz
    let html = `
    <div class="stat-row">
      <span>Teljesített rendelés ma:</span>
      <span class="stat-value">${doneCount} db</span>
    </div>
  `;

    if (sorted.length === 0) {
        html += '<p style="color:var(--text-faint);font-size:0.85rem;margin-top:12px;">Ma még nincs teljesített rendelés.</p>';
    } else {
        // Csak azok a szekciók jelennek meg, amikben van eladott tétel
        if (foods.length > 0)  html += section("Ételek", foods);
        if (drinks.length > 0) html += section("Italok", drinks);
    }

    document.getElementById("statsContent").innerHTML = html;
    document.getElementById("statsModal").classList.add("open");
}

// ============================================================
// NAPI STATISZTIKA NULLÁZÁSA
// A tárolt statisztikát (rendelésszám, teljesített darabszám,
// eladott ételek) visszaállítja nulláára. Az aktív rendeléseket
// (orders lista) NEM érinti.
// ============================================================
function resetStats() {
    showConfirm("Biztosan nullázod a napi statisztikát? Ez nem vonható vissza.", "Nullázás", () => {
        statsRef.set({ orderCount: 0, doneCount: 0, items: {} })
            .then(() => showStats());  // Modal tartalmának azonnali frissítése
    });
}

function closeStats() {
    document.getElementById("statsModal").classList.remove("open");
}

// ============================================================
// TÉMA (SÖTÉT / VILÁGOS MÓD)
// A választott téma localStorage-ben tárolódik, és a <head>-ben
// lévő kis script már betöltéskor alkalmazza, hogy ne villanjon.
// Itt csak a váltás és a gombok kiemelése történik.
// ============================================================
const THEME_KEY = "foodtruckTheme";

function setTheme(mode) {
    if (mode === "light") {
        document.documentElement.dataset.theme = "light";
    } else {
        delete document.documentElement.dataset.theme;
    }

    try {
        localStorage.setItem(THEME_KEY, mode);
    } catch (err) {
        // localStorage nélkül a téma csak az oldal újratöltéséig él
    }

    // A böngésző címsor/állapotsáv színe is kövesse a témát (PWA)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === "light" ? "#f2f2f6" : "#0a0a0f";

    updateThemeButtons();
}

// A Beállítások modal két téma-gombja közül az aktívat kiemeli
function updateThemeButtons() {
    const isLight = document.documentElement.dataset.theme === "light";
    document.getElementById("themeBtnDark").classList.toggle("active", !isLight);
    document.getElementById("themeBtnLight").classList.toggle("active", isLight);
}

// ============================================================
// BEÁLLÍTÁSOK (téma + étlap tétel hozzáadása / törlése / ár)
// ============================================================
function openSettings() {
    renderMenuSettingsList();
    document.getElementById("settingsModal").classList.add("open");
}

function closeSettings() {
    document.getElementById("settingsModal").classList.remove("open");
}

// Az étlap kezelő lista kirajzolása a Beállítások modalban
// (minden meglévő tétel neve, ára és egy törlés gomb).
function renderMenuSettingsList() {
    const container = document.getElementById("menuManageList");
    if (!container) return;  // a modal még nincs a DOM-ban (nem várt eset)

    const entries = Object.entries(menuItems);
    if (entries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-faint);font-size:0.85rem;">Még nincs felvéve étlap tétel.</p>';
        return;
    }

    container.innerHTML = entries.map(([id, item]) => `
    <div class="menu-manage-row">
      <span>${item.name}<span class="menu-manage-cat">${item.category === "drink" ? "Ital" : "Étel"}</span></span>
      <span style="display:flex;align-items:center;gap:6px;">
        <input
          type="number"
          class="menu-price-input"
          value="${item.price}"
          min="1" max="100000"
          onchange="updateMenuItemPrice('${id}', this.value)"
          aria-label="${item.name} ára (din)"
        />
        <span class="menu-manage-price">din</span>
        <button class="menu-manage-delete" onclick="deleteMenuItem('${id}')" aria-label="Tétel törlése" data-icon="close" data-icon-size="14"></button>
      </span>
    </div>
  `).join("");

    hydrateIcons();
}

// Új tétel felvétele az étlapra a Beállítások modal formjából
function addMenuItem() {
    const nameInput = document.getElementById("newItemName");
    const priceInput = document.getElementById("newItemPrice");
    const categorySelect = document.getElementById("newItemCategory");

    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    // Kategória: "drink" = Ital (a konyhán nem jelenik meg), minden más Étel
    const category = categorySelect.value === "drink" ? "drink" : "food";

    if (!name) {
        showToast("Add meg a tétel nevét!", "error");
        return;
    }
    // A 0 ár is hibás bevitelnek számít (üres ár-mező is 0-t adna)
    if (!Number.isFinite(price) || price <= 0 || price > 100000) {
        showToast("Adj meg egy érvényes árat (1 és 100000 din között)!", "error");
        return;
    }

    // Duplikáció elkerülése: figyelmeztetünk, ha már van ilyen nevű tétel
    const alreadyExists = Object.values(menuItems).some(
        item => item.name.toLowerCase() === name.toLowerCase()
    );
    if (alreadyExists) {
        showToast("Már van ilyen nevű tétel az étlapon!", "error");
        return;
    }

    menuRef.push({ name, price, category })
        .then(() => {
            nameInput.value = "";
            priceInput.value = "";
            categorySelect.value = "food";
            nameInput.focus();
            showToast(`"${name}" felkerült az étlapra.`, "success");
        })
        .catch(err => {
            showToast("Hiba a tétel hozzáadása során: " + err.message, "error", 6000);
        });
}

// Meglévő tétel árának módosítása (a Beállítások modal listájából).
// Az onchange akkor fut le, amikor a pénztáros kilép az ár-mezőből
// (vagy Entert nyom) – ekkor azonnal mentjük Firebase-be, és a
// real-time listener miatt minden nyitott lapon frissül az ár.
function updateMenuItemPrice(itemId, value) {
    const price = Number(value);

    // Ugyanaz a validáció, mint új tétel felvételekor
    if (!Number.isFinite(price) || price <= 0 || price > 100000) {
        showToast("Adj meg egy érvényes árat (1 és 100000 din között)!", "error");
        renderMenuSettingsList();  // az eredeti ár visszaáll a mezőben
        return;
    }

    menuRef.child(itemId).update({ price })
        .catch(err => {
            showToast("Hiba az ár módosítása során: " + err.message, "error", 6000);
            renderMenuSettingsList();
        });
}

// Tétel törlése az étlapról (a Beállítások modal listájából)
function deleteMenuItem(itemId) {
    const item = menuItems[itemId];
    const name = item ? item.name : "ez a tétel";
    showConfirm(`Biztosan törlöd az étlapról: "${name}"?`, "Törlés", () => {
        menuRef.child(itemId).remove();
    });
}

// Kezdeti renderelés (oldal betöltésekor)
menuItems = loadMenuCache();  // Étlap a gyorsítótárból (Firebase később felülírja)
renderPagerButtons();  // 16 pager gomb megjelenítése
renderMenu();          // Menügombok AZONNAL – nem várunk a Firebase-re
renderCart();          // Üres kosár megjelenítése
updateThemeButtons();  // Téma-gombok kiemelése a mentett téma szerint
if (document.documentElement.dataset.theme === "light") {
    // Világos módban induláskor a böngésző-sáv színét is igazítjuk
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = "#f2f2f6";
}
hydrateIcons();         // Statikus fejléc/gomb ikonok kirajzolása
