// ============================================================
// IKONOK – egységes, letisztult SVG vonal-ikon készlet
// (emoji helyett, hogy az app ne "sablon" hatású, hanem
// prémium, professzionális megjelenésű legyen)
//
// Használat: icon("bell", 18) → visszaad egy kész <svg> stringet,
// amit innerHTML-be lehet tenni. A "currentColor" miatt a szülő
// elem szövegszínét örökli, így CSS-ből színezhető.
// ============================================================

const ICON_PATHS = {
    bell: '<path d="M12 3a5 5 0 0 0-5 5v3.5c0 .9-.36 1.76-1 2.4L5 15h14l-1-1.1a3.4 3.4 0 0 1-1-2.4V8a5 5 0 0 0-5-5Z"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2.5 3h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 7H6"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2 7L21 3Z"/><path d="M12.5 13.5 21 3"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 1.9h6A2 2 0 0 0 17 20l1-13"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>',
    clipboardList: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z"/><path d="M8.5 11h7"/><path d="M8.5 14.5h7"/><path d="M8.5 18h4.5"/>',
    pencil: '<path d="M4 20l.9-3.6L15.5 6.8a1.6 1.6 0 0 1 2.3 0l1.4 1.4a1.6 1.6 0 0 1 0 2.3L8.6 21.1 4 20Z"/><path d="M13.8 8.5l3.7 3.7"/>',
    plate: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
    undo: '<path d="M9 8 4 12l5 4"/><path d="M4 12h11a4.5 4.5 0 0 0 0-9H13"/>',
    speakerWave: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 7a7 7 0 0 1 0 10"/>',
    speakerOff: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9l5 6"/><path d="M21 9l-5 6"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5"/><path d="M12 19v2.5"/><path d="M2.5 12H5"/><path d="M19 12h2.5"/><path d="m5 5 1.8 1.8"/><path d="m17.2 17.2 1.8 1.8"/><path d="m19 5-1.8 1.8"/><path d="m6.8 17.2-1.8 1.8"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
    cup: '<path d="M6 3h12l-1.5 17a1.5 1.5 0 0 1-1.5 1.4H9a1.5 1.5 0 0 1-1.5-1.4L6 3Z"/><path d="M6.6 9h10.8"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    wifi: '<path d="M2.5 9.5a15 15 0 0 1 19 0"/><path d="M5.5 13a10.5 10.5 0 0 1 13 0"/><path d="M8.5 16.3a6 6 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.3" fill="currentColor" stroke="none"/>',
    wifiOff: '<path d="M2.5 9.5a15 15 0 0 1 19 0"/><path d="M5.5 13a10.5 10.5 0 0 1 13 0"/><path d="M8.5 16.3a6 6 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.3" fill="currentColor" stroke="none"/><path d="M4 4l16 16"/>',
    flame: '<path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-1-.5-1.5-1-2 1 0 3 2 3 5a6 6 0 0 1-12 0c0-4 2-5 3-7 .3 1 1 1.5 1 1.5S11 5 12 3Z"/>',
    bag: '<path d="M6 7l1.2-3.2A2 2 0 0 1 9.1 2.5h5.8a2 2 0 0 1 1.9 1.3L18 7"/><rect x="4" y="7" width="16" height="14" rx="2"/><path d="M9 11a3 3 0 0 0 6 0"/>'
};

// Fogaskerék: matematikailag generált, hogy garantáltan helyesen
// (gyűrű + kilyukasztott közép + 8 fog) jelenjen meg.
const GEAR_TEETH = [0, 45, 90, 135, 180, 225, 270, 315]
    .map(a => `<rect x="11" y="1.6" width="2" height="3.2" rx="0.6" transform="rotate(${a} 12 12)"/>`)
    .join("");

function icon(name, size) {
    size = size || 20;
    if (name === "gear") {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6.7"/><circle cx="12" cy="12" r="2.6"/><g fill="currentColor" stroke="none">${GEAR_TEETH}</g></svg>`;
    }
    const d = ICON_PATHS[name] || "";
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

// Minden [data-icon] elemet feltölt a megfelelő SVG-vel.
// Az oldal alján, a kezdeti renderelésnél kell meghívni.
function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(el => {
        const size = Number(el.dataset.iconSize) || 20;
        el.innerHTML = icon(el.dataset.icon, size);
    });
}
