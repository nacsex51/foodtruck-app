// ============================================================
// KAPCSOLAT-ŐR + FELUGRÓ ÉRTESÍTÉSEK (közös: Pénztár + Konyha)
// A firebase-config.js UTÁN kell betölteni (használja a db-t).
//
// Három védelmi réteg, hogy soha ne maradjon észrevétlenül
// megszakadt adatbázis-kapcsolat:
//   1. KÉZI újracsatlakoztatás – gomb a Beállításokban (pénztár)
//      és a piros figyelmeztető sávban (mindkét oldalon)
//   2. FIGYELMEZTETŐ SÁV – ha 5 másodpercnél tovább nincs
//      kapcsolat, piros sáv jelenik meg a képernyő tetején
//   3. AUTOMATA újracsatlakozás – 15 másodpercenként, továbbá
//      a tablet felébredésekor és a hálózat visszatértekor
// ============================================================

// Ikon-segéd: ha az icons.js valamiért nem töltődött be (pl. a
// letöltése megszakadt), a kapcsolat-őr ikon nélkül, de működjön
// tovább – egy hiányzó ikon miatt nem állhat le a védelem.
function connIcon(name, size) {
    return (typeof icon === "function") ? icon(name, size) : "";
}

// ============================================================
// HTML-VÉDŐ SEGÉDFÜGGVÉNY (XSS-védelem, közös: Pénztár + Konyha)
// Minden adatbázisból vagy beviteli mezőből származó szöveget
// ezen KELL átfuttatni, mielőtt innerHTML-be kerül. A speciális
// HTML-karaktereket ártalmatlan formára cseréli, így a beírt
// szöveg mindig szövegként jelenik meg, sosem fut le kódként.
// ============================================================
const ESCAPE_HTML_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
};

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/[&<>"']/g, ch => ESCAPE_HTML_MAP[ch]);
}

// ============================================================
// FELUGRÓ ÉRTESÍTÉS (toast) – a natív alert() kiváltása.
// A natív alert() blokkolja a renderelést (kioszk/PWA módban
// lefagyást okozhat), a toast viszont magától eltűnik.
// type: "info" | "success" | "error"
// ============================================================
function showToast(message, type, duration) {
    type = type || "info";

    // A tároló doboz csak az első értesítéskor jön létre
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    const iconName = type === "success" ? "checkCircle"
                   : type === "error"   ? "close"
                   : "bell";
    toast.innerHTML = `<span class="toast-icon">${connIcon(iconName, 18)}</span><span></span>`;
    // textContent → az üzenet biztonságosan, HTML-ként nem értelmezve kerül be
    toast.lastElementChild.textContent = message;
    container.appendChild(toast);

    // Egyszerre legfeljebb 3 értesítés – a legrégebbi kiesik
    while (container.children.length > 3) {
        container.firstElementChild.remove();
    }

    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 400);  // az elhalványulás után törlés
    }, duration || 3500);
}


// ============================================================
// KAPCSOLAT ÁLLAPOTA
// A Firebase ".info/connected" ága mindig azt mutatja, hogy ez
// az eszköz éppen kapcsolódik-e az adatbázis-szerverhez.
// ============================================================
let dbConnected = false;        // Éppen van-e élő kapcsolat
let connLostToastDue = false;   // Kell-e "helyreállt" értesítés a visszatéréskor
let bannerGraceTimer = null;    // Türelmi idő a sáv megjelenítése előtt
let autoRetryTimer = null;      // Automata újrapróbálkozás időzítője
let reconnectInFlight = false;  // Fut-e éppen kézi újracsatlakozás

const BANNER_GRACE_MS = 5000;    // Ennyi kimaradás után jelenik meg a piros sáv
const AUTO_RETRY_MS = 15000;     // Automata újrapróbálkozás gyakorisága
const MANUAL_TIMEOUT_MS = 12000; // Kézi újracsatlakozás időkorlátja

db.ref(".info/connected").on("value", (snapshot) => {
    dbConnected = snapshot.val() === true;

    if (dbConnected) {
        // ÉL A KAPCSOLAT → sáv el, időzítők le
        clearTimeout(bannerGraceTimer);
        bannerGraceTimer = null;
        stopAutoRetry();
        hideConnBanner();
        updateConnStatusUI(true);

        // Ha korábban tényleg kiesett (sáv látszott vagy kézzel
        // indították újra), jelezzük, hogy minden rendben
        if (connLostToastDue) {
            connLostToastDue = false;
            showToast("Az adatbázis-kapcsolat helyreállt. Minden adat újra szinkronban van.", "success");
        }
    } else {
        // NINCS KAPCSOLAT → rövid türelmi idő (a pár másodperces
        // hálózati "pislogásokra" ne ugorjon fel a piros sáv)
        updateConnStatusUI(false);
        if (!bannerGraceTimer) {
            bannerGraceTimer = setTimeout(() => {
                bannerGraceTimer = null;
                if (!dbConnected) {
                    connLostToastDue = true;
                    showConnBanner();
                    startAutoRetry();
                }
            }, BANNER_GRACE_MS);
        }
    }
});


// ============================================================
// AUTOMATA ÚJRACSATLAKOZÁS
// A Firebase magától is próbálkozik, de a goOnline() + az újra-
// bejelentkezés akkor is helyrerántja a kapcsolatot, ha a socket
// vagy a hitelesítés "beragadt" (pl. hosszú alvás után).
// ============================================================
function tryReconnect() {
    db.goOnline();
    // A bejelentkezést NEM itt pótoljuk: a belépést az auth.js
    // kezeli (e-mail/jelszavas bejelentkező képernyő). A Firebase a
    // mentett bejelentkezést magától helyreállítja újracsatlakozáskor;
    // ha tényleg nincs bejelentkezett felhasználó, az auth.js
    // automatikusan a bejelentkező képernyőt mutatja.
}

function startAutoRetry() {
    if (autoRetryTimer) return;
    autoRetryTimer = setInterval(() => {
        if (dbConnected) { stopAutoRetry(); return; }
        tryReconnect();
    }, AUTO_RETRY_MS);
}

function stopAutoRetry() {
    clearInterval(autoRetryTimer);
    autoRetryTimer = null;
}

// A tablet felébredésekor / a lap előtérbe kerülésekor azonnal
// próbálkozunk (a képernyő-elalvás a leggyakoribb kapcsolat-gyilkos)
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !dbConnected) tryReconnect();
});

// Ha a rendszer jelzi, hogy visszajött a hálózat, nem várunk
window.addEventListener("online", () => {
    if (!dbConnected) tryReconnect();
});


// ============================================================
// KÉZI ÚJRACSATLAKOZTATÁS
// A Beállítások gombja és a piros sáv gombja is ezt hívja.
// Teljes újraépítés: bontás → újranyitás → hitelesítés-pótlás,
// majd az eredményről felugró értesítés.
// ============================================================
function forceReconnect() {
    if (reconnectInFlight) return;  // dupla kattintás ellen
    reconnectInFlight = true;
    connLostToastDue = true;        // sikernél jár a "helyreállt" üzenet
    setReconnectBtnsBusy(true);

    // Bontjuk a kapcsolatot, majd rövid szünet után újraépítjük.
    // A Firebase a meglévő listenereket (rendelések, étlap,
    // statisztika) újracsatlakozás után magától újraszinkronizálja.
    db.goOffline();
    setTimeout(() => tryReconnect(), 400);

    // Figyeljük az eredményt (max. 12 másodpercig)
    const startedAt = Date.now();
    const poll = setInterval(() => {
        if (dbConnected) {
            clearInterval(poll);
            reconnectInFlight = false;
            setReconnectBtnsBusy(false);
            // A "helyreállt" értesítést a .info/connected figyelője
            // küldi (connLostToastDue), itt nem kell még egy
        } else if (Date.now() - startedAt > MANUAL_TIMEOUT_MS) {
            clearInterval(poll);
            reconnectInFlight = false;
            setReconnectBtnsBusy(false);
            showToast("Nem sikerült csatlakozni az adatbázishoz. Ellenőrizd az internetkapcsolatot (Wi-Fi), majd próbáld újra!", "error", 6000);
        }
    }, 250);
}

// Az összes újracsatlakoztató gomb (Beállítások + piros sáv)
// letiltása/visszaállítása a folyamat idejére
function setReconnectBtnsBusy(busy) {
    document.querySelectorAll("[data-reconnect-btn]").forEach(btn => {
        btn.disabled = busy;
        btn.innerHTML = busy
            ? `${connIcon("undo", 15)} Csatlakozás…`
            : `${connIcon("undo", 15)} Újracsatlakoztatás`;
    });
}


// ============================================================
// PIROS FIGYELMEZTETŐ SÁV (a képernyő tetején)
// Csak akkor jön létre és jelenik meg, ha tényleg baj van.
// ============================================================
function showConnBanner() {
    let banner = document.getElementById("connBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "connBanner";
        banner.className = "conn-banner";
        banner.innerHTML = `
            <span class="conn-banner-text">${connIcon("wifiOff", 18)} Nincs kapcsolat az adatbázissal – a rendelések most NEM frissülnek!</span>
            <button class="conn-banner-btn" data-reconnect-btn onclick="forceReconnect()">${connIcon("undo", 15)} Újracsatlakoztatás</button>
        `;
        document.body.appendChild(banner);
    }
    // A transition csak akkor animál, ha a böngésző a kezdő állapotot
    // már kiszámolta – ezt egy kikényszerített reflow garantálja.
    // (Szándékosan NEM requestAnimationFrame: az háttérben lévő lapon
    // – pl. alvó tableten – nem fut le, és a sáv sosem jelenne meg.)
    void banner.offsetWidth;
    banner.classList.add("visible");
}

function hideConnBanner() {
    const banner = document.getElementById("connBanner");
    if (banner) banner.classList.remove("visible");
}


// ============================================================
// ÁLLAPOTJELZŐ A BEÁLLÍTÁSOKBAN (csak a pénztár oldalon van meg)
// Zöld pötty = kapcsolódva, piros = nincs kapcsolat.
// ============================================================
function updateConnStatusUI(connected) {
    const el = document.getElementById("connStatus");
    if (!el) return;  // a konyha oldalon nincs ilyen elem
    el.innerHTML = connected
        ? '<span class="conn-dot online"></span> Kapcsolódva'
        : '<span class="conn-dot offline"></span> Nincs kapcsolat';
}
