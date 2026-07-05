# Foodtruck App – javítandó hibák

Manuális teszt alapján (2026-07-04, https://nacsex51.github.io/foodtruck-app/). A lenti hibákat kell javítani, mást ne módosíts.

## 1. Natív `confirm()` lecserélése saját megerősítő modalra

**Hol:** Étlapszerkesztő (fogaskerék modal) – tétel törlése × gombbal. Valószínűleg a "Rendelés törlése" és a "Statisztika nullázása" gombok is natív `confirm()`-ot használnak – ezeket is cseréld le.

**Probléma:** A natív `confirm()` blokkolja a renderelést, automatizálás/kioszk/PWA módban lefagyást okozhat, és nem illik az app dark UI-jához.

**Megoldás:** Egyedi, az app stílusához illő megerősítő modal (Mégse / Törlés gombokkal), a meglévő modalok (statisztika, étlap) mintájára.

## 2. Üres "Kaják" lista első betöltéskor

**Hol:** Pénztár oldal (index), KAJÁK szekció.

**Probléma:** Legelső betöltéskor az étlap üres volt, csak egy pager sorszámra kattintás után jelentek meg az ételgombok. Újratöltés után már azonnal látszottak. Valószínűleg a menü inicializálása / localStorage-ből olvasás és a renderelés sorrendje hibás, vagy a render csak pager-választás eseményre fut le először.

**Megoldás:** Az étlap rendereljen azonnal, page load-kor, pager-választástól függetlenül.

## 3. Teszt-szemét az étlapban (adattisztítás)

Az étlapban maradt két teszttétel, ezeket az étlapszerkesztőből kézzel kell törölni (nem kódhiba):

- "Teszt Kóla" – 500 din (teszt közben került be)
- "Szar" – 1 din

Opcionális kódjavítás ehhez kapcsolódóan: input validáció az étlapszerkesztőben (üres név, 0 vagy negatív ár elutasítása, duplikált név figyelmeztetés).

## Megjegyzések a fejlesztéshez

- Minden más funkció rendben működött: pager foglalás/letiltás, kosár (mennyiség, megjegyzés), árszámítás, rendelés küldése, konyha nézet (KÉSZ / Visszaállítás újra), pénztár–konyha státusz-szinkron, napi statisztika modal, étlaptétel hozzáadása.
- Konzolhiba nem volt.
- Az adatok localStorage-ben perzisztálnak – a javításoknál ezt ne törd el.
