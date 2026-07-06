// ============================================================
// KONYHA OLDAL – ALKALMAZÁS LOGIKA (a kitchen.html tölti be)
// ============================================================
// TARTALOMJEGYZÉK – a címre keresve (Ctrl+F) ugorhatsz a
// megfelelő szekcióra:
//     1. ÁLLAPOT VÁLTOZÓK
//     2. HANGJELZÉS
//     3. RENDELÉS IDŐ FORMÁZÁSA
//     4. KONYHAI TÉTELEK KISZŰRÉSE
//     5. RENDELÉSEK MEGJELENÍTÉSE
//     6. ÁLLAPOT VÁLTOZTATÁSA (Új ↔ Kész)
//     7. ÉRTESÍTŐ SÁV MEGJELENÍTÉSE
//     8. VALÓS IDEJŰ SZINKRON
// ============================================================

// ============================================================
// ÁLLAPOT VÁLTOZÓK
// ============================================================

let orders = {};             // Beérkező rendelések Firebase-ből
let soundEnabled = false;    // Hangjelzés be/ki
let knownOrderIds = new Set(); // Már ismert rendelés ID-k (hanghoz kell)
let audioCtx = null;         // Web Audio API kontextus


// ============================================================
// HANGJELZÉS
//
// A Web Audio API segítségével programozottan generálunk hangot,
// nem kell hangfájl. Az OscillatorNode egy hullámot generál,
// a GainNode a hangerőt szabályozza.
// ============================================================
function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById("soundToggle");

  if (soundEnabled) {
    // AudioContext létrehozása (csak kattintás után engedélyezett a böngészők által)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    btn.innerHTML = '<span data-icon="speakerWave" data-icon-size="16"></span> Hangjelzés be';
    btn.classList.add("active");
    hydrateIcons(btn);

    // Egy teszt hang lejátszása, hogy a felhasználó tudja hogy működik
    playBeep();
  } else {
    btn.innerHTML = '<span data-icon="speakerOff" data-icon-size="16"></span> Hangjelzés ki';
    btn.classList.remove("active");
    hydrateIcons(btn);
  }
}

function playBeep() {
  if (!soundEnabled || !audioCtx) return;

  // OscillatorNode: hanghullám generátor
  const oscillator = audioCtx.createOscillator();
  // GainNode: hangerő (0 = néma, 1 = teljes)
  const gainNode = audioCtx.createGain();

  // Kapcsoljuk össze: oscillator → gain → hangszóró
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Hang beállításai
  oscillator.type = "sine";          // Szinusz hullám (lágy hang)
  oscillator.frequency.value = 880;  // 880 Hz = A5 hang (kellemes csipogó)
  gainNode.gain.value = 0.4;         // 40%-os hangerő

  // Hang lejátszása: most-tól most+0.2 másodpercig
  const now = audioCtx.currentTime;
  oscillator.start(now);
  oscillator.stop(now + 0.2);  // 200 milliszekundum

  // Kicsi szünet, majd egy második csipogás
  setTimeout(() => {
    if (!soundEnabled || !audioCtx) return;
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = "sine";
    osc2.frequency.value = 1100;  // Magasabb hang a második csipogáshoz
    gain2.gain.value = 0.4;
    const t = audioCtx.currentTime;
    osc2.start(t);
    osc2.stop(t + 0.2);
  }, 300);  // 300ms szünet a két csipogás között
}


// ============================================================
// RENDELÉS IDŐ FORMÁZÁSA
// timestamp: milliszekundum (pl. 1718000000000)
// Visszaad: "14:32" formátumú szöveget
// ============================================================
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, "0");    // pl. "09"
  const m = String(date.getMinutes()).padStart(2, "0");  // pl. "05"
  return `${h}:${m}`;
}


// ============================================================
// KONYHAI TÉTELEK KISZŰRÉSE
// Egy rendelésből csak az ételeket adja vissza – az italokat a
// pénztáros adja ki, a szakácsnak nem kell látnia őket.
// (A régebbi, kategória nélküli tételek ételnek számítanak.)
// ============================================================
function kitchenItems(order) {
  return (order.items || []).filter(item => item.category !== "drink");
}


// ============================================================
// RENDELÉSEK MEGJELENÍTÉSE
// ============================================================
function renderOrders() {
  const container = document.getElementById("ordersGrid");

  // Csak azok a rendelések tartoznak a konyhára, amikben van étel.
  // A csak italt tartalmazó rendelés meg sem jelenik itt – azt a
  // pénztáros jelöli késznek a saját pipa gombjával.
  const orderKeys = Object.keys(orders)
    .filter(id => kitchenItems(orders[id]).length > 0);

  // Új rendelések száma (status === "new")
  const newOrders = orderKeys.filter(id => orders[id].status === "new");
  document.getElementById("newCount").textContent = newOrders.length + " új";

  if (orderKeys.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon" data-icon="plate" data-icon-size="40"></div>
        <p>Még nincs rendelés.</p>
      </div>
    `;
    hydrateIcons();
    return;
  }

  // Rendezés: ÚJ rendelések elöl, azon belül legrégebbi először
  // (hogy a szakács sorban tudja őket elkészíteni)
  orderKeys.sort((a, b) => {
    const aNew = orders[a].status === "new";
    const bNew = orders[b].status === "new";
    if (aNew && !bNew) return -1;   // a előre
    if (!aNew && bNew) return 1;    // b előre
    return orders[a].timestamp - orders[b].timestamp;  // régebbi előre
  });

  container.innerHTML = orderKeys.map(id => {
    const order = orders[id];
    const isDone = order.status === "done";

    return `
      <div class="order-card ${isDone ? 'done' : 'new-order'}">
        <div class="card-header">
          <div class="queue-number">#${order.queue}</div>
          <div class="order-time">
            ${formatTime(order.timestamp)}
            <div class="order-time-status" style="color:${isDone ? 'var(--success)' : 'var(--urgent)'};">
              ${isDone ? icon('checkCircle', 14) + ' KÉSZ' : '<span class="status-dot"></span> ÚJ'}
            </div>
          </div>
        </div>

        <hr class="divider" />

        <!-- Étel sorok (az italok kiszűrve – azok nem a konyhára tartoznak) -->
        ${kitchenItems(order).map(item => `
          <div class="item-row">
            <div class="item-main">
              <span class="item-qty">${item.qty}×</span>
              <span class="item-name">${item.name}</span>
            </div>
            ${item.note
              ? `<div class="item-note">${icon('pencil', 16)} ${item.note}</div>`
              : ''
            }
          </div>
        `).join("")}

        <!-- Kész / Visszaállít gomb -->
        ${isDone
          ? `<button class="undo-btn" onclick="setStatus('${id}', 'new')">
               <span data-icon="undo" data-icon-size="16"></span> Visszaállítás újra
             </button>`
          : `<button class="done-btn" onclick="setStatus('${id}', 'done')">
               <span data-icon="checkCircle" data-icon-size="18"></span> KÉSZ
             </button>`
        }
      </div>
    `;
  }).join("");

  hydrateIcons();
}


// ============================================================
// ÁLLAPOT VÁLTOZTATÁSA (Új ↔ Kész)
// orderId: a rendelés Firebase azonosítója
// newStatus: "new" vagy "done"
//
// A napi statisztikába CSAK a késznek jelölt rendelés kerül be –
// ekkor a rendelés MINDEN tétele (az italok is) könyvelődik, a
// közös applyStatsForOrder() függvénnyel (firebase-config.js).
// "Visszaállítás újra" esetén ugyanennyit le is vonunk.
//
// A státuszt transaction()-nel állítjuk át: ha a pénztáros (pipa
// gomb) és a szakács (KÉSZ gomb) majdnem egyszerre nyomna, a
// statisztikába akkor is csak egyszer könyvelődik a rendelés.
// ============================================================
function setStatus(orderId, newStatus) {
  const order = orders[orderId];
  if (!order || order.status === newStatus) return;

  ordersRef.child(orderId).child("status").transaction(current => {
    if (current === newStatus) return;  // már átállította valaki → megszakítás
    return newStatus;
  }, (err, committed) => {
    if (err || !committed) return;
    applyStatsForOrder(order, newStatus === "done" ? +1 : -1);
  });
}


// ============================================================
// ÉRTESÍTŐ SÁV MEGJELENÍTÉSE
// ============================================================
function showNotification() {
  const bar = document.getElementById("notifBar");
  bar.style.display = "flex";

  // 3 másodperc után automatikusan eltűnik
  setTimeout(() => {
    bar.style.display = "none";
  }, 3000);
}


// ============================================================
// VALÓS IDEJŰ SZINKRON
//
// Ugyanúgy mint a pénztáros oldalon, folyamatosan figyeli
// az adatbázist. Ha változás van, automatikusan frissül a nézet.
//
// ITT TÖRTÉNIK A HANGJELZÉS LOGIKÁJA:
// - Az első betöltésnél eltároljuk az összes rendelés ID-ját
// - Minden következő frissítésnél megnézzük, van-e ÚJ ID
// - Ha igen → hangjelzés + értesítő sáv
// ============================================================
let isFirstLoad = true;  // Az első betöltésnél ne szóljon

// A listenert csak a névtelen bejelentkezés sikeres létrejötte után
// kapcsoljuk be – a security rules hitelesítést követelnek meg, enélkül
// a lekérdezés "permission denied" hibával elutasítódna.
// A syncStarted őr garantálja, hogy a listener csak EGYSZER épüljön ki
// akkor is, ha a bejelentkezés később (pl. a kapcsolat-őr pótló
// bejelentkezése után) újra lefutna – különben duplán frissülne minden.
let syncStarted = false;

firebase.auth().onAuthStateChanged((user) => {
  if (!user || syncStarted) return;
  syncStarted = true;

  ordersRef.on("value", (snapshot) => {
    const newData = snapshot.val() || {};

    if (isFirstLoad) {
      // Első betöltés: csak eltároljuk az ID-kat, nem szólunk
      Object.keys(newData).forEach(id => knownOrderIds.add(id));
      isFirstLoad = false;
    } else {
      // Következő frissítések: keresünk új rendeléseket.
      // Csak akkor jelzünk, ha az új rendelésben étel is van – a
      // csak italt tartalmazó rendelés nem a konyhára tartozik.
      const incomingIds = Object.keys(newData);
      const hasNewOrder = incomingIds.some(id =>
        !knownOrderIds.has(id) && kitchenItems(newData[id]).length > 0);

      if (hasNewOrder) {
        // Van új rendelés!
        incomingIds.forEach(id => knownOrderIds.add(id));
        playBeep();           // Hangjelzés
        showNotification();   // Értesítő sáv
      }
    }

    orders = newData;
    renderOrders();
  });
});

hydrateIcons();  // Statikus fejléc/gomb ikonok kirajzolása
