const cv = document.getElementById('cv'), g = cv.getContext('2d');
const m = await import('./film.js');
await m.init();
window.DUR = m.DUR; window.SUBS = m.SUBS; window.render = t => m.render(g, t); window.READY = true;
