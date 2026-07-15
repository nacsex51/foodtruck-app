# Indulás előtti teendők – lépésről lépésre

Ez az útmutató azokat a lépéseket írja le, amiket **neked kell elvégezned
a Firebase-konzolban és a fiókjaidban** – ezeket kódból nem lehet megcsinálni.
A sorrend fontos: haladj fentről lefelé!

> **Miért kell ez?** Az app mostantól bejelentkezéshez kötött (e-mail +
> jelszó). Amíg az 1. és 2. lépést el nem végzed, az új verzióba nem lehet
> belépni – ezért ezeket MÉG AZELŐTT csináld meg, hogy ezt a branchet
> élesítenéd (a main-be olvasztanád)!

---

## 1. lépés – E-mail/jelszavas bejelentkezés engedélyezése + fiókok létrehozása

1. Nyisd meg a [Firebase-konzolt](https://console.firebase.google.com/) és
   válaszd a **FoodtrusckSU2** projektet.
2. Bal oldali menü: **Build → Authentication**.
3. Felül a **Sign-in method** fül → **Add new provider** →
   **Email/Password** → kapcsold **Enable** állásba → **Save**.
   (A második kapcsolót, az "Email link"-et NE kapcsold be.)
4. Felül a **Users** fül → **Add user** gomb:
   - **E-mail:** egy általad használt cím (lehet pl. a Gmail-címed,
     vagy készíthetsz kettőt: egyet a pénztárnak, egyet a konyhának –
     így a naplókból később az is látszik, melyik tablet csinált mit).
   - **Jelszó:** válassz **erős, egyedi jelszót** (legalább 12 karakter,
     ne a máshol használt jelszavad legyen). Írd fel biztonságos helyre!
5. Kész! Ezzel az e-mail + jelszó párossal lehet majd belépni mindkét
   tableten. A tablet megjegyzi a belépést, tehát ezt csak egyszer kell
   beírni eszközönként.

> **Tipp:** ha valaha jelszót akarsz cserélni, ugyanitt a Users fülön a
> fiók melletti ⋮ menü → "Reset password".

## 2. lépés – Az új adatbázis-szabályok publikálása

Az új szabályok már csak az e-mail/jelszóval belépett felhasználónak
engednek hozzáférést (a régi névtelen belépés kizárva).

1. Firebase-konzol → **Build → Realtime Database** → felül a **Rules** fül.
2. A gépeden nyisd meg a projekt mappájából a `database.rules.json` fájlt
   (pl. Jegyzettömbbel), jelöld ki a TELJES tartalmát és másold ki.
3. A konzolban töröld ki a szerkesztőben lévő régi szabályt, illeszd be
   az újat, majd kattints a **Publish** gombra.

> **Fontos sorrend:** a szabályok publikálása után a RÉGI (névtelen belépéses)
> app már nem tud az adatbázishoz nyúlni. Ezért ezt a lépést és az új verzió
> élesítését EGYSZERRE (egymás után pár percen belül) érdemes megcsinálni,
> lehetőleg zárás után, ne munkaidőben.

## 3. lépés – Firebase App Check bekapcsolása (ajánlott)

Ez megakadályozza, hogy bárki a nyilvános API-kulccsal, böngészőn kívülről
írjon az adatbázisba.

1. Firebase-konzol → **Build → App Check** (vagy Release & Monitor alatt).
2. Az **Apps** fülön kattints a webalkalmazásodra → **Register** →
   válaszd a **reCAPTCHA v3** szolgáltatót.
3. A regisztrációhoz a Google ad egy **site key**-t (kulcsot) – másold ki.
4. A gépeden nyisd meg a `firebase-config.js` fájlt, és a
   `const APP_CHECK_SITE_KEY = "";` sorban a két idézőjel közé illeszd be
   a kulcsot, például: `const APP_CHECK_SITE_KEY = "6LdXXXXXXXX";`
   Mentsd el, majd töltsd fel a változást (commit + push, vagy szólj
   Claude-nak, hogy tegye fel).
5. A konzolban az App Check oldalon a Realtime Database-nél először
   **Monitor** (megfigyelő) módot kapcsolj be. 1-2 nap múlva, ha a
   grafikonon minden kérés "verified" (ellenőrzött), kapcsold át
   **Enforce** (kikényszerítés) módra.

> **Vigyázat:** az Enforce módot CSAK azután kapcsold be, hogy a 4. pontban
> a kulcs bekerült a kódba és az új verzió élesedett – különben az app
> nem éri el az adatbázist!

## 4. lépés – Kétlépcsős azonosítás (2FA) minden fiókon

Kapcsold be a kétlépcsős azonosítást ezeken a fiókokon (mindenhol a
fiókbeállítások / Security résznél találod):

- [ ] **Google-fiók** (ezzel lépsz be a Firebase-konzolba) –
      https://myaccount.google.com/security
- [ ] **GitHub** – Settings → Password and authentication →
      Two-factor authentication
- [ ] **Netlify** (ha marad) – User settings → Security
- [ ] **Domain-regisztrátor** (ahol a saját domained van, ha van)

Ajánlott mód: hitelesítő alkalmazás (pl. Google Authenticator) – az
SMS-nél biztonságosabb.

## 5. lépés – API-kulcs korlátozása a saját domainre (ajánlott)

1. Nyisd meg a [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
   oldalt, és felül válaszd ki a **FoodtrusckSU2** projektet.
2. Az API keys listában kattints a **Browser key (auto created by Firebase)**
   nevű kulcsra.
3. Az **Application restrictions** résznél válaszd a **Websites** opciót,
   és add hozzá a ténylegesen használt címeket, pl.:
   - `https://NEVED.github.io/*` (GitHub Pages)
   - `https://warm-cranachan-6724da.netlify.app/*` (Netlify)
   - a saját domained, ha lesz: `https://sajatdomain.rs/*`
4. **Save**. (Ez nem teszi titkossá a kulcsot, de más weboldalak nem
   tudják használni.)

## 6. lépés – Költségriasztás beállítása (ajánlott)

1. Firebase-konzol → bal alul **Spark/Blaze plan** felirat melletti
   fogaskerék → **Usage and billing** → **Details & settings**.
2. Ha Blaze (fizetős) csomagon vagy: állíts be **budget alert**-et
   (pl. havi 5 USD-nél e-mail értesítés). Spark (ingyenes) csomagon
   nincs mit beállítani – ott a keret túllépésekor az adatbázis
   egyszerűen megáll, számla nem keletkezhet.

## 7. lépés – Az impresum és az adatkezelési tájékoztató kitöltése

Az `impresum.html` és az `adatvedelem.html` fájlban sárgával jelölt
`[KITÖLTENDŐ: ...]` részekbe írd be a vállalkozásod valós adatait
(név, forma, székhely, PIB, matični broj, e-mail, használt tárhely).
Ezek az APR-kivonatodon és az adóhatósági iratokon szerepelnek.
Ha bizonytalan vagy, kérd meg a könyvelődet, hogy nézze át.

---

## Ellenőrzőlista élesítés előtt

- [ ] 1. lépés: Email/Password bekapcsolva + fiók(ok) létrehozva
- [ ] 7. lépés: impresum + adatvédelmi adatok kitöltve
- [ ] A branch beolvasztva (merge) a main-be → az oldal frissült
- [ ] 2. lépés: új szabályok publikálva (közvetlenül a merge után!)
- [ ] Mindkét tableten belépve az új felületen, próbarendelés lement
- [ ] 3–6. lépés: App Check, 2FA, API-korlátozás, budget alert
