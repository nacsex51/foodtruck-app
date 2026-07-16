// ============================================================
// BEJELENTKEZŐ KÉPERNYŐ (közös: Pénztár + Konyha)
// A firebase-config.js és a connection.js UTÁN kell betölteni.
//
// Amíg nincs bejelentkezett felhasználó, egy teljes képernyős
// bejelentkező felület takarja az appot – e-mail címmel és
// jelszóval lehet belépni (a fiókokat a Firebase-konzolban kell
// létrehozni, lásd INDULAS_TEENDOK.md).
//
// A Firebase a sikeres belépést az eszközön megjegyzi, így a
// tableten csak EGYSZER kell bejelentkezni – újraindítás és
// frissítés után is bejelentkezve marad, amíg ki nem jelentkezel.
// ============================================================

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
            <p class="login-sub">A pénztár és a konyha felülete csak a dolgozók számára érhető el. Add meg a kapott e-mail címet és jelszót!</p>
            <label for="loginEmail">E-mail cím</label>
            <input type="email" id="loginEmail" autocomplete="username" inputmode="email" required />
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
        return "Erről a címről nincs engedélyezve a bejelentkezés. "
             + "Vedd fel az oldal címét az API-kulcs engedélyezett "
             + "címei közé (lásd INDULAS_TEENDOK.md, 5. lépés).";
    }

    switch (code) {
        case "auth/invalid-email":
            return "Az e-mail cím formátuma hibás. Ellenőrizd, majd próbáld újra!";
        case "auth/user-disabled":
            return "Ez a fiók le van tiltva. A Firebase-konzolban lehet újra engedélyezni.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
            return "Hibás e-mail cím vagy jelszó.";
        case "auth/too-many-requests":
            return "Túl sok sikertelen próbálkozás. Várj néhány percet, majd próbáld újra!";
        case "auth/network-request-failed":
            return "Nincs internetkapcsolat. Ellenőrizd a Wi-Fi-t, majd próbáld újra!";
        case "auth/operation-not-allowed":
            return "Az e-mail/jelszavas bejelentkezés még nincs engedélyezve a Firebase-konzolban (lásd INDULAS_TEENDOK.md, 1. lépés).";
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

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const submitBtn = document.getElementById("loginSubmitBtn");

    if (!email || !password) {
        showLoginError("Add meg az e-mail címet és a jelszót is!");
        return;
    }

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
    // oldalon van ilyen elem; a konyhán ez a sor nem csinál semmit)
    const emailEl = document.getElementById("accountEmail");
    if (emailEl) {
        emailEl.textContent = user ? user.email : "–";
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
