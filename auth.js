// ============================================================
// BEJELENTKEZŐ KÉPERNYŐ (közös: Pénztár + Konyha)
// A firebase-config.js és a connection.js UTÁN kell betölteni.
//
// Amíg nincs bejelentkezett felhasználó, egy teljes képernyős
// bejelentkező felület takarja az appot – FELHASZNÁLÓNÉVVEL és
// jelszóval lehet belépni (a fiókokat a Firebase-konzolban kell
// létrehozni, lásd INDULAS_TEENDOK.md).
//
// A Firebase a sikeres belépést az eszközön megjegyzi, így a
// tableten csak EGYSZER kell bejelentkezni – újraindítás és
// frissítés után is bejelentkezve marad, amíg ki nem jelentkezel.
// ============================================================

// ============================================================
// FELHASZNÁLÓNÉV → E-MAIL CÍM
// ============================================================
// A Firebase bejelentkezéshez mindig e-mail cím kell, a dolgozók
// viszont csak egy egyszerű felhasználónevet írnak be (pl. "penztar").
// A hiányzó részt itt tesszük hozzá automatikusan, a háttérben:
//     "penztar"  →  "penztar@foodtruck.local"
//
// Ez a végződés SEHOL nem jelenik meg a képernyőn, és nem is kell
// működő postafióknak lennie – csak a Firebase belső azonosítója.
// A fiókokat a Firebase-konzolban ILYEN formában kell létrehozni
// (lásd INDULAS_TEENDOK.md, 1. lépés).
//
// FIGYELEM: ha ezt a végződést megváltoztatod, a MÁR LÉTREHOZOTT
// fiókokkal nem lehet többé belépni – akkor a konzolban is át kell
// nevezni őket.
const LOGIN_EMAIL_DOMAIN = "foodtruck.local";

// Csak ezek a karakterek engedettek a felhasználónévben: az ékezetes
// betűk és a szóköz érvénytelen e-mail címet adnának, ezért inkább
// előre, érthető üzenettel szólunk (a Firebase hibakódja helyett).
const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

function usernameToEmail(username) {
    const clean = username.trim().toLowerCase();
    // Ha valaki mégis a teljes címet írja be (pl. régi beidegződésből),
    // azt is elfogadjuk – nem kényszerítjük rá a végződést mégegyszer.
    return clean.indexOf("@") !== -1 ? clean : clean + "@" + LOGIN_EMAIL_DOMAIN;
}

// A megjelenítéshez a végződést levágjuk: a Beállításokban a dolgozó
// a saját felhasználónevét lássa, ne a technikai e-mail címet.
function emailToUsername(email) {
    if (!email) return "–";
    return email.replace("@" + LOGIN_EMAIL_DOMAIN, "");
}

// A bejelentkező felület felépítése (egyszer, az oldal betöltésekor).
// A felület csak statikus, előre megírt szöveget tartalmaz – felhasználói
// vagy adatbázis-adat nem kerül bele, ezért az innerHTML itt biztonságos.
(function buildLoginOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "loginOverlay";
    // Induláskor azonnal LÁTSZIK, és csak akkor tűnik el, ha a
    // Firebase megerősítette a bejelentkezést – így kijelentkezett
    // állapotban egy pillanatra sem villan fel az app tartalma.
    overlay.className = "login-overlay visible";
    overlay.innerHTML = `
        <form class="login-card" id="loginForm">
            <h2>${connIcon("lock", 22)} Bejelentkezés</h2>
            <p class="login-sub">A pénztár és a konyha felülete csak a dolgozók számára érhető el. Add meg a kapott felhasználónevet és jelszót!</p>
            <label for="loginUsername">Felhasználónév</label>
            <input type="text" id="loginUsername" autocomplete="username" autocapitalize="none" spellcheck="false" required />
            <label for="loginPassword">Jelszó</label>
            <input type="password" id="loginPassword" autocomplete="current-password" required />
            <div class="login-error" id="loginError"></div>
            <button type="submit" class="login-btn" id="loginSubmitBtn">Bejelentkezés</button>
            <p class="login-links">
                <a href="impresum.html">Impresum</a> · <a href="adatvedelem.html">Adatkezelési tájékoztató</a>
            </p>
        </form>
    `;
    document.body.appendChild(overlay);
})();

// ============================================================
// BEJELENTKEZÉS ÉLETTARTAMA – az eszköz SEHOL nem jegyzi meg
// ============================================================
// A Firebase alapból TARTÓSAN megjegyzi a belépést az eszközön, ezért
// az app megnyitáskor jelszó nélkül, magától belépett (ezt tapasztaltad
// iPhone-on). A kérés: MINDIG kérje a felhasználónevet és jelszót, ne
// lehessen jelszó nélkül belépni.
//
// Ezért a legszigorúbb módot használjuk: NONE (in-memory) – a belépés
// SEHOL nem tárolódik (sem lemezen, sem a fül session-tárában). Így:
//   - amíg az app nyitva van, bejelentkezve maradsz és zavartalanul
//     dolgozhatsz (nincs újbóli jelszókérés kattintás közben),
//   - de MINDEN megnyitáskor és oldalfrissítéskor a belépő képernyő
//     jelenik meg, és újra be kell írni a felhasználónevet + jelszót.
//
// FONTOS: ezt a belépés ELKÜLDÉSE ELŐTT kell beállítani, ezért van itt,
// legfelül. (Az az eszköz, amelyen KORÁBBAN már tartósan bejelentkeztél
// – pl. az iPhone –, a friss kód első betöltésekor még beléphet egyszer;
// utána a NONE miatt már mindig jelszót fog kérni.)
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)
    .catch((err) => {
        // Ha a beállítás valamiért nem sikerülne, a belépés ettől még
        // működik – nem állítjuk meg miatta az appot.
        console.warn("A bejelentkezés élettartamát nem sikerült beállítani:", err);
    });

// ============================================================
// HIBAÜZENETEK MAGYARUL
// A Firebase angol hibakódjait fordítjuk érthető üzenetre.
// ============================================================
function loginErrorMessage(code) {
    // Ez a hibakód tartalmazza a lap címét is (pl.
    // "auth/requests-from-referer-http://localhost:5180/-are-blocked"),
    // ezért mintára kell illeszteni, nem pontos egyezésre.
    // Akkor jelentkezik, ha az oldal címe nincs rajta az API-kulcs
    // engedélyezett cím-listáján (Google Cloud Console → Credentials).
    if (typeof code === "string" && code.indexOf("requests-from-referer") !== -1) {
        return "Erről a címről (" + window.location.origin + ") nincs "
             + "engedélyezve a bejelentkezés. Vedd fel az API-kulcs "
             + "engedélyezett címei közé csillaggal a végén, pl. "
             + window.location.origin + "/* (lásd INDULAS_TEENDOK.md, "
             + "5. lépés), majd várj kb. 5 percet és próbáld újra!";
    }

    switch (code) {
        case "auth/invalid-email":
            return "A felhasználónév formátuma hibás. Ellenőrizd, majd próbáld újra!";
        case "auth/user-disabled":
            return "Ez a fiók le van tiltva. A Firebase-konzolban lehet újra engedélyezni.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
            return "Hibás felhasználónév vagy jelszó.";
        case "auth/too-many-requests":
            return "Túl sok sikertelen próbálkozás. Várj néhány percet, majd próbáld újra!";
        case "auth/network-request-failed":
            return "Nincs internetkapcsolat. Ellenőrizd a Wi-Fi-t, majd próbáld újra!";
        case "auth/operation-not-allowed":
            return "A jelszavas bejelentkezés még nincs engedélyezve a Firebase-konzolban (lásd INDULAS_TEENDOK.md, 1. lépés).";
        default:
            return "Sikertelen bejelentkezés. Hibakód: " + code;
    }
}

function showLoginError(message) {
    const box = document.getElementById("loginError");
    box.textContent = message;   // textContent → biztonságos beillesztés
    box.classList.add("visible");
}

function clearLoginError() {
    const box = document.getElementById("loginError");
    box.textContent = "";
    box.classList.remove("visible");
}

// ============================================================
// BEJELENTKEZÉS ELKÜLDÉSE
// ============================================================
document.getElementById("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();  // ne töltse újra az oldalt

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = document.getElementById("loginSubmitBtn");

    if (!username || !password) {
        showLoginError("Add meg a felhasználónevet és a jelszót is!");
        return;
    }

    // A felhasználónévben csak angol kisbetű, szám, pont, kötőjel és
    // aláhúzás lehet (ékezet/szóköz nem) – erre előre figyelmeztetünk.
    // A teljes e-mail címet beíró felhasználót nem korlátozzuk.
    if (username.indexOf("@") === -1 && !USERNAME_PATTERN.test(username.toLowerCase())) {
        showLoginError("A felhasználónév csak ékezet nélküli betűt, számot, pontot, kötőjelet vagy aláhúzást tartalmazhat.");
        return;
    }

    // A Firebase e-mail címet vár – a felhasználónevet itt egészítjük ki
    const email = usernameToEmail(username);

    clearLoginError();
    submitBtn.disabled = true;
    submitBtn.textContent = "Bejelentkezés…";

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            // Sikeres belépés – az overlay elrejtését az
            // onAuthStateChanged figyelő végzi (lentebb).
            document.getElementById("loginPassword").value = "";
        })
        .catch((err) => {
            showLoginError(loginErrorMessage(err.code));
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "Bejelentkezés";
        });
});

// ============================================================
// BE/KI ÁLLAPOT FIGYELÉSE
// Bejelentkezve → overlay el, app látszik.
// Kijelentkezve → overlay vissza, app takarva.
// ============================================================
firebase.auth().onAuthStateChanged((user) => {
    const overlay = document.getElementById("loginOverlay");
    if (user) {
        overlay.classList.remove("visible");
    } else {
        overlay.classList.add("visible");
    }

    // A Beállításokban lévő fiók-jelző frissítése (csak a pénztár
    // oldalon van ilyen elem; a konyhán ez a sor nem csinál semmit).
    // A technikai végződést levágjuk – a dolgozó a felhasználónevét lássa.
    const emailEl = document.getElementById("accountEmail");
    if (emailEl) {
        emailEl.textContent = user ? emailToUsername(user.email) : "–";
    }
});

// ============================================================
// KIJELENTKEZÉS
// A Beállítások modal (pénztár) és a fejléc gombja (konyha) hívja.
// Kijelentkezés után újratöltjük az oldalt, hogy minden listener
// és memóriában lévő adat tiszta lappal induljon.
// ============================================================
function signOutAndReload() {
    firebase.auth().signOut()
        .then(() => window.location.reload())
        .catch(() => {
            showToast("A kijelentkezés nem sikerült. Próbáld újra!", "error");
        });
}
