/* Forma — app personale palestra, corpo e dieta. Dati salvati solo sul dispositivo. */
'use strict';

/* ---------------- utility ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const dayDiff = (a, b) => Math.round((fromKey(b) - fromKey(a)) / 864e5);
const parseNum = s => { if (s == null || s === '') return null; const v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : null; };
const fmt = (n, dec = 1) => n == null || !isFinite(n) ? '–' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: dec });
const iv = v => v == null ? '' : String(v).replace('.', ',');
const fmtInt = n => fmt(Math.round(n || 0), 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const GG = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const GGG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MES = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const longDate = k => { const d = fromKey(k); return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}`; };
const shortDate = k => { const d = fromKey(k); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const relDate = k => { const t = todayKey(); if (k === t) return 'Oggi'; if (k === addDays(t, -1)) return 'Ieri'; if (k === addDays(t, 1)) return 'Domani'; return longDate(k); };
const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const dur = ms => { const m = Math.round(ms / 60000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${pad(m % 60)}`; };

const I = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
  body: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  food: '<path d="M6 3v6a2 2 0 0 0 4 0V3M8 9v12M17 21V3c2.2 0 3.5 3 3.5 7.5H17"/>',
  more: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01" stroke-width="3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2 2M9.5 2.5h5"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.2"/>',
  drop: '<path d="M12 3c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.5 12 3z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
};
const ic = (n, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

/* ---------------- storage ---------------- */
const Store = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const rq = indexedDB.open('forma', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
        rq.onsuccess = () => { this.db = rq.result; res(); };
        rq.onerror = () => res();
      } catch { res(); }
    });
  },
  get(k) {
    return new Promise(res => {
      if (!this.db) { try { res(JSON.parse(localStorage.getItem('forma:' + k))); } catch { res(null); } return; }
      const rq = this.db.transaction('kv').objectStore('kv').get(k);
      rq.onsuccess = () => res(rq.result ?? null); rq.onerror = () => res(null);
    });
  },
  set(k, v) {
    return new Promise(res => {
      if (!this.db) { try { localStorage.setItem('forma:' + k, JSON.stringify(v)); } catch { } res(); return; }
      const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k);
      tx.oncomplete = res; tx.onerror = res;
    });
  },
};

const SEED_FOODS = [
  ['Pasta di semola (cruda)', 'g', 353, 12.5, 71, 1.5], ['Riso (crudo)', 'g', 358, 7, 79, 0.6], ['Pane comune', 'g', 270, 8.5, 56, 1],
  ['Fiocchi d\'avena', 'g', 372, 13, 60, 7], ['Gallette di riso', 'g', 385, 8, 82, 3], ['Patate (crude)', 'g', 77, 2, 17, 0.1],
  ['Petto di pollo (crudo)', 'g', 100, 23, 0, 0.8], ['Petto di tacchino (crudo)', 'g', 107, 24, 0, 1.2], ['Manzo magro (crudo)', 'g', 115, 21.5, 0, 3],
  ['Salmone (crudo)', 'g', 185, 19, 0, 12], ['Merluzzo (crudo)', 'g', 82, 18, 0, 0.7], ['Tonno al naturale (sgocciolato)', 'g', 105, 24, 0, 1],
  ['Bresaola', 'g', 151, 32, 0.4, 2.6], ['Uovo intero', 'pz', 72, 6.3, 0.4, 4.8], ['Albume', 'g', 48, 10.9, 0.7, 0.2],
  ['Yogurt greco 0%', 'g', 55, 10, 3.5, 0.2], ['Latte parzialmente scremato', 'g', 46, 3.5, 5, 1.6], ['Ricotta vaccina', 'g', 146, 8.8, 3.5, 10.9],
  ['Mozzarella', 'g', 253, 18.7, 0.7, 19.5], ['Parmigiano', 'g', 392, 33, 0, 28], ['Proteine whey', 'g', 380, 78, 6, 5],
  ['Olio extravergine d\'oliva', 'g', 899, 0, 0, 100], ['Burro di arachidi', 'g', 588, 25, 20, 50], ['Mandorle', 'g', 603, 22, 4.6, 55],
  ['Lenticchie (secche)', 'g', 291, 22.7, 51, 1], ['Banana', 'g', 65, 1.2, 15.4, 0.3], ['Mela', 'g', 52, 0.3, 13.8, 0.2], ['Verdure miste', 'g', 25, 1.5, 4, 0.2],
].map(([name, unit, kcal, p, c, f], i) => ({ id: 'f' + i, name, unit, kcal, p, c, f, seed: true }));

const defaultState = () => ({
  v: 1,
  settings: { height: null, restDefault: 90, inc: 2.5, barKg: 20, sound: true, waterTarget: 8, plates: [25, 20, 15, 10, 5, 2.5, 1.25], supplements: ['Creatina'], targets: null, installHidden: false },
  routines: [], sessions: [], activeId: null, body: {}, foods: SEED_FOODS, diary: {}, templates: [], exNotes: {}, customEx: [], foodUse: {},
});

let S = defaultState();
// Salvataggio: ogni modifica viene scritta subito su IndexedDB e in una copia di sicurezza (localStorage).
let saveQ = false;
function persistNow() {
  saveQ = false;
  const p = Store.set('state', S);
  try { localStorage.setItem('forma:mirror', JSON.stringify(S)); } catch { }
  return p;
}
function save(now) {
  S.savedAt = Date.now();
  if (now) return persistNow();
  if (!saveQ) { saveQ = true; setTimeout(persistNow, 0); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
window.addEventListener('pagehide', () => persistNow());

/* ---------------- esercizi ---------------- */
let EX = [], EXM = {};
const MEDIA = ['https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/', 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/'];
const gifUrl = (e, i = 0) => e && e.g ? MEDIA[i] + 'videos/' + e.g : '';
const jpgUrl = (e, i = 0) => e && e.g ? MEDIA[i] + 'images/' + e.g.replace('.gif', '.jpg') : '';
window.imgFail = img => {
  const tries = +(img.dataset.try || 0);
  if (tries < MEDIA.length - 1 && img.dataset.src) { img.dataset.try = tries + 1; img.src = img.src.replace(MEDIA[tries], MEDIA[tries + 1]); }
  else { const p = img.parentNode; p.classList.add('none'); p.textContent = (img.alt || '?').slice(0, 1).toUpperCase(); }
};
const thumb = (e, cls = '', anim = false) => {
  if (!e) return `<div class="thumb none ${cls}">?</div>`;
  if (!e.g) return `<div class="thumb none ${cls}">${esc(e.n.slice(0, 1).toUpperCase())}</div>`;
  const src = anim ? gifUrl(e) : jpgUrl(e);
  return `<div class="thumb ${cls}"><img src="${src}" data-src="1" alt="${esc(e.n)}" loading="lazy" onerror="imgFail(this)"></div>`;
};
const exById = id => EXM[id] || S.customEx.find(c => c.id === id) || { id, n: 'Esercizio', b: '', t: '', e: '', s: [] };
const allEx = () => S.customEx.concat(EX);

/* ---------------- calcoli allenamento ---------------- */
const e1rm = (kg, reps) => !kg || !reps ? 0 : reps <= 1 ? kg : kg * (1 + reps / 30);
const doneSets = ex => ex.sets.filter(s => s.done);
const finished = () => S.sessions.filter(s => s.end);
function lastSetsFor(exId, excludeId) {
  const list = S.sessions.filter(s => s.id !== excludeId && (s.end || s.id !== S.activeId)).sort((a, b) => b.start - a.start);
  for (const s of list) {
    const ex = s.exercises.find(e => e.exId === exId);
    if (ex && doneSets(ex).length) return { session: s, sets: doneSets(ex) };
  }
  return null;
}
function bestE1(exId, excludeId) {
  let best = 0;
  for (const s of S.sessions) {
    if (s.id === excludeId) continue;
    for (const ex of s.exercises) if (ex.exId === exId) for (const st of doneSets(ex)) if (st.t !== 'R') best = Math.max(best, e1rm(st.kg, st.reps));
  }
  return best;
}
function suggestion(item, exId, excludeId) {
  if (!item || !item.repMax) return null;
  const last = lastSetsFor(exId, excludeId);
  if (!last) return null;
  const work = last.sets.filter(s => s.t !== 'R');
  if (!work.length) return null;
  const kg = Math.max(...work.map(s => s.kg || 0));
  if (!kg) return null;
  const ok = work.filter(s => (s.kg || 0) >= kg).every(s => (s.reps || 0) >= item.repMax);
  return ok ? { kg: kg + (S.settings.inc || 2.5), text: `Prova ${fmt(kg + (S.settings.inc || 2.5))} kg` } : null;
}
const sessionVolume = s => s.exercises.reduce((a, ex) => a + doneSets(ex).filter(x => x.t !== 'R').reduce((b, x) => b + (x.kg || 0) * (x.reps || 0), 0), 0);
const sessionSets = s => s.exercises.reduce((a, ex) => a + doneSets(ex).length, 0);
const routinesFor = k => S.routines.filter(r => r.days.includes(fromKey(k).getDay()));
const trainedOn = k => S.sessions.some(s => s.date === k && s.end && sessionSets(s) > 0);
const isTrainingDay = k => trainedOn(k) || routinesFor(k).length > 0 || (S.activeId && activeSession()?.date === k);
const activeSession = () => S.sessions.find(s => s.id === S.activeId);

/* ---------------- corpo ---------------- */
const bodyKeys = () => Object.keys(S.body).sort();
function series(field) { return bodyKeys().filter(k => S.body[k][field] != null).map(k => ({ k, x: fromKey(k).getTime(), y: S.body[k][field] })); }
function movingAvg(pts, days = 7) {
  return pts.map(p => {
    const win = pts.filter(q => q.x <= p.x && q.x > p.x - days * 864e5);
    return { k: p.k, x: p.x, y: win.reduce((a, q) => a + q.y, 0) / win.length };
  });
}
function avgAround(pts, k, days = 7) {
  const end = fromKey(k).getTime(), win = pts.filter(p => p.x <= end && p.x > end - days * 864e5);
  return win.length ? win.reduce((a, p) => a + p.y, 0) / win.length : null;
}
function navyBF(waist, neck, height) {
  if (!waist || !neck || !height || waist <= neck) return null;
  const bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
  return bf > 2 && bf < 60 ? bf : null;
}

/* ---------------- dieta ---------------- */
const MEALS = [['colazione', 'Colazione'], ['spuntino', 'Spuntino'], ['pranzo', 'Pranzo'], ['merenda', 'Merenda'], ['cena', 'Cena']];
const dayDiary = (k, create) => { if (!S.diary[k] && create) S.diary[k] = { items: [], water: 0, supps: {} }; return S.diary[k] || { items: [], water: 0, supps: {} }; };
const totals = items => items.reduce((a, i) => ({ kcal: a.kcal + (i.kcal || 0), p: a.p + (i.p || 0), c: a.c + (i.c || 0), f: a.f + (i.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
const targetFor = k => { const t = S.settings.targets; if (!t) return null; return isTrainingDay(k) ? t.train : t.rest; };
const foodCalc = (food, qty) => { const m = food.unit === 'pz' ? qty : qty / 100; return { kcal: food.kcal * m, p: food.p * m, c: food.c * m, f: food.f * m }; };
const unitLbl = u => u === 'pz' ? 'pz' : u === 'ml' ? 'ml' : 'g';
const perLbl = u => u === 'pz' ? 'per pezzo' : u === 'ml' ? 'per 100 ml' : 'per 100 g';
const qtyLbl = (q, u) => `${fmt(q)} ${unitLbl(u)}`;
/* piano alimentare: S.mealPlan[giornoSettimana][pasto] = [voci] */
const planFor = (k, meal) => ((S.mealPlan || {})[fromKey(k).getDay()] || {})[meal] || [];
function freshItem(it, qty = it.qty) {
  const food = it.foodId && S.foods.find(f => f.id === it.foodId);
  if (food) return { foodId: food.id, name: it.label || food.name, label: it.label, qty, unit: food.unit, ...foodCalc(food, qty) };
  const r = qty / (it.qty || 1);
  return { foodId: null, name: it.name, qty, unit: it.unit, kcal: it.kcal * r, p: it.p * r, c: it.c * r, f: it.f * r };
}
function eatPlan(k, meal) {
  const d = dayDiary(k, true);
  planFor(k, meal).forEach(it => d.items.push({ id: uid(), meal, ...freshItem(it) }));
  save();
}
function addFoodToDiary(k, meal, food, qty) {
  const d = dayDiary(k, true);
  d.items.push({ id: uid(), meal, foodId: food.id, name: food.name, qty, unit: food.unit, ...foodCalc(food, qty) });
  S.foodUse[food.id] = Date.now();
  save();
}

/* ---------------- audio, vibrazione, wake lock ---------------- */
let actx = null;
function unlockAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); g.gain.value = 0; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.01); } catch { }
}
function beep(times = 3) {
  if (!S.settings.sound || !actx) return;
  for (let i = 0; i < times; i++) {
    const t = actx.currentTime + i * 0.28, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = i === times - 1 ? 1175 : 880;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.24);
  }
}
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.activeId) keepAwake(true); if (!document.hidden) tick(); });

/* ---------------- toast ---------------- */
let toastT;
function toast(msg, ms = 2200) { const t = $('#toast'); t.innerHTML = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }

/* ---------------- sheet ---------------- */
const sheets = [];
function openSheet(o) {
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const el = document.createElement('div'); el.className = 'sheet' + (o.full ? ' full' : '');
  const sh = { ...o, el, bg, refresh() { const b = $('.sheet-b', el), st = b.scrollTop; b.innerHTML = o.body(sh); b.scrollTop = st; o.mount && o.mount(sh); }, close: () => closeSheet(sh) };
  el.innerHTML = `<div class="sheet-h"><h3>${esc(o.title)}</h3><button class="icon-btn" data-a="closeSheet">${ic('x')}</button></div><div class="sheet-b"></div>`;
  bg.addEventListener('click', () => closeSheet(sh));
  $('#sheet-root').append(bg, el);
  sheets.push(sh); sh.refresh();
  if (o.focus) setTimeout(() => { const f = $(o.focus, el); f && f.focus(); }, 280);
  return sh;
}
function closeSheet(sh) {
  sh = sh || sheets[sheets.length - 1]; if (!sh) return;
  const i = sheets.indexOf(sh); if (i < 0) return;
  sheets.splice(i, 1); sh.el.remove(); sh.bg.remove();
  sh.onClose && sh.onClose();
}
function confirmSheet(title, text, okLabel, onOk, danger = true) {
  openSheet({ title, body: () => `<p class="sub">${text}</p><button class="btn block ${danger ? 'danger' : 'primary'} mt2" data-a="ok">${esc(okLabel)}</button><button class="btn block mt" data-a="closeSheet">Annulla</button>`, actions: { ok: (el, ev, sh) => { sh.close(); onOk(); } } });
}

/* ---------------- grafici ---------------- */
function drawChart(box, { pts, line, unit = '', dec = 1, h = 190, color = 'var(--accent)' }) {
  if (!box) return;
  if (!pts.length) { box.innerHTML = `<div class="empty">Nessun dato ancora</div>`; return; }
  const W = Math.max(box.clientWidth || 340, 260), H = h, L = 38, R = 12, T = 26, B = 24;
  const all = pts.concat(line || []);
  let y0 = Math.min(...all.map(p => p.y)), y1 = Math.max(...all.map(p => p.y));
  if (y1 - y0 < 1) { y0 -= 0.5; y1 += 0.5; }
  const padY = (y1 - y0) * 0.12; y0 -= padY; y1 += padY;
  let x0 = Math.min(...all.map(p => p.x)), x1 = Math.max(...all.map(p => p.x));
  if (x1 === x0) { x0 -= 864e5 * 3; x1 += 864e5 * 3; }
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const step = niceStep((y1 - y0) / 4); let ticks = '';
  for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) ticks += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${L - 7}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="var(--faint)">${fmt(v, step < 1 ? 1 : 0)}</text>`;
  const lbl = x => { const d = new Date(x); return `${d.getDate()} ${MES[d.getMonth()]}`; };
  const xl = `<text x="${L}" y="${H - 5}" font-size="11" fill="var(--faint)">${lbl(x0)}</text><text x="${W - R}" y="${H - 5}" text-anchor="end" font-size="11" fill="var(--faint)">${lbl(x1)}</text>`;
  const path = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const main = line && line.length ? line : pts;
  const last = main[main.length - 1];
  const area = `${path(main)}L${X(last.x)},${H - B}L${X(main[0].x)},${H - B}Z`;
  const dots = line && line.length ? pts.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.6" fill="var(--muted)" opacity=".55"/>`).join('') : pts.length < 40 ? pts.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="${color}"/>`).join('') : '';
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${ticks}${xl}<path d="${area}" fill="url(#${gid})"/>${dots}<path d="${path(main)}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(last.x)}" cy="${Y(last.y)}" r="5" fill="${color}" stroke="var(--surface)" stroke-width="2"/><g class="hl"></g></svg><div class="tip" hidden></div>`;
  const svg = $('svg', box), tip = $('.tip', box), hl = $('.hl', box);
  const show = ev => {
    const r = svg.getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left, sx = px * W / r.width;
    let best = pts[0]; for (const p of pts) if (Math.abs(X(p.x) - sx) < Math.abs(X(best.x) - sx)) best = p;
    const m = line && line.find(q => q.x === best.x);
    hl.innerHTML = `<line x1="${X(best.x)}" x2="${X(best.x)}" y1="${T - 6}" y2="${H - B}" stroke="var(--muted)" stroke-width="1"/><circle cx="${X(best.x)}" cy="${Y(best.y)}" r="5" fill="var(--text)"/>`;
    tip.hidden = false; tip.style.left = clamp(X(best.x) / W * r.width, 60, r.width - 60) + 'px';
    tip.innerHTML = `${lbl(best.x)} · <b>${fmt(best.y, dec)} ${unit}</b>${m ? ` · media ${fmt(m.y, dec)}` : ''}`;
  };
  svg.addEventListener('pointerdown', show); svg.addEventListener('pointermove', e => e.buttons && show(e));
  svg.addEventListener('touchmove', show, { passive: true });
}
function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
function rangeFilter(pts, range) { if (range === 'all' || !pts.length) return pts; const from = Date.now() - range * 864e5; return pts.filter(p => p.x >= from); }

/* ---------------- timer recupero ---------------- */
let T = null; // {end,total,alerted,doneAt}
function startTimer(sec) {
  unlockAudio();
  T = { end: Date.now() + sec * 1000, total: sec, alerted: false };
  try { localStorage.setItem('forma:timer', JSON.stringify(T)); } catch { }
  tick();
}
function stopTimer() { T = null; const b = $('#timerbar'); b.classList.remove('done'); b.innerHTML = ''; try { localStorage.removeItem('forma:timer'); } catch { } tick(); }
function adjustTimer(d) { if (!T) return; if (T.alerted) { startTimer(Math.max(5, d)); return; } T.end += d * 1000; T.total = Math.max(5, T.total + d); if (T.end < Date.now()) T.end = Date.now(); tick(); }
function tick() {
  const bar = $('#timerbar');
  if (!T) { bar.hidden = true; return; }
  const rem = (T.end - Date.now()) / 1000;
  bar.hidden = false;
  bar.classList.toggle('in-session', !$('#session').hidden);
  if (rem <= 0) {
    if (!T.alerted) { T.alerted = true; T.doneAt = Date.now(); if (-rem < 10) { beep(); buzz([200, 100, 200, 100, 300]); } }
    if (Date.now() - T.doneAt > 9000) { stopTimer(); return; }
    if (bar.classList.contains('done')) return;
    bar.classList.add('done');
    bar.innerHTML = `<div class="grow"><b style="font-size:18px">Recupero finito</b><div style="font-size:13px;opacity:.75">Vai con la prossima serie</div></div><button class="btn sm" data-a="timerPlus" data-d="30">+30 s</button><button class="btn sm" data-a="timerStop">OK</button>`;
    return;
  }
  if (bar.classList.contains('done')) { bar.classList.remove('done'); bar.innerHTML = ''; }
  const pct = clamp(1 - rem / T.total, 0, 1) * 100;
  if (!$('.t', bar)) bar.innerHTML = `<div class="t num"></div><div class="grow small">Recupero</div><button class="btn sm" data-a="timerPlus" data-d="-15">−15</button><button class="btn sm" data-a="timerPlus" data-d="15">+15</button><button class="btn sm" data-a="timerStop">Salta</button><div class="prog"></div>`;
  $('.t', bar).textContent = mmss(Math.ceil(rem));
  $('.prog', bar).style.width = pct + '%';
}
setInterval(() => { tick(); const el = $('#elapsed'); const s = activeSession(); if (el && s) el.textContent = mmss((Date.now() - s.start) / 1000); }, 250);

/* ---------------- tab & render ---------------- */
const TABS = [['oggi', 'Oggi', 'home'], ['allena', 'Allenamento', 'dumbbell'], ['corpo', 'Corpo', 'body'], ['dieta', 'Dieta', 'food'], ['altro', 'Altro', 'more']];
let tab = (location.hash.slice(1) || 'oggi');
if (!TABS.some(t => t[0] === tab)) tab = 'oggi';
const ui = { allenaSeg: 'schede', corpoSeg: 'peso', range: 90, dietDate: todayKey(), libFilter: 'Tutti', libQ: '', bodyDate: todayKey() };

function renderTabs() {
  $('#tabbar').innerHTML = TABS.map(([k, l, i]) => `<button class="${k === tab ? 'on' : ''}" data-a="tab" data-t="${k}">${ic(i, k === tab ? 2.3 : 2)}${l}</button>`).join('');
}
function render() {
  renderTabs();
  const v = $('#view');
  v.innerHTML = VIEWS[tab]();
  MOUNT[tab] && MOUNT[tab]();
}
function go(t) { tab = t; history.replaceState(null, '', '#' + t); render(); window.scrollTo(0, 0); }

const VIEWS = {}, MOUNT = {};

/* ===== OGGI ===== */
VIEWS.oggi = () => {
  const k = todayKey(), b = S.body[k] || {}, act = activeSession();
  const rts = routinesFor(k);
  const wPts = series('w'), avg = avgAround(wPts, k), prevAvg = avgAround(wPts, addDays(k, -7));
  let h = `<div class="sub">${longDate(k)}</div><h1>${greeting()}</h1>`;
  if (!isStandalone() && !S.settings.installHidden) h += `<div class="card tight mt"><div class="between"><div class="small" style="color:var(--text)">Per usarla come un'app: tocca <b>Condividi</b> in Safari → <b>Aggiungi alla schermata Home</b>.</div><button class="icon-btn" data-a="hideInstall">${ic('x')}</button></div></div>`;
  h += `<h2>Allenamento</h2>`;
  if (act) h += `<div class="card hero"><div class="small">In corso · <span class="num">${dur(Date.now() - act.start)}</span></div><h3 class="mt" style="font-size:22px">${esc(act.name)}</h3><div class="small">${sessionSets(act)} serie completate</div><button class="btn primary block mt2" data-a="openSession">Riprendi allenamento</button></div>`;
  else if (trainedOn(k)) { const s = S.sessions.filter(s => s.date === k && s.end).pop(); h += `<div class="card"><div class="row"><span class="tag acc">Fatto ✓</span><span class="small">${dur(s.end - s.start)}</span></div><h3 class="mt" style="font-size:20px">${esc(s.name)}</h3><div class="small">${sessionSets(s)} serie · ${fmtInt(sessionVolume(s))} kg di volume</div><button class="btn block mt" data-a="freeWorkout">Altro allenamento</button></div>`; }
  else if (rts.length) h += rts.map(r => `<div class="card hero"><div class="small">In programma oggi</div><h3 class="mt" style="font-size:22px">${esc(r.name)}</h3><div class="small">${r.items.length} esercizi · ${r.items.reduce((a, i) => a + i.sets, 0)} serie</div><button class="btn primary block mt2" data-a="startRoutine" data-id="${r.id}">Inizia allenamento</button></div>`).join('');
  else h += `<div class="card"><h3>Giorno di riposo</h3><div class="small">${S.routines.length ? 'Nessuna scheda assegnata a oggi.' : 'Crea la tua prima scheda nella sezione Allenamento.'}</div><div class="row mt"><button class="btn grow" data-a="freeWorkout">Allenamento libero</button>${S.routines.length ? '' : `<button class="btn primary grow" data-a="tab" data-t="allena">Crea scheda</button>`}</div></div>`;

  h += `<h2>Peso di stamattina</h2><div class="card">`;
  if (b.w != null) h += `<div class="between"><div class="stat">${fmt(b.w)}<small>kg</small></div><button class="btn sm" data-a="editBody" data-k="${k}">Modifica</button></div><div class="small mt">Media 7 giorni <b class="num" style="color:var(--text)">${fmt(avg, 2)} kg</b> ${deltaHtml(avg, prevAvg, ' kg/sett.')}</div>`;
  else h += `<div class="row"><div class="unit-wrap grow"><input class="input big" id="qw" inputmode="decimal" placeholder="${fmt(wPts.length ? wPts[wPts.length - 1].y : 75)}"><span class="unit">kg</span></div></div><button class="btn primary block mt" data-a="quickWeight">Salva peso</button><div class="small mt center">Appena sveglio, dopo il bagno, prima di mangiare.</div>`;
  h += `</div>`;

  h += `<h2>Misure di oggi</h2><div class="card"><div class="grid2"><label class="field"><span>Girovita (ombelico)</span><div class="unit-wrap"><input class="input" id="qwaist" inputmode="decimal" value="${iv(b.waist)}" placeholder="–"><span class="unit">cm</span></div></label><label class="field"><span>Bicipite</span><div class="unit-wrap"><input class="input" id="qbicep" inputmode="decimal" value="${iv(b.bicep)}" placeholder="–"><span class="unit">cm</span></div></label></div><button class="btn block" data-a="quickMeasure">Salva misure</button></div>`;

  const d = dayDiary(k), tot = totals(d.items), tg = targetFor(k);
  h += `<h2>Dieta</h2><div class="card tap" data-a="tab" data-t="dieta">${tg ? `<div class="between"><div><span class="stat md">${fmtInt(tot.kcal)}</span><span class="small"> / ${fmtInt(tg.kcal)} kcal</span></div><span class="small">${tg.kcal - tot.kcal >= 0 ? `ne restano <b class="num" style="color:var(--text)">${fmtInt(tg.kcal - tot.kcal)}</b>` : `<span style="color:var(--warn)">+${fmtInt(tot.kcal - tg.kcal)} oltre</span>`}</span></div><div class="bar mt"><i style="width:${clamp(tot.kcal / tg.kcal * 100, 0, 100)}%"></i></div>${macroRows(tot, tg)}` : `<div class="between"><div><span class="stat md">${fmtInt(tot.kcal)}</span><span class="small"> kcal oggi</span></div><span class="link small">Imposta obiettivi</span></div>`}</div>`;
  h += `<div class="card tight"><div class="between"><div class="row">${ic('drop')}<span><b class="num">${d.water || 0}</b> / ${S.settings.waterTarget} bicchieri d'acqua</span></div><button class="btn sm primary" data-a="water" data-k="${k}" data-d="1">+1</button></div></div>`;

  h += `<h2>Costanza · ultime 4 settimane</h2><div class="card">${heatmap()}</div>`;
  return h;
};
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'; }
function deltaHtml(a, b, suf = '', good = 0) {
  if (a == null || b == null) return '';
  const d = a - b, cls = Math.abs(d) < 0.05 || !good ? 'flat' : (d > 0) === (good > 0) ? 'down' : 'up';
  return `<span class="delta ${cls}">${d > 0 ? '+' : ''}${fmt(d, 2)}${suf}</span>`;
}
function macroRows(tot, tg) {
  return [['p', 'Proteine'], ['c', 'Carboidrati'], ['f', 'Grassi']].map(([m, l]) => `<div class="macro"><span class="dot" style="background:var(--${m})"></span><div><div class="between small" style="color:var(--text)"><span>${l}</span><span><b>${fmtInt(tot[m])}</b>${tg ? ` / ${fmtInt(tg[m])} g` : ' g'}</span></div>${tg ? `<div class="bar" style="height:5px;margin-top:4px"><i style="width:${clamp(tot[m] / (tg[m] || 1) * 100, 0, 100)}%;background:var(--${m})"></i></div>` : ''}</div><span></span></div>`).join('');
}
function heatmap() {
  const t = todayKey(); let cells = '';
  const start = addDays(t, -(27 + ((fromKey(t).getDay() + 6) % 7) - 6));
  let n = 0;
  for (let k = addDays(t, -27); dayDiff(k, t) >= 0; k = addDays(k, 1)) { cells += `<i class="${trainedOn(k) ? 'on' : ''} ${k === t ? 'today' : ''}" title="${shortDate(k)}"></i>`; if (trainedOn(k)) n++; }
  return `<div class="heat">${cells}</div><div class="small mt">${n} allenamenti in 28 giorni</div>`;
}
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

/* ===== ALLENAMENTO ===== */
VIEWS.allena = () => {
  const act = activeSession();
  let h = `<h1>Allenamento</h1>`;
  if (act) h += `<div class="card hero mt"><div class="between"><div><div class="small">In corso</div><h3>${esc(act.name)}</h3></div><button class="btn primary sm" data-a="openSession">Riprendi</button></div></div>`;
  h += `<div class="seg">${[['schede', 'Schede'], ['storico', 'Storico'], ['esercizi', 'Esercizi']].map(([k, l]) => `<button class="${ui.allenaSeg === k ? 'on' : ''}" data-a="seg" data-s="allenaSeg" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (ui.allenaSeg === 'schede') {
    const t = todayKey(), tDow = fromKey(t).getDay();
    h += `<div class="week">${WEEK.map(d => { const r = S.routines.filter(r => r.days.includes(d)); return `<div class="wd ${d === tDow ? 'today' : ''}"><b>${GGG[d]}</b><span>${r.length ? esc(r.map(x => x.short || x.name).join(' + ')) : '<span style="color:var(--faint)">riposo</span>'}</span></div>`; }).join('')}</div>`;
    h += `<div class="between"><h2>Le tue schede</h2><button class="btn ghost" data-a="timerSheet">${ic('timer')} Timer</button></div>`;
    if (!S.routines.length) h += `<div class="card center"><p class="sub">Una scheda è un allenamento tipo (es. "Petto e tricipiti") con i suoi esercizi, serie e ripetizioni, assegnato ai giorni della settimana.</p></div>`;
    h += S.routines.map(r => `<div class="card"><div class="between"><div class="grow"><h3 class="ell">${esc(r.name)}</h3><div class="small">${r.days.length ? WEEK.filter(d => r.days.includes(d)).map(d => GIORNI[d]).join(', ') : 'Nessun giorno'} · ${r.items.length} esercizi</div></div><button class="icon-btn" data-a="editRoutine" data-id="${r.id}">${ic('edit')}</button></div><div class="small mt" style="line-height:1.6">${r.items.slice(0, 6).map(i => esc(exName(i))).join(' · ')}${r.items.length > 6 ? ' …' : ''}</div><button class="btn primary block mt" data-a="startRoutine" data-id="${r.id}" ${act ? 'disabled' : ''}>Inizia</button></div>`).join('');
    h += `<button class="btn block mt" data-a="editRoutine">${ic('plus')} Nuova scheda</button>`;
    if (!act) h += `<button class="btn ghost block mt" data-a="freeWorkout">Allenamento libero (senza scheda)</button>`;
  } else if (ui.allenaSeg === 'storico') {
    const list = finished().sort((a, b) => b.start - a.start);
    if (!list.length) h += `<div class="empty">Qui vedrai tutti i tuoi allenamenti completati.</div>`;
    let lastMonth = '';
    for (const s of list) {
      const d = fromKey(s.date), m = `${MESI[d.getMonth()]} ${d.getFullYear()}`;
      if (m !== lastMonth) { if (lastMonth) h += `</div>`; h += `<h2>${m}</h2><div class="list">`; lastMonth = m; }
      h += `<div class="li tap" data-a="sessionDetail" data-id="${s.id}"><div class="grow"><div class="ell"><b>${esc(s.name)}</b></div><div class="small">${relDate(s.date)} · ${s.imported ? 'dalla scheda cartacea' : dur(s.end - s.start)} · ${sessionSets(s)} serie · ${fmtInt(sessionVolume(s))} kg</div></div><span class="chev">›</span></div>`;
    }
    if (lastMonth) h += `</div>`;
  } else {
    h += libraryHtml('lib');
  }
  return h;
};
function libraryHtml(ctx, sel) {
  const parts = ['Tutti', 'Petto', 'Schiena', 'Spalle', 'Braccia', 'Gambe', 'Polpacci', 'Addome', 'Avambracci', 'Cardio'];
  if (S.customEx.length) parts.splice(1, 0, 'Miei');
  let h = `<input class="input" data-in="libQ" placeholder="Cerca (es. panca, curl, lat machine)" value="${esc(ui.libQ)}" style="margin-bottom:10px"><div class="chips">${parts.map(p => `<button class="chip ${ui.libFilter === p ? 'on' : ''}" data-a="libFilter" data-v="${p}">${p}</button>`).join('')}</div><div id="libList">${libraryList(ctx, sel)}</div>`;
  return h;
}
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function libraryResults() {
  const q = norm(ui.libQ.trim()), words = q.split(/\s+/).filter(Boolean);
  let list = ui.libFilter === 'Miei' ? S.customEx : ui.libFilter === 'Tutti' ? allEx() : allEx().filter(e => e.b === ui.libFilter);
  if (words.length) {
    list = list.map(e => { const nn = norm(e.n), hay = norm(`${e.n} ${e.en || ''} ${e.t} ${e.e} ${e.b}`); if (!words.every(w => hay.includes(w))) return null; const inName = words.every(w => nn.includes(w)); return [e, (inName ? 0 : 3) + (nn.includes(q) ? 0 : 1) + (nn.startsWith(words[0]) ? 0 : 1)]; }).filter(Boolean).sort((a, b) => a[1] - b[1] || a[0].n.length - b[0].n.length).map(x => x[0]);
  }
  return list;
}
let libLimit = 60;
function libraryList(ctx, sel) {
  const list = libraryResults();
  if (!list.length) return `<div class="empty">Nessun esercizio trovato.<br><button class="btn mt" data-a="customEx">Crea "${esc(ui.libQ || 'nuovo esercizio')}"</button></div>`;
  let h = `<div class="list">` + list.slice(0, libLimit).map(e => {
    const on = sel && sel.includes(e.id);
    return `<div class="li tap" data-a="${ctx === 'pick' ? 'pickEx' : 'exInfo'}" data-id="${e.id}">${thumb(e)}<div class="grow"><div class="ell"><b>${esc(e.n)}</b></div><div class="small ell">${esc(e.t)} · ${esc(e.e)}</div></div>${ctx === 'pick' ? `<span class="check ${on ? 'on' : ''}">${on ? ic('check', 3) : ''}</span>` : '<span class="chev">›</span>'}</div>`;
  }).join('') + `</div>`;
  if (list.length > libLimit) h += `<button class="btn block" data-a="libMore">Mostra altri (${list.length - libLimit})</button>`;
  h += `<button class="btn ghost block mt" data-a="customEx">${ic('plus')} Crea esercizio personalizzato</button>`;
  return h;
}

/* ===== CORPO ===== */
VIEWS.corpo = () => {
  let h = `<h1>Corpo</h1><div class="seg">${[['peso', 'Peso'], ['misure', 'Misure']].map(([k, l]) => `<button class="${ui.corpoSeg === k ? 'on' : ''}" data-a="seg" data-s="corpoSeg" data-v="${k}">${l}</button>`).join('')}</div>`;
  const ranges = `<div class="chips">${[[30, '30 giorni'], [90, '3 mesi'], [365, '1 anno'], ['all', 'Tutto']].map(([v, l]) => `<button class="chip ${ui.range == v ? 'on' : ''}" data-a="range" data-v="${v}">${l}</button>`).join('')}</div>`;
  const k = todayKey();
  if (ui.corpoSeg === 'peso') {
    const pts = series('w'), ma = movingAvg(pts), last = pts[pts.length - 1];
    const a7 = avgAround(pts, k), a7p = avgAround(pts, addDays(k, -7)), a30 = avgAround(pts, addDays(k, -28));
    h += `<div class="card"><div class="between"><div><div class="small">Media 7 giorni</div><div class="stat">${fmt(a7 ?? last?.y, 2)}<small>kg</small></div></div><button class="btn primary sm" data-a="editBody" data-k="${k}">${S.body[k]?.w != null ? 'Modifica oggi' : '+ Peso di oggi'}</button></div><div class="grid2 mt"><div><div class="small">vs settimana scorsa</div>${deltaHtml(a7, a7p, ' kg') || '<span class="small">–</span>'}</div><div><div class="small">vs 4 settimane fa</div>${deltaHtml(a7, a30, ' kg') || '<span class="small">–</span>'}</div></div>${S.settings.start?.w != null && (a7 ?? last?.y) != null ? `<div class="small mt">Dall'inizio del programma (${fmt(S.settings.start.w)} kg): ${deltaHtml(a7 ?? last?.y, S.settings.start.w, ' kg')}</div>` : ''}</div>`;
    h += ranges + `<div class="card"><div class="between small"><span>Peso giornaliero · <span style="color:var(--accent)">media 7 gg</span></span></div><div class="chart" id="chW"></div></div>`;
    h += `<div class="small" style="margin:0 4px 14px">Il peso del singolo giorno oscilla per acqua, sale e carboidrati: guarda la linea della media, non il puntino.</div>`;
    h += bodyListHtml('w', 'kg');
  } else {
    const wa = series('waist'), bi = series('bicep'), b = S.body[k] || {};
    const insight = bodyInsight();
    h += `<button class="btn primary block" data-a="editBody" data-k="${k}">${b.waist != null || b.bicep != null ? 'Modifica misure di oggi' : '+ Misure di oggi'}</button>`;
    if (insight) h += `<div class="card tight mt" style="border:1px solid var(--line)"><div class="small" style="color:var(--text)">${insight}</div></div>`;
    const lastNeck = series('neck').pop(), lastW = wa[wa.length - 1], st0 = S.settings.start || {};
    if (S.settings.start) h += `<div class="small" style="margin:12px 4px 0">Punto di partenza${st0.label ? ` (${esc(st0.label)})` : ''}: <b class="num" style="color:var(--text)">${[st0.w != null && fmt(st0.w) + ' kg', st0.waist != null && 'vita ' + fmt(st0.waist) + ' cm', st0.bicep != null && 'bicipite ' + fmt(st0.bicep) + ' cm'].filter(Boolean).join(' · ')}</b></div>`;
    const bf = navyBF(lastW?.y, lastNeck?.y, S.settings.height);
    h += `<div class="grid2 mt"><div class="card"><div class="small">Girovita</div><div class="stat md">${fmt(lastW?.y)}<small>cm</small></div>${deltaHtml(lastW?.y, st0.waist ?? (wa.length > 1 ? wa[0].y : null), ' dall\'inizio', -1)}</div><div class="card"><div class="small">Bicipite</div><div class="stat md">${fmt(bi[bi.length - 1]?.y)}<small>cm</small></div>${deltaHtml(bi[bi.length - 1]?.y, st0.bicep ?? (bi.length > 1 ? bi[0].y : null), ' dall\'inizio', 1)}</div></div>`;
    if (bf) h += `<div class="card tight"><div class="between"><span>Massa grassa stimata</span><b class="num">${fmt(bf)}%</b></div><div class="small">Metodo US Navy (girovita, collo, altezza). È una stima: l'errore tipico è di qualche punto. Utile soprattutto per vedere la tendenza.</div></div>`;
    h += ranges + `<div class="card"><div class="small">Girovita all'ombelico (cm)</div><div class="chart" id="chWaist"></div></div><div class="card"><div class="small">Bicipite (cm)</div><div class="chart" id="chBicep"></div></div>`;
    h += `<div class="card tight"><b>Come misurare (sempre uguale)</b><ul class="steps small"><li><b>Girovita:</b> metro orizzontale passando sull'ombelico, a fine espirazione normale, senza tirare la pancia in dentro.</li><li><b>Bicipite:</b> sempre lo stesso braccio e sempre nello stesso modo (contratto o rilassato), nel punto più largo.</li><li>Stessa ora del giorno, idealmente al mattino insieme al peso.</li></ul></div>`;
    h += bodyListHtml('waist', 'cm');
  }
  return h;
};
MOUNT.corpo = () => {
  const r = ui.range === 'all' ? 'all' : +ui.range;
  if (ui.corpoSeg === 'peso') { const pts = series('w'), ma = movingAvg(pts); drawChart($('#chW'), { pts: rangeFilter(pts, r), line: rangeFilter(ma, r), unit: 'kg', dec: 1 }); }
  else { drawChart($('#chWaist'), { pts: rangeFilter(series('waist'), r), unit: 'cm', h: 160, color: 'var(--warn)' }); drawChart($('#chBicep'), { pts: rangeFilter(series('bicep'), r), unit: 'cm', h: 160, color: 'var(--p)' }); }
};
function bodyInsight() {
  const w = series('w'), wa = series('waist'); if (w.length < 8 || wa.length < 3) return '';
  const k = todayKey(), dw = avgAround(w, k) - avgAround(w, addDays(k, -28), 7);
  const recent = wa.filter(p => p.x > Date.now() - 35 * 864e5); if (recent.length < 2 || isNaN(dw)) return '';
  const dwa = recent[recent.length - 1].y - recent[0].y;
  if (dw > 0.3 && dwa <= 0.5) return `Nell'ultimo mese il peso è salito (${fmt(dw, 1)} kg) ma il girovita è stabile: è probabile che tu stia mettendo soprattutto massa magra.`;
  if (dw < -0.3 && dwa < -0.5) return `Peso e girovita in calo nell'ultimo mese: stai perdendo grasso.`;
  if (dw > 0.3 && dwa > 1) return `Peso e girovita in aumento nell'ultimo mese: se l'obiettivo è una massa pulita, valuta di ridurre un po' le calorie.`;
  if (Math.abs(dw) <= 0.3 && dwa < -0.5) return `Peso stabile ma girovita in calo: probabile ricomposizione corporea (meno grasso, più muscolo).`;
  return '';
}
function bodyListHtml() {
  const keys = bodyKeys().reverse().slice(0, 30);
  if (!keys.length) return '';
  return `<h2>Registrazioni</h2><div class="list">${keys.map(k => { const b = S.body[k]; const parts = [b.w != null && `<b class="num">${fmt(b.w)} kg</b>`, b.waist != null && `vita ${fmt(b.waist)}`, b.bicep != null && `bic. ${fmt(b.bicep)}`, b.neck != null && `collo ${fmt(b.neck)}`, b.steps != null && `${fmtInt(b.steps)} passi`].filter(Boolean); return `<div class="li tap" data-a="editBody" data-k="${k}"><div class="grow"><div>${relDate(k)}</div><div class="small">${parts.join(' · ') || '–'}</div></div><span class="chev">›</span></div>`; }).join('')}</div>`;
}

/* ===== DIETA ===== */
VIEWS.dieta = () => {
  const k = ui.dietDate, d = dayDiary(k), tot = totals(d.items), tg = targetFor(k);
  let h = `<div class="between" style="margin-top:4px"><button class="icon-btn" data-a="dietDay" data-d="-1">${ic('left')}</button><div class="center"><div style="font-weight:700;font-size:17px">${relDate(k)}</div><div class="small">${isTrainingDay(k) ? 'Giorno di allenamento' : 'Giorno di riposo'}</div></div><button class="icon-btn" data-a="dietDay" data-d="1">${ic('right')}</button></div>`;
  h += `<div class="card mt">`;
  if (tg) h += `<div class="between"><div><span class="stat">${fmtInt(tot.kcal)}</span><span class="small"> / ${fmtInt(tg.kcal)} kcal</span></div><div class="small" style="text-align:right">${tg.kcal - tot.kcal >= 0 ? `restano<br><b class="num" style="color:var(--text);font-size:17px">${fmtInt(tg.kcal - tot.kcal)}</b>` : `<span style="color:var(--warn)">oltre di<br><b class="num" style="font-size:17px">${fmtInt(tot.kcal - tg.kcal)}</b></span>`}</div></div><div class="bar mt"><i style="width:${clamp(tot.kcal / tg.kcal * 100, 0, 100)}%;${tot.kcal > tg.kcal ? 'background:var(--warn)' : ''}"></i></div>`;
  else h += `<div class="between"><div><span class="stat">${fmtInt(tot.kcal)}</span><span class="small"> kcal</span></div><button class="btn sm" data-a="targetsSheet">Imposta obiettivi</button></div>`;
  h += macroRows(tot, tg) + `</div><!--PLANDAY-->`;
  for (const [m, label] of MEALS) {
    const items = d.items.filter(i => i.meal === m), mt = totals(items);
    h += `<div class="list"><div class="li" style="min-height:48px"><div class="grow"><b>${label}</b> ${items.length ? `<span class="small num">· ${fmtInt(mt.kcal)} kcal</span>` : ''}</div><button class="icon-btn" data-a="mealMenu" data-m="${m}">${ic('dots')}</button><button class="icon-btn" style="background:var(--accent);color:var(--accent-ink)" data-a="addFood" data-m="${m}">${ic('plus', 2.6)}</button></div>`;
    h += items.map(i => `<div class="li tap" data-a="editItem" data-id="${i.id}"><div class="grow"><div class="ell">${esc(i.name)}</div><div class="small num">${qtyLbl(i.qty, i.unit)} · P ${fmtInt(i.p)} · C ${fmtInt(i.c)} · G ${fmtInt(i.f)}</div></div><b class="num">${fmtInt(i.kcal)}</b></div>`).join('');
    const plan = planFor(k, m);
    if (!items.length && plan.length) { const pt = totals(plan.map(it => freshItem(it))); h += `<div class="li" style="display:block"><div class="small">Da piano · ≈ ${fmtInt(pt.kcal)} kcal · P ${fmtInt(pt.p)} g</div><div style="font-size:14px;margin-top:3px;line-height:1.45">${plan.map(it => `${esc(freshItem(it).name)} <span class="num" style="color:var(--muted)">${qtyLbl(it.qty, it.unit)}</span>`).join(' · ')}</div><div class="row mt" style="gap:8px"><button class="btn sm primary grow" data-a="planEat" data-m="${m}">${ic('check', 2.6)} Mangiato come da piano</button><button class="btn sm" data-a="planSheet">Modifica</button></div></div>`; }
    h += `</div>`;
  }
  if (!d.items.length && MEALS.some(([m]) => planFor(k, m).length)) h = h.replace('<!--PLANDAY-->', `<button class="btn block" data-a="planEatDay" style="margin-bottom:12px">${ic('check', 2.6)} Segna tutta la giornata come da piano</button>`);
  if (!d.items.length) { const y = dayDiary(addDays(k, -1)); if (y.items.length) h += `<button class="btn block" data-a="copyDay">Copia tutta la giornata di ieri (${fmtInt(totals(y.items).kcal)} kcal)</button>`; }
  h += `<h2>Acqua</h2><div class="card"><div class="glasses">${Array.from({ length: Math.max(S.settings.waterTarget, d.water || 0) }, (_, i) => `<button class="glass ${i < (d.water || 0) ? 'on' : ''}" data-a="waterSet" data-n="${i + 1}">${ic('drop')}</button>`).join('')}<button class="glass" data-a="water" data-k="${k}" data-d="1">${ic('plus')}</button></div><div class="small mt">${d.water || 0} bicchieri (≈ ${fmt((d.water || 0) * 0.25, 2)} L)</div></div>`;
  if (S.settings.supplements.length) h += `<h2>Integratori</h2><div class="list">${S.settings.supplements.map(s => { const on = d.supps && d.supps[s]; return `<div class="li tap" data-a="supp" data-s="${esc(s)}"><span class="check ${on ? 'on' : ''}">${on ? ic('check', 3) : ''}</span><div class="grow">${esc(s)}</div></div>`; }).join('')}</div>`;
  return h;
};

/* ===== ALTRO ===== */
VIEWS.altro = () => {
  const items = [['targetsSheet', 'Obiettivi dieta', S.settings.targets ? `${fmtInt(S.settings.targets.train.kcal)} / ${fmtInt(S.settings.targets.rest.kcal)} kcal` : 'Da impostare'], ['profileSheet', 'Profilo e allenamento', 'Altezza, recupero, incrementi'], ['planSheetAll', 'Piano alimentare', 'Menù tipo dei 7 giorni (3 pasti)'], ['suppSheet', 'Integratori', S.settings.supplements.join(', ') || 'Nessuno'], ['foodsSheet', 'I miei alimenti', `${S.foods.length} alimenti · ${S.templates.length} pasti salvati`], ['platesSheet', 'Calcolatore dischi', 'Quali dischi caricare sul bilanciere'], ['timerSheet', 'Timer', 'Timer libero']];
  let h = `<h1>Altro</h1><div class="list mt2">${items.map(([a, t, s]) => `<div class="li tap" data-a="${a}"><div class="grow"><div>${t}</div><div class="small ell">${esc(s)}</div></div><span class="chev">›</span></div>`).join('')}</div>`;
  const bk = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  h += `<h2>Dati</h2><div class="small" style="margin:-4px 4px 10px">${bk == null ? 'Nessun backup fatto finora.' : bk === 0 ? 'Ultimo backup: oggi.' : `Ultimo backup: ${bk} giorni fa.`}</div><div class="list"><div class="li tap" data-a="exportData"><div class="grow"><div>Esporta backup</div><div class="small">Salva un file con tutti i tuoi dati (es. su iCloud Drive)</div></div><span class="chev">›</span></div><label class="li tap"><div class="grow"><div>Importa backup</div><div class="small">Ripristina da un file di backup</div></div><input type="file" accept=".json,application/json" data-in="importFile" hidden><span class="chev">›</span></label></div>`;
  h += `<div class="small" style="margin:0 4px">I dati restano solo su questo iPhone. Fai un backup ogni tanto: se cancelli i dati di Safari o l'app dalla Home, si perdono.</div>`;
  h += `<h2>Info</h2><div class="card tight small">Forma · app personale<br>Dati esercizi: ExerciseDB (licenza MIT, via exercises-dataset).<br>Immagini e animazioni © Gym visual — gymvisual.com</div>`;
  return h;
};

/* ---------------- sessione di allenamento ---------------- */
function startSession(routine) {
  if (S.activeId) { openSession(); return; }
  const now = Date.now();
  const s = { id: uid(), date: todayKey(), routineId: routine?.id || null, name: routine?.name || 'Allenamento libero', start: now, end: null, exercises: [] };
  if (routine) for (const it of routine.items) s.exercises.push(newSessionEx(it.exId, it, s.id));
  S.sessions.push(s); S.activeId = s.id; save();
  openSession();
}
function newSessionEx(exId, item, sid) {
  const last = lastSetsFor(exId, sid);
  const n = item?.sets || last?.sets.length || 3;
  return { exId, label: item?.label || null, rir: item?.rir || null, note: item?.note || null, kgStart: item?.kg ?? null, rest: item?.rest ?? S.settings.restDefault, repMin: item?.repMin ?? null, repMax: item?.repMax ?? null, sets: Array.from({ length: n }, (_, i) => ({ kg: null, reps: null, t: last?.sets[i]?.t === 'R' ? 'R' : 'N', done: false })) };
}
const kgS = kg => kg ? fmt(kg) : 'CL';
const exName = (x) => x.label || exById(x.exId).n;
function openSession() { unlockAudio(); $('#session').hidden = false; document.body.style.overflow = 'hidden'; keepAwake(true); renderSession(); tick(); }
function hideSession() { $('#session').hidden = true; document.body.style.overflow = ''; render(); tick(); }
function routineItem(s, exId) { const r = S.routines.find(r => r.id === s.routineId); return r?.items.find(i => i.exId === exId); }
function renderSession() {
  const s = activeSession(); const box = $('#session');
  if (!s) { box.hidden = true; return; }
  const rt = S.routines.find(r => r.id === s.routineId);
  let h = `<div class="s-head"><div class="between"><button class="icon-btn" data-a="hideSession">${ic('down')}</button><div class="center grow"><div style="font-weight:700" class="ell">${esc(s.name)}</div><div class="small num" id="elapsed">${mmss((Date.now() - s.start) / 1000)}</div></div><button class="icon-btn" data-a="timerSheet">${ic('timer')}</button><button class="btn primary sm" data-a="finishSession">Fine</button></div></div>`;
  if (rt && rt.note) h += `<details class="card tight" style="margin-bottom:12px"><summary style="font-weight:650">Indicazioni della seduta</summary><div class="small mt" style="color:var(--text);white-space:pre-line">${esc(rt.note)}</div></details>`;
  s.exercises.forEach((ex, ei) => {
    const e = exById(ex.exId), last = lastSetsFor(ex.exId, s.id), item = routineItem(s, ex.exId) || ex;
    const sug = suggestion(item, ex.exId, s.id), note = S.exNotes[ex.exId];
    const tech = item.note || ex.note, rir = item.rir || ex.rir, kgStart = item.kg ?? ex.kgStart;
    const reps = ex.repMin ? `${ex.repMin}${ex.repMax && ex.repMax !== ex.repMin ? '–' + ex.repMax : ''}` : '';
    h += `<div class="ex-card" id="ex${ei}"><div class="ex-top"><button data-a="exInfo" data-id="${ex.exId}">${thumb(e)}</button><div class="grow"><div style="font-weight:700;line-height:1.25">${esc(exName(ex))}</div><div class="small">${ex.sets.length} × ${reps || '?'} · <button class="link" data-a="exRest" data-ei="${ei}">${ic('timer', 2).replace('<svg', '<svg style="width:13px;height:13px;vertical-align:-2px"')} ${mmss(ex.rest)}</button>${rir ? ` · RIR ${esc(rir)}` : ''}</div></div><button class="icon-btn" data-a="exMenu" data-ei="${ei}">${ic('dots')}</button></div>`;
    if (tech) h += `<div class="small mt" style="line-height:1.35">${esc(tech)}</div>`;
    if (last || sug || note) h += `<div class="row wrap mt" style="gap:6px">${last ? `<span class="small">Ultima (${shortDate(last.session.date)}): <span class="num" style="color:var(--text)">${last.sets.map(x => `${kgS(x.kg)}×${x.reps}`).join(' · ')}</span></span>` : ''}${sug ? `<span class="tag acc">↑ ${sug.text}</span>` : ''}${note ? `<span class="tag">📝 ${esc(note)}</span>` : ''}</div>`;
    h += `<div class="sets"><div class="set-h"><span class="center">Serie</span><span class="center">Precedente</span><span class="center">Kg</span><span class="center">Rip</span><span></span></div>`;
    let wn = 0;
    ex.sets.forEach((st, si) => {
      const p = last?.sets[si] || last?.sets[last.sets.length - 1];
      const ph = setPlaceholders(s, ei, si);
      const lbl = st.t === 'N' ? ++wn : st.t;
      const isPR = st.done && st.t !== 'R' && st.pr;
      const prev = p ? `${kgS(p.kg)}×${p.reps}` : kgStart != null ? `${kgStart ? fmt(kgStart) + ' kg' : 'CL'}` : '–';
      h += `<div class="set ${st.done ? 'done' : ''}"><button class="n ${st.t}" data-a="setMenu" data-ei="${ei}" data-si="${si}">${lbl}</button><span class="prev">${prev}${isPR ? `<br><span class="pr">🏆 record</span>` : ''}</span><input inputmode="decimal" data-in="setKg" data-ei="${ei}" data-si="${si}" value="${iv(st.kg)}" placeholder="${ph.kg == null ? 'kg' : ph.kg === 0 ? 'CL' : fmt(ph.kg)}"><input inputmode="numeric" data-in="setReps" data-ei="${ei}" data-si="${si}" value="${iv(st.reps)}" placeholder="${ph.reps == null ? 'rip' : ph.reps}"><button class="chk" data-a="setDone" data-ei="${ei}" data-si="${si}">${ic('check', 3)}</button></div>`;
    });
    h += `</div><button class="btn sm block" data-a="addSet" data-ei="${ei}">${ic('plus')} Aggiungi serie</button></div>`;
  });
  h += `<button class="btn block" data-a="sessionAddEx">${ic('plus')} Aggiungi esercizio</button><button class="btn ghost block mt2 danger" data-a="cancelSession">Annulla allenamento</button>`;
  const st = box.scrollTop; box.innerHTML = h; box.scrollTop = st;
}
function setPlaceholders(s, ei, si) {
  const ex = s.exercises[ei], st = ex.sets[si], last = lastSetsFor(ex.exId, s.id), item = routineItem(s, ex.exId) || ex;
  const sug = suggestion(item, ex.exId, s.id), p = last?.sets[si] || last?.sets[last?.sets.length - 1];
  const kgStart = item.kg ?? ex.kgStart ?? null;
  return { kg: sug && st.t !== 'R' ? sug.kg : p?.kg ?? kgStart, reps: p?.reps ?? ex.repMin ?? ex.repMax ?? null };
}
function completeSet(ei, si) {
  const s = activeSession(), ex = s.exercises[ei], st = ex.sets[si];
  if (st.done) { st.done = false; st.pr = false; save(); renderSession(); return; }
  const ph = setPlaceholders(s, ei, si);
  if (st.kg == null) st.kg = ph.kg ?? 0;
  if (st.reps == null) st.reps = ph.reps;
  if (!st.reps) { toast('Inserisci le ripetizioni'); return; }
  st.done = true; st.at = Date.now();
  // record personale
  if (st.t !== 'R' && st.kg > 0) {
    const prevBest = Math.max(bestE1(ex.exId, s.id), ...ex.sets.filter((x, i) => i !== si && x.done && x.t !== 'R').map(x => e1rm(x.kg, x.reps)), 0);
    const v = e1rm(st.kg, st.reps);
    st.pr = prevBest > 0 && v > prevBest + 0.01;
    if (st.pr) toast(`🏆 Nuovo record su ${esc(exName(ex))}!`, 3000);
  }
  save(); buzz(30);
  const isLast = ex.sets.every(x => x.done) && ei === s.exercises.length - 1;
  if (!isLast) startTimer(ex.rest || S.settings.restDefault);
  renderSession();
}
function finishSession() {
  const s = activeSession(); if (!s) return;
  const done = sessionSets(s);
  if (!done) { confirmSheet('Nessuna serie completata', 'Non hai segnato nessuna serie come fatta. Vuoi eliminare questo allenamento?', 'Elimina allenamento', () => { S.sessions = S.sessions.filter(x => x.id !== s.id); S.activeId = null; save(); stopTimer(); keepAwake(false); hideSession(); }); return; }
  confirmSheet('Terminare l\'allenamento?', 'Le serie non spuntate verranno scartate.', 'Termina e salva', () => {
    s.end = Date.now();
    s.exercises.forEach(ex => ex.sets = ex.sets.filter(x => x.done));
    s.exercises = s.exercises.filter(ex => ex.sets.length);
    S.activeId = null; save(true); stopTimer(); keepAwake(false);
    hideSession();
    showSummary(s);
  }, false);
}
function showSummary(s) {
  const prs = []; s.exercises.forEach(ex => ex.sets.forEach(st => { if (st.pr) prs.push(`${exName(ex)}: ${fmt(st.kg)} kg × ${st.reps}`); }));
  openSheet({ title: 'Allenamento completato 💪', body: () => `<div class="grid3"><div class="card center"><div class="stat md">${dur(s.end - s.start)}</div><div class="small">durata</div></div><div class="card center"><div class="stat md">${sessionSets(s)}</div><div class="small">serie</div></div><div class="card center"><div class="stat md">${fmtInt(sessionVolume(s))}</div><div class="small">kg volume</div></div></div>${prs.length ? `<h2>Nuovi record</h2><div class="list">${prs.map(p => `<div class="li">🏆 <span>${esc(p)}</span></div>`).join('')}</div>` : ''}<button class="btn primary block mt2" data-a="closeSheet">Chiudi</button>` });
}

/* ---------------- sheet specifiche ---------------- */
function routineEditor(id) {
  const orig = S.routines.find(r => r.id === id);
  const r = orig ? JSON.parse(JSON.stringify(orig)) : { id: uid(), name: '', short: '', note: '', days: [], items: [] };
  let saved = false, dirty = false;
  const commit = () => { if (orig) Object.assign(orig, r); else if (!S.routines.includes(r)) S.routines.push(r); saved = true; save(true); };
  const num = (it, f, l, mode = 'numeric') => `<label><span class="small">${l}</span><input class="input" inputmode="${mode}" data-in="rItem" data-i="${it}" data-f="${f}" value="${iv(r.items[it][f])}"></label>`;
  openSheet({
    title: orig ? 'Modifica scheda' : 'Nuova scheda', full: true,
    body: () => `<label class="field"><span>Nome</span><input class="input" data-in="rName" value="${esc(r.name)}" placeholder="Es. Petto e tricipiti"></label>
      <div class="field"><span>Giorni</span><div class="days">${WEEK.map(d => `<button class="day ${r.days.includes(d) ? 'on' : ''}" data-a="rDay" data-d="${d}">${GG[d]}</button>`).join('')}</div></div>
      <label class="field"><span>Indicazioni della seduta (riscaldamento, cardio…)</span><textarea class="input" data-in="rNote" placeholder="Facoltativo">${esc(r.note || '')}</textarea></label>
      <h2>Esercizi</h2>${r.items.length ? '' : '<div class="empty" style="padding:14px">Aggiungi gli esercizi della scheda.</div>'}
      ${r.items.map((it, i) => { const e = exById(it.exId); return `<div class="card tight"><div class="ex-top">${thumb(e)}<div class="grow"><b style="line-height:1.25;display:block">${i + 1}. ${esc(exName(it))}</b><div class="small">${esc(e.n)}</div></div><div style="display:flex;flex-direction:column;gap:4px"><button class="icon-btn" style="height:28px" data-a="rMove" data-i="${i}" data-d="-1">↑</button><button class="icon-btn" style="height:28px" data-a="rMove" data-i="${i}" data-d="1">↓</button></div></div>
        <div class="grid4 mt">${num(i, 'sets', 'Serie')}${num(i, 'repMin', 'Rip. min')}${num(i, 'repMax', 'Rip. max')}${num(i, 'rest', 'Recupero s')}</div>
        <div class="grid2 mt"><label><span class="small">Carico di partenza (kg, 0 = corpo libero)</span><input class="input" inputmode="decimal" data-in="rItem" data-i="${i}" data-f="kg" value="${iv(it.kg)}"></label><label><span class="small">RIR</span><input class="input" data-in="rText" data-i="${i}" data-f="rir" value="${esc(it.rir || '')}" placeholder="Es. 1-2"></label></div>
        <label class="mt" style="display:block"><span class="small">Nome mostrato</span><input class="input" data-in="rText" data-i="${i}" data-f="label" value="${esc(it.label || '')}" placeholder="${esc(e.n)}"></label>
        <label class="mt" style="display:block"><span class="small">Nota tecnica</span><input class="input" data-in="rText" data-i="${i}" data-f="note" value="${esc(it.note || '')}" placeholder="Facoltativa"></label>
        <button class="btn ghost danger sm mt" data-a="rDel" data-i="${i}">Rimuovi</button></div>`; }).join('')}
      <button class="btn block" data-a="rAdd">${ic('plus')} Aggiungi esercizi</button>
      <button class="btn primary block mt2" data-a="rSave">Salva scheda</button>
      ${orig ? `<button class="btn ghost danger block mt" data-a="rDelete">Elimina scheda</button>` : ''}
      <div class="small mt center">Le modifiche si salvano anche se chiudi con la X. Con il range di ripetizioni (es. 8–12) l'app ti suggerisce di aumentare il peso quando completi tutte le serie al massimo.</div>`,
    inputs: {
      rName: el => { r.name = el.value; dirty = true; },
      rNote: el => { r.note = el.value; dirty = true; },
      rText: el => { r.items[+el.dataset.i][el.dataset.f] = el.value.trim() || null; dirty = true; },
      rItem: el => { const it = r.items[+el.dataset.i], v = parseNum(el.value), f = el.dataset.f; it[f] = f === 'sets' ? clamp(Math.round(v || 1), 1, 20) : f === 'rest' ? clamp(Math.round(v ?? 90), 0, 900) : f === 'kg' ? v : v == null ? null : Math.round(v); dirty = true; },
    },
    actions: {
      rDay: (el, ev, sh) => { const d = +el.dataset.d; r.days = r.days.includes(d) ? r.days.filter(x => x !== d) : [...r.days, d]; dirty = true; sh.refresh(); },
      rMove: (el, ev, sh) => { const i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= r.items.length) return; [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; dirty = true; sh.refresh(); },
      rDel: (el, ev, sh) => { r.items.splice(+el.dataset.i, 1); dirty = true; sh.refresh(); },
      rAdd: (el, ev, sh) => exercisePicker(ids => { ids.forEach(id => r.items.push({ exId: id, sets: 3, repMin: 8, repMax: 12, rest: S.settings.restDefault })); dirty = true; sh.refresh(); }),
      rSave: (el, ev, sh) => {
        if (!r.name.trim()) { toast('Dai un nome alla scheda'); return; }
        commit(); sh.close(); refreshAll(); toast('Scheda salvata');
      },
      rDelete: (el, ev, sh) => confirmSheet('Eliminare la scheda?', 'Lo storico degli allenamenti resta salvato.', 'Elimina', () => { saved = true; S.routines = S.routines.filter(x => x.id !== r.id); save(true); sh.close(); refreshAll(); }),
    },
    onClose: () => { if (!saved && dirty && r.name.trim()) { commit(); refreshAll(); toast('Modifiche alla scheda salvate'); } },
  });
}
function exercisePicker(onDone, single) {
  const sel = []; libLimit = 60;
  openSheet({
    title: single ? 'Scegli esercizio' : 'Aggiungi esercizi', full: true,
    body: () => libraryHtml('pick', sel) + (single ? '' : `<div style="position:sticky;bottom:0;padding-top:10px;background:linear-gradient(transparent,var(--surface) 30%)"><button class="btn primary block" data-a="pickDone" ${sel.length ? '' : 'disabled'}>Aggiungi${sel.length ? ` (${sel.length})` : ''}</button></div>`),
    mount: sh => { sh._sel = sel; },
    actions: {
      pickEx: (el, ev, sh) => { const id = el.dataset.id; if (single) { sh.close(); onDone([id]); return; } const i = sel.indexOf(id); i < 0 ? sel.push(id) : sel.splice(i, 1); sh.refresh(); },
      pickDone: (el, ev, sh) => { sh.close(); onDone(sel.slice()); },
    },
  });
}
function exerciseInfo(id) {
  const e = exById(id);
  openSheet({
    title: e.n, full: true,
    body: () => {
      const hist = [];
      for (const s of finished().sort((a, b) => a.start - b.start)) { const ex = s.exercises.find(x => x.exId === id); if (!ex) continue; const ds = doneSets(ex).filter(x => x.t !== 'R'); if (!ds.length) continue; const top = ds.reduce((a, b) => e1rm(b.kg, b.reps) > e1rm(a.kg, a.reps) ? b : a); hist.push({ s, ds, top, e1: e1rm(top.kg, top.reps) }); }
      const best = hist.reduce((a, b) => !a || b.e1 > a.e1 ? b : a, null);
      return `${e.g ? thumb(e, 'lg', true) : ''}<div class="row wrap mt" style="justify-content:center;gap:6px">${[e.b, e.t, e.e].filter(Boolean).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>${e.en ? `<div class="small center mt">${esc(e.en)}</div>` : ''}
      ${best ? `<h2>I tuoi numeri</h2><div class="grid2"><div class="card"><div class="small">Massimale stimato</div><div class="stat md">${fmt(best.e1)}<small>kg</small></div></div><div class="card"><div class="small">Serie migliore</div><div class="stat md">${fmt(best.top.kg)}<small>× ${best.top.reps}</small></div></div></div><div class="card"><div class="small">Massimale stimato per allenamento</div><div class="chart" id="chEx"></div></div><div class="list">${hist.slice(-6).reverse().map(x => `<div class="li"><div class="grow"><div>${relDate(x.s.date)}</div><div class="small num">${x.ds.map(d => `${kgS(d.kg)}×${d.reps}`).join(' · ')}</div></div></div>`).join('')}</div>` : ''}
      <label class="field mt2"><span>Le tue note (regolazioni macchina, presa…)</span><textarea class="input" data-in="exNote" placeholder="Es. sedile al 4, schienale al 2">${esc(S.exNotes[id] || '')}</textarea></label>
      ${e.s && e.s.length ? `<h2>Esecuzione</h2><ol class="steps">${e.s.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
      ${e.g ? `<div class="credit">Animazione © Gym visual — gymvisual.com</div>` : ''}
      ${e.custom ? `<button class="btn ghost danger block mt" data-a="delCustom">Elimina esercizio personalizzato</button>` : ''}`;
    },
    mount: () => {
      const pts = []; for (const s of finished()) { const ex = s.exercises.find(x => x.exId === id); if (!ex) continue; const v = Math.max(0, ...doneSets(ex).filter(x => x.t !== 'R').map(x => e1rm(x.kg, x.reps))); if (v) pts.push({ x: s.start, y: v }); }
      pts.sort((a, b) => a.x - b.x); const c = document.getElementById('chEx'); if (c) drawChart(c, { pts, unit: 'kg', h: 150 });
    },
    inputs: { exNote: el => { const v = el.value.trim(); if (v) S.exNotes[id] = v; else delete S.exNotes[id]; save(); } },
    actions: { delCustom: (el, ev, sh) => confirmSheet('Eliminare l\'esercizio?', 'Verrà tolto dalla libreria.', 'Elimina', () => { S.customEx = S.customEx.filter(x => x.id !== id); save(); sh.close(); refreshAll(); }) },
  });
}
function customExSheet() {
  const e = { id: 'c' + uid(), n: ui.libQ.trim(), b: 'Petto', t: '', e: 'Macchina', s: [], custom: true };
  const parts = ['Petto', 'Schiena', 'Spalle', 'Braccia', 'Gambe', 'Polpacci', 'Addome', 'Avambracci', 'Cardio'];
  openSheet({
    title: 'Nuovo esercizio', focus: 'input',
    body: () => `<label class="field"><span>Nome</span><input class="input" data-in="n" value="${esc(e.n)}" placeholder="Es. Chest press Technogym"></label><div class="field"><span>Zona</span><div class="row wrap" style="gap:6px">${parts.map(p => `<button class="chip ${e.b === p ? 'on' : ''}" data-a="part" data-v="${p}">${p}</button>`).join('')}</div></div><label class="field"><span>Muscolo principale</span><input class="input" data-in="t" value="${esc(e.t)}" placeholder="Es. Pettorali"></label><label class="field"><span>Attrezzo</span><input class="input" data-in="e" value="${esc(e.e)}"></label><button class="btn primary block" data-a="saveEx">Crea esercizio</button>`,
    inputs: { n: el => e.n = el.value, t: el => e.t = el.value, e: el => e.e = el.value },
    actions: { part: (el, ev, sh) => { e.b = el.dataset.v; sh.refresh(); }, saveEx: (el, ev, sh) => { if (!e.n.trim()) return toast('Inserisci il nome'); e.t = e.t || e.b; S.customEx.unshift(e); save(); sh.close(); ui.libQ = ''; ui.libFilter = 'Miei'; refreshAll(); toast('Esercizio creato'); } },
  });
}
function bodySheet(k) {
  const b = { ...(S.body[k] || {}) };
  const field = (f, label, unit) => `<label class="field"><span>${label}</span><div class="unit-wrap"><input class="input" inputmode="decimal" data-in="bf" data-f="${f}" value="${iv(b[f])}" placeholder="–"><span class="unit">${unit}</span></div></label>`;
  openSheet({
    title: relDate(k),
    body: () => `<label class="field"><span>Data</span><input class="input" type="date" data-in="bdate" value="${k}" max="${todayKey()}"></label>
      <label class="field"><span>Peso al risveglio</span><div class="unit-wrap"><input class="input big" inputmode="decimal" data-in="bf" data-f="w" value="${iv(b.w)}" placeholder="–"><span class="unit">kg</span></div></label>
      <div class="grid2">${field('waist', 'Girovita (ombelico)', 'cm')}${field('bicep', 'Bicipite', 'cm')}</div>
      <div class="grid2">${field('steps', 'Passi (facoltativo)', '')}${field('neck', 'Collo (facoltativo)', 'cm')}</div>
      <div class="small" style="margin:-4px 2px 12px">Bicipite: contratto, stesso lato. Girovita: metro parallelo al pavimento, all'ombelico, dopo una normale espirazione. Con collo e altezza calcolo la massa grassa stimata.</div>
      <button class="btn primary block" data-a="bSave">Salva</button>${S.body[k] ? `<button class="btn ghost danger block mt" data-a="bDel">Elimina giorno</button>` : ''}`,
    inputs: { bf: el => b[el.dataset.f] = parseNum(el.value), bdate: (el, sh) => { if (el.value) { sh.close(); bodySheet(el.value); } } },
    actions: {
      bSave: (el, ev, sh) => { $$('[data-in="bf"]', sh.el).forEach(i => b[i.dataset.f] = parseNum(i.value)); const clean = Object.fromEntries(Object.entries(b).filter(([, v]) => v != null)); if (Object.keys(clean).length) S.body[k] = clean; else delete S.body[k]; save(); sh.close(); refreshAll(); toast('Salvato'); },
      bDel: (el, ev, sh) => { delete S.body[k]; save(); sh.close(); refreshAll(); },
    },
  });
}
function timerSheet() {
  let custom = '';
  openSheet({
    title: 'Timer recupero',
    body: () => `<div class="grid3">${[30, 45, 60, 90, 120, 150, 180, 240, 300].map(s => `<button class="btn" data-a="go" data-s="${s}">${mmss(s)}</button>`).join('')}</div><div class="row mt"><div class="unit-wrap grow"><input class="input" inputmode="numeric" data-in="cs" placeholder="Secondi"><span class="unit">s</span></div><button class="btn primary" data-a="goCustom">Avvia</button></div>${T ? `<button class="btn ghost danger block mt" data-a="stop">Ferma timer in corso</button>` : ''}<div class="small mt">Il suono funziona con l'app aperta e lo schermo acceso: durante l'allenamento lo schermo resta acceso in automatico. Se chiudi l'app, al rientro il conto è comunque corretto.</div>`,
    inputs: { cs: el => custom = el.value },
    actions: { go: (el, ev, sh) => { startTimer(+el.dataset.s); sh.close(); }, goCustom: (el, ev, sh) => { const v = parseNum(custom); if (v > 0) { startTimer(v); sh.close(); } }, stop: (el, ev, sh) => { stopTimer(); sh.close(); } },
  });
}
function targetsSheet() {
  const t = JSON.parse(JSON.stringify(S.settings.targets || { train: { kcal: null, p: null, c: null, f: null }, rest: { kcal: null, p: null, c: null, f: null } }));
  const col = w => `<div class="card"><b>${w === 'train' ? 'Giorni di allenamento' : 'Giorni di riposo'}</b><div class="grid2 mt">${[['kcal', 'Calorie', 'kcal'], ['p', 'Proteine', 'g'], ['c', 'Carboidrati', 'g'], ['f', 'Grassi', 'g']].map(([f, l, u]) => `<label class="field"><span>${l}</span><div class="unit-wrap"><input class="input" inputmode="numeric" data-in="tg" data-w="${w}" data-f="${f}" value="${iv(t[w][f])}"><span class="unit">${u}</span></div></label>`).join('')}</div><div class="small" id="mk-${w}"></div></div>`;
  const upd = sh => ['train', 'rest'].forEach(w => { const x = t[w], m = (x.p || 0) * 4 + (x.c || 0) * 4 + (x.f || 0) * 9; const el = $('#mk-' + w, sh.el); if (el) el.textContent = m ? `Dai macro risultano ${fmtInt(m)} kcal` : ''; });
  openSheet({
    title: 'Obiettivi dieta', full: true,
    body: () => `<div class="small" style="margin-bottom:12px">Un giorno conta come "allenamento" se ha una scheda in programma o se ti sei allenato.</div>${col('train')}${col('rest')}<button class="btn block" data-a="same">Usa gli stessi valori per il riposo</button><button class="btn primary block mt" data-a="saveT">Salva obiettivi</button>`,
    mount: upd,
    inputs: { tg: (el, sh) => { t[el.dataset.w][el.dataset.f] = parseNum(el.value); upd(sh); } },
    actions: { same: (el, ev, sh) => { t.rest = { ...t.train }; sh.refresh(); }, saveT: (el, ev, sh) => { for (const w of ['train', 'rest']) { const x = t[w]; if (!x.kcal && (x.p || x.c || x.f)) x.kcal = Math.round((x.p || 0) * 4 + (x.c || 0) * 4 + (x.f || 0) * 9); } if (!t.train.kcal) return toast('Inserisci almeno le calorie'); if (!t.rest.kcal) t.rest = { ...t.train }; S.settings.targets = t; save(); sh.close(); refreshAll(); toast('Obiettivi salvati'); } },
  });
}
function profileSheet() {
  const st = S.settings;
  const f = (k, l, u, mode = 'decimal') => `<label class="field"><span>${l}</span><div class="unit-wrap"><input class="input" inputmode="${mode}" data-in="ps" data-f="${k}" value="${iv(st[k])}"><span class="unit">${u}</span></div></label>`;
  openSheet({
    title: 'Profilo e allenamento',
    body: () => `${f('height', 'Altezza', 'cm', 'numeric')}<div class="grid2">${f('restDefault', 'Recupero predefinito', 's', 'numeric')}${f('inc', 'Incremento peso', 'kg')}</div><div class="grid2">${f('barKg', 'Peso bilanciere', 'kg')}${f('waterTarget', 'Obiettivo acqua', 'bicch.', 'numeric')}</div><div class="li tap" style="padding:12px 0" data-a="snd"><div class="grow">Suono a fine recupero</div><span class="check ${st.sound ? 'on' : ''}">${st.sound ? ic('check', 3) : ''}</span></div><button class="btn block mt" data-a="test">Prova il suono</button>`,
    inputs: { ps: el => { const v = parseNum(el.value); st[el.dataset.f] = v; save(); } },
    actions: { snd: (el, ev, sh) => { st.sound = !st.sound; save(); sh.refresh(); }, test: () => { unlockAudio(); setTimeout(() => beep(), 50); } },
    onClose: () => { st.restDefault = st.restDefault || 90; st.inc = st.inc || 2.5; st.barKg = st.barKg ?? 20; st.waterTarget = st.waterTarget || 8; save(); refreshAll(); },
  });
}
function suppSheet() {
  let nv = '';
  openSheet({
    title: 'Integratori',
    body: () => `<div class="list">${S.settings.supplements.map((s, i) => `<div class="li"><div class="grow">${esc(s)}</div><button class="btn ghost danger sm" data-a="del" data-i="${i}">Rimuovi</button></div>`).join('') || '<div class="empty">Nessun integratore</div>'}</div><div class="row"><input class="input grow" data-in="nv" placeholder="Es. Omega 3, Vitamina D"><button class="btn primary" data-a="add">Aggiungi</button></div>`,
    inputs: { nv: el => nv = el.value },
    actions: { del: (el, ev, sh) => { S.settings.supplements.splice(+el.dataset.i, 1); save(); sh.refresh(); refreshAll(); }, add: (el, ev, sh) => { if (!nv.trim()) return; S.settings.supplements.push(nv.trim()); nv = ''; save(); sh.refresh(); refreshAll(); } },
  });
}
function platesSheet() {
  let target = '', bar = S.settings.barKg ?? 20;
  const calc = () => {
    const t = parseNum(target); if (!t) return '';
    let side = (t - bar) / 2; if (side < 0) return `<div class="empty">Il peso è inferiore al bilanciere.</div>`;
    const out = []; for (const p of S.settings.plates) while (side >= p - 1e-9) { out.push(p); side -= p; }
    const vis = out.map(p => `<div class="plate" style="width:${p >= 15 ? 22 : p >= 5 ? 18 : 14}px;height:${40 + p * 3.2}px">${fmt(p, 2)}</div>`).join('');
    return `<div class="plates"><div class="barbell"></div>${vis}</div><div class="center"><b>Per lato:</b> <span class="num">${out.length ? out.map(p => fmt(p, 2)).join(' + ') : 'nessun disco'}</span>${side > 0.01 ? `<div class="small" style="color:var(--warn)">Mancano ${fmt(side * 2, 2)} kg per arrivare esatti</div>` : ''}</div>`;
  };
  openSheet({
    title: 'Calcolatore dischi', focus: 'input',
    body: () => `<div class="grid2"><label class="field"><span>Peso totale</span><div class="unit-wrap"><input class="input" inputmode="decimal" data-in="t" value="${target}"><span class="unit">kg</span></div></label><label class="field"><span>Bilanciere</span><div class="unit-wrap"><input class="input" inputmode="decimal" data-in="b" value="${iv(bar)}"><span class="unit">kg</span></div></label></div><div id="plOut">${calc()}</div>`,
    inputs: { t: (el, sh) => { target = el.value; $('#plOut', sh.el).innerHTML = calc(); }, b: (el, sh) => { bar = parseNum(el.value) || 0; $('#plOut', sh.el).innerHTML = calc(); } },
  });
}

/* --- cibo --- */
function addFoodSheet(meal, k, sink, title) {
  sink = sink || (items => { const d = dayDiary(k, true); items.forEach(it => { d.items.push({ id: uid(), meal, ...it }); if (it.foodId) S.foodUse[it.foodId] = Date.now(); }); save(); });
  let mode = 'alimenti', q = '';
  const label = MEALS.find(m => m[0] === meal)[1];
  const quick = { name: '', kcal: null, p: null, c: null, f: null };
  const list = () => {
    const nq = norm(q.trim());
    const foods = S.foods.filter(f => !nq || norm(f.name).includes(nq)).sort((a, b) => (S.foodUse[b.id] || 0) - (S.foodUse[a.id] || 0) || a.name.localeCompare(b.name));
    return `<div class="list">${foods.map(f => `<div class="li tap" data-a="pickFood" data-id="${f.id}"><div class="grow"><div class="ell">${esc(f.name)}</div><div class="small num">${perLbl(f.unit)} · ${fmtInt(f.kcal)} kcal · P ${fmt(f.p)} · C ${fmt(f.c)} · G ${fmt(f.f)}</div></div><span class="chev">›</span></div>`).join('') || '<div class="empty">Nessun alimento trovato</div>'}</div>`;
  };
  openSheet({
    title: title || `Aggiungi a ${label}`, full: true,
    body: () => `<div class="seg">${[['alimenti', 'Alimenti'], ['pasti', 'Pasti salvati'], ['rapido', 'Rapido']].map(([v, l]) => `<button class="${mode === v ? 'on' : ''}" data-a="mode" data-v="${v}">${l}</button>`).join('')}</div>` + (
      mode === 'alimenti' ? `<input class="input" data-in="q" placeholder="Cerca alimento" value="${esc(q)}" style="margin-bottom:10px"><button class="btn block" data-a="newFood" style="margin-bottom:12px">${ic('plus')} Nuovo alimento</button><div id="fl">${list()}</div>`
        : mode === 'pasti' ? (S.templates.length ? `<div class="list">${S.templates.map(t => `<div class="li tap" data-a="useTpl" data-id="${t.id}"><div class="grow"><div>${esc(t.name)}</div><div class="small">${t.items.length} alimenti · ${fmtInt(totals(t.items).kcal)} kcal</div></div><span class="chev">›</span></div>`).join('')}</div>` : `<div class="empty">Nessun pasto salvato.<br>Dal menu ⋯ di un pasto scegli "Salva come pasto" per riusarlo con un tocco.</div>`)
          : `<label class="field"><span>Descrizione</span><input class="input" data-in="qn" placeholder="Es. Pizza margherita" value="${esc(quick.name)}"></label><div class="grid2">${[['kcal', 'Calorie', 'kcal'], ['p', 'Proteine', 'g'], ['c', 'Carboidrati', 'g'], ['f', 'Grassi', 'g']].map(([f, l, u]) => `<label class="field"><span>${l}</span><div class="unit-wrap"><input class="input" inputmode="decimal" data-in="qv" data-f="${f}" value="${iv(quick[f])}"><span class="unit">${u}</span></div></label>`).join('')}</div><button class="btn primary block" data-a="addQuick">Aggiungi</button>`),
    inputs: { q: (el, sh) => { q = el.value; $('#fl', sh.el).innerHTML = list(); }, qn: el => quick.name = el.value, qv: el => quick[el.dataset.f] = parseNum(el.value) },
    actions: {
      mode: (el, ev, sh) => { mode = el.dataset.v; sh.refresh(); },
      pickFood: (el, ev, sh) => { const food = S.foods.find(f => f.id === el.dataset.id); qtySheet(food, null, qty => { sink([{ foodId: food.id, name: food.name, qty, unit: food.unit, ...foodCalc(food, qty) }]); sh.close(); refreshAll(); toast('Aggiunto'); }); },
      newFood: (el, ev, sh) => foodEditor(null, f => { sh.refresh(); }, q),
      useTpl: (el, ev, sh) => { const t = S.templates.find(x => x.id === el.dataset.id); sink(t.items.map(i => ({ ...i }))); sh.close(); refreshAll(); toast(`${esc(t.name)} aggiunto`); },
      addQuick: (el, ev, sh) => { if (!quick.kcal && !quick.p && !quick.c && !quick.f) return toast('Inserisci almeno le calorie'); const kc = quick.kcal ?? Math.round((quick.p || 0) * 4 + (quick.c || 0) * 4 + (quick.f || 0) * 9); sink([{ foodId: null, name: quick.name.trim() || 'Aggiunta rapida', qty: 1, unit: 'pz', kcal: kc, p: quick.p || 0, c: quick.c || 0, f: quick.f || 0 }]); sh.close(); refreshAll(); },
    },
  });
}
function qtySheet(food, cur, onOk, onDel, delLabel = 'Rimuovi dal diario') {
  let qty = cur ?? (food.unit === 'pz' ? 1 : 100);
  const chips = food.unit === 'pz' ? [1, 2, 3, 4] : food.unit === 'ml' ? [100, 200, 250, 300] : [50, 100, 150, 200];
  const prev = () => { const v = foodCalc(food, parseNum(qty) || 0); return `<div class="grid4 center mt">${[['kcal', 'kcal', ''], ['p', 'Prot.', 'g'], ['c', 'Carb.', 'g'], ['f', 'Grassi', 'g']].map(([k, l]) => `<div class="card tight"><div class="num" style="font-weight:700;font-size:18px">${fmtInt(v[k])}</div><div class="small">${l}</div></div>`).join('')}</div>`; };
  openSheet({
    title: food.name, focus: 'input',
    body: () => `<div class="unit-wrap"><input class="input big" inputmode="decimal" data-in="qty" value="${iv(qty)}"><span class="unit">${food.unit === 'pz' ? 'pezzi' : unitLbl(food.unit)}</span></div><div class="row mt" style="gap:6px">${chips.map(v => `<button class="chip grow" data-a="set" data-v="${v}">${v}${food.unit === 'pz' ? '' : ' ' + unitLbl(food.unit)}</button>`).join('')}</div><div id="qp">${prev()}</div><button class="btn primary block mt" data-a="ok">${cur != null ? 'Salva' : 'Aggiungi'}</button>${onDel ? `<button class="btn ghost danger block mt" data-a="del">${delLabel}</button>` : ''}`,
    inputs: { qty: (el, sh) => { qty = el.value; $('#qp', sh.el).innerHTML = prev(); } },
    actions: { set: (el, ev, sh) => { qty = el.dataset.v; sh.refresh(); }, ok: (el, ev, sh) => { const v = parseNum(qty); if (!v || v <= 0) return toast('Quantità non valida'); sh.close(); onOk(v); }, del: (el, ev, sh) => { sh.close(); onDel(); } },
  });
}
function foodEditor(id, onSave, presetName) {
  const orig = S.foods.find(f => f.id === id);
  const f = orig ? { ...orig } : { id: 'u' + uid(), name: presetName || '', unit: 'g', kcal: null, p: null, c: null, f: null };
  openSheet({
    title: orig ? 'Modifica alimento' : 'Nuovo alimento', focus: orig ? null : 'input',
    body: () => `<label class="field"><span>Nome</span><input class="input" data-in="n" value="${esc(f.name)}" placeholder="Es. Yogurt greco Fage 0%"></label><div class="field"><span>Valori riferiti a</span><div class="seg" style="margin:0"><button class="${f.unit === 'g' ? 'on' : ''}" data-a="unit" data-v="g">100 g</button><button class="${f.unit === 'ml' ? 'on' : ''}" data-a="unit" data-v="ml">100 ml</button><button class="${f.unit === 'pz' ? 'on' : ''}" data-a="unit" data-v="pz">1 pezzo</button></div></div><div class="grid2">${[['kcal', 'Calorie', 'kcal'], ['p', 'Proteine', 'g'], ['c', 'Carboidrati', 'g'], ['f', 'Grassi', 'g']].map(([k, l, u]) => `<label class="field"><span>${l}</span><div class="unit-wrap"><input class="input" inputmode="decimal" data-in="v" data-f="${k}" value="${iv(f[k])}"><span class="unit">${u}</span></div></label>`).join('')}</div><div class="small" style="margin-bottom:12px">Copia i valori dall'etichetta nutrizionale. Se lasci vuote le calorie le calcolo dai macro.</div><button class="btn primary block" data-a="save">Salva alimento</button>${orig ? `<button class="btn ghost danger block mt" data-a="del">Elimina alimento</button>` : ''}`,
    inputs: { n: el => f.name = el.value, v: el => f[el.dataset.f] = parseNum(el.value) },
    actions: {
      unit: (el, ev, sh) => { f.unit = el.dataset.v; sh.refresh(); },
      save: (el, ev, sh) => { if (!f.name.trim()) return toast('Inserisci il nome'); f.p = f.p || 0; f.c = f.c || 0; f.f = f.f || 0; if (f.kcal == null) f.kcal = Math.round(f.p * 4 + f.c * 4 + f.f * 9); f.name = f.name.trim(); delete f.seed; if (orig) Object.assign(orig, f); else S.foods.push(f); save(); sh.close(); onSave && onSave(f); toast('Alimento salvato'); },
      del: (el, ev, sh) => confirmSheet('Eliminare l\'alimento?', 'Le voci già nel diario restano.', 'Elimina', () => { S.foods = S.foods.filter(x => x.id !== f.id); save(); sh.close(); onSave && onSave(); }),
    },
  });
}
function planSheet(dow) {
  S.mealPlan = S.mealPlan || {};
  const day = () => (S.mealPlan[dow] = S.mealPlan[dow] || {});
  openSheet({
    title: 'Piano alimentare', full: true,
    body: () => {
      const all = MEALS.flatMap(([m]) => (day()[m] || []).map(it => freshItem(it))), t = totals(all);
      return `<div class="days" style="margin-bottom:6px">${WEEK.map(d => `<button class="day ${d === dow ? 'on' : ''}" data-a="pDay" data-d="${d}">${GG[d]}</button>`).join('')}</div>
      <div class="between" style="margin:12px 2px"><b>${GIORNI[dow]}</b><span class="small num">≈ ${fmtInt(t.kcal)} kcal · P ${fmtInt(t.p)} · C ${fmtInt(t.c)} · G ${fmtInt(t.f)}</span></div>
      ${MEALS.map(([m, l]) => { const list = day()[m] || [], mt = totals(list.map(it => freshItem(it))); return `<div class="list"><div class="li" style="min-height:46px"><div class="grow"><b>${l}</b>${list.length ? ` <span class="small num">· ${fmtInt(mt.kcal)} kcal</span>` : ''}</div><button class="icon-btn" style="background:var(--accent);color:var(--accent-ink)" data-a="pAdd" data-m="${m}">${ic('plus', 2.6)}</button></div>${list.map((it, i) => { const f = freshItem(it); return `<div class="li tap" data-a="pEdit" data-m="${m}" data-i="${i}"><div class="grow"><div class="ell">${esc(f.name)}</div><div class="small num">${qtyLbl(it.qty, it.unit)} · P ${fmtInt(f.p)} · C ${fmtInt(f.c)} · G ${fmtInt(f.f)}</div></div><b class="num">${fmtInt(f.kcal)}</b></div>`; }).join('')}</div>`; }).join('')}
      <div class="small">Il piano è il tuo menù tipo: nella sezione Dieta, per ogni pasto ancora vuoto, ti propone queste voci e le registri con un tocco. Le modifiche qui si salvano subito.</div>`;
    },
    actions: {
      pDay: (el, ev, sh) => { dow = +el.dataset.d; sh.refresh(); },
      pAdd: (el, ev, sh) => { const m = el.dataset.m; addFoodSheet(m, null, items => { day()[m] = (day()[m] || []).concat(items.map(i => ({ ...i }))); save(); sh.refresh(); }, `Piano · ${GIORNI[dow]} · ${MEALS.find(x => x[0] === m)[1]}`); },
      pEdit: (el, ev, sh) => {
        const m = el.dataset.m, i = +el.dataset.i, it = day()[m][i], f = freshItem(it), food = S.foods.find(x => x.id === it.foodId);
        const base = food || { name: it.name, unit: it.unit, kcal: f.kcal / it.qty * (it.unit === 'pz' ? 1 : 100), p: f.p / it.qty * (it.unit === 'pz' ? 1 : 100), c: f.c / it.qty * (it.unit === 'pz' ? 1 : 100), f: f.f / it.qty * (it.unit === 'pz' ? 1 : 100) };
        qtySheet(base, it.qty, qty => { day()[m][i] = freshItem(it, qty); save(); sh.refresh(); }, () => { day()[m].splice(i, 1); save(); sh.refresh(); }, 'Togli dal piano');
      },
    },
    onClose: () => refreshAll(),
  });
}
function foodsSheet() {
  openSheet({
    title: 'I miei alimenti', full: true,
    body: () => `<button class="btn primary block" data-a="nf">${ic('plus')} Nuovo alimento</button><div class="small mt">Gli alimenti di partenza hanno valori indicativi: modificali con quelli delle etichette dei prodotti che usi.</div><h2>Alimenti</h2><div class="list">${S.foods.slice().sort((a, b) => a.name.localeCompare(b.name)).map(f => `<div class="li tap" data-a="ef" data-id="${f.id}"><div class="grow"><div class="ell">${esc(f.name)}</div><div class="small num">${f.unit === 'pz' ? '1 pz' : '100 ' + unitLbl(f.unit)} · ${fmtInt(f.kcal)} kcal · P ${fmt(f.p)} · C ${fmt(f.c)} · G ${fmt(f.f)}</div></div><span class="chev">›</span></div>`).join('')}</div>${S.templates.length ? `<h2>Pasti salvati</h2><div class="list">${S.templates.map(t => `<div class="li"><div class="grow"><div>${esc(t.name)}</div><div class="small">${fmtInt(totals(t.items).kcal)} kcal</div></div><button class="btn ghost danger sm" data-a="dt" data-id="${t.id}">Elimina</button></div>`).join('')}</div>` : ''}`,
    actions: { nf: (el, ev, sh) => foodEditor(null, () => sh.refresh()), ef: (el, ev, sh) => foodEditor(el.dataset.id, () => sh.refresh()), dt: (el, ev, sh) => { S.templates = S.templates.filter(t => t.id !== el.dataset.id); save(); sh.refresh(); } },
  });
}

/* ---------------- backup ---------------- */
async function exportData() {
  S.lastBackup = Date.now(); save(true);
  const name = `forma-backup-${todayKey()}.json`, blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  try { const file = new File([blob], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Backup Forma' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result); if (!d || !d.settings || !Array.isArray(d.sessions)) throw 0;
      confirmSheet('Ripristinare il backup?', `I dati attuali verranno sostituiti con quelli del file (${d.sessions.length} allenamenti, ${Object.keys(d.body || {}).length} giorni di misure).`, 'Ripristina', () => { S = Object.assign(defaultState(), d); save(true); refreshAll(); toast('Backup ripristinato'); });
    } catch { toast('File non valido'); }
  };
  r.readAsText(file);
}

/* ---------------- azioni globali ---------------- */
function refreshAll() { render(); if (!$('#session').hidden) renderSession(); sheets.forEach(s => s.refresh()); }
const A = {
  tab: el => go(el.dataset.t),
  seg: el => { ui[el.dataset.s] = el.dataset.v; libLimit = 60; render(); },
  range: el => { ui.range = el.dataset.v === 'all' ? 'all' : +el.dataset.v; render(); },
  closeSheet: () => closeSheet(),
  hideInstall: () => { S.settings.installHidden = true; save(); render(); },
  openSession, hideSession,
  startRoutine: el => startSession(S.routines.find(r => r.id === el.dataset.id)),
  freeWorkout: () => startSession(null),
  editRoutine: el => routineEditor(el.dataset.id),
  sessionDetail: el => sessionDetail(el.dataset.id),
  exInfo: el => exerciseInfo(el.dataset.id),
  libFilter: el => { ui.libFilter = el.dataset.v; libLimit = 60; refreshLib(); },
  libMore: () => { libLimit += 80; refreshLib(); },
  customEx: () => customExSheet(),
  timerSheet, targetsSheet, profileSheet, suppSheet, platesSheet, foodsSheet, exportData,
  timerStop: () => stopTimer(),
  timerPlus: el => adjustTimer(+el.dataset.d),
  editBody: el => bodySheet(el.dataset.k),
  quickWeight: () => { const v = parseNum($('#qw').value); if (!v || v < 20 || v > 400) return toast('Peso non valido'); const k = todayKey(); S.body[k] = { ...(S.body[k] || {}), w: v }; save(); render(); toast('Peso salvato'); },
  quickMeasure: () => { const k = todayKey(), wa = parseNum($('#qwaist').value), bi = parseNum($('#qbicep').value); if (wa == null && bi == null) return toast('Inserisci almeno una misura'); const b = { ...(S.body[k] || {}) }; if (wa != null) b.waist = wa; if (bi != null) b.bicep = bi; S.body[k] = b; save(); render(); toast('Misure salvate'); },
  water: el => { const d = dayDiary(el.dataset.k, true); d.water = (d.water || 0) + +el.dataset.d; save(); render(); },
  waterSet: el => { const d = dayDiary(ui.dietDate, true), n = +el.dataset.n; d.water = d.water === n ? n - 1 : n; save(); render(); },
  supp: el => { const d = dayDiary(ui.dietDate, true); d.supps = d.supps || {}; d.supps[el.dataset.s] = !d.supps[el.dataset.s]; save(); render(); },
  dietDay: el => { ui.dietDate = addDays(ui.dietDate, +el.dataset.d); render(); },
  addFood: el => addFoodSheet(el.dataset.m, ui.dietDate),
  planEat: el => { eatPlan(ui.dietDate, el.dataset.m); render(); toast('Segnato come da piano'); },
  planEatDay: () => { MEALS.forEach(([m]) => { if (!dayDiary(ui.dietDate).items.some(i => i.meal === m)) eatPlan(ui.dietDate, m); }); render(); toast('Giornata segnata come da piano'); },
  planSheet: () => planSheet(fromKey(ui.dietDate).getDay()),
  planSheetAll: () => planSheet(new Date().getDay()),
  editItem: el => {
    const k = ui.dietDate, d = dayDiary(k), it = d.items.find(i => i.id === el.dataset.id), food = S.foods.find(f => f.id === it.foodId);
    const pseudo = food || { name: it.name, unit: it.unit, kcal: it.kcal / it.qty * (it.unit === 'pz' ? 1 : 100), p: it.p / it.qty * (it.unit === 'pz' ? 1 : 100), c: it.c / it.qty * (it.unit === 'pz' ? 1 : 100), f: it.f / it.qty * (it.unit === 'pz' ? 1 : 100) };
    qtySheet({ ...pseudo, unit: it.unit }, it.qty, qty => { Object.assign(it, { qty }, foodCalc({ ...pseudo, unit: it.unit }, qty)); save(); render(); }, () => { d.items = d.items.filter(i => i !== it); save(); render(); });
  },
  mealMenu: el => {
    const m = el.dataset.m, k = ui.dietDate, label = MEALS.find(x => x[0] === m)[1];
    openSheet({
      title: label, body: () => `<div class="list"><div class="li tap" data-a="tpl">Salva come pasto riutilizzabile</div><div class="li tap" data-a="cp">Copia ${label.toLowerCase()} di ieri</div><div class="li tap" data-a="clr" style="color:var(--danger)">Svuota ${label.toLowerCase()}</div></div>`,
      actions: {
        tpl: (e, ev, sh) => { const items = dayDiary(k).items.filter(i => i.meal === m); if (!items.length) return toast('Il pasto è vuoto'); sh.close(); let name = `${label} ${shortDate(k)}`; openSheet({ title: 'Nome del pasto', focus: 'input', body: () => `<input class="input" data-in="n" value="${esc(name)}"><button class="btn primary block mt" data-a="ok">Salva</button>`, inputs: { n: x => name = x.value }, actions: { ok: (x, ev2, sh2) => { S.templates.push({ id: uid(), name: name.trim() || label, items: items.map(({ id, meal, ...r }) => r) }); save(); sh2.close(); toast('Pasto salvato'); } } }); },
        cp: (e, ev, sh) => { const y = dayDiary(addDays(k, -1)).items.filter(i => i.meal === m); if (!y.length) return toast('Ieri non c\'era nulla'); const d = dayDiary(k, true); y.forEach(i => d.items.push({ ...i, id: uid() })); save(); sh.close(); render(); },
        clr: (e, ev, sh) => { const d = dayDiary(k, true); d.items = d.items.filter(i => i.meal !== m); save(); sh.close(); render(); },
      },
    });
  },
  copyDay: () => { const k = ui.dietDate, y = dayDiary(addDays(k, -1)), d = dayDiary(k, true); y.items.forEach(i => d.items.push({ ...i, id: uid() })); save(); render(); toast('Giornata copiata'); },
  // sessione
  setDone: el => completeSet(+el.dataset.ei, +el.dataset.si),
  addSet: el => { const s = activeSession(), ex = s.exercises[+el.dataset.ei]; ex.sets.push({ kg: null, reps: null, t: 'N', done: false }); save(); renderSession(); },
  setMenu: el => {
    const s = activeSession(), ex = s.exercises[+el.dataset.ei], si = +el.dataset.si, st = ex.sets[si];
    const types = [['N', 'Normale', 'Serie di lavoro'], ['R', 'Riscaldamento', 'Non conta per record e volume'], ['D', 'Drop set', 'Scalata di peso subito dopo'], ['C', 'A cedimento', 'Fino a non riuscire più']];
    openSheet({ title: `Serie ${si + 1}`, body: () => `<div class="list">${types.map(([t, l, d]) => `<div class="li tap" data-a="t" data-t="${t}"><span class="check ${st.t === t ? 'on' : ''}">${st.t === t ? ic('check', 3) : ''}</span><div class="grow"><div>${l}</div><div class="small">${d}</div></div></div>`).join('')}</div><button class="btn ghost danger block" data-a="del">Elimina serie</button>`, actions: { t: (e, ev, sh) => { st.t = e.dataset.t; save(); sh.close(); renderSession(); }, del: (e, ev, sh) => { ex.sets.splice(si, 1); save(); sh.close(); renderSession(); } } });
  },
  exRest: el => {
    const s = activeSession(), ex = s.exercises[+el.dataset.ei];
    openSheet({ title: 'Recupero per questo esercizio', body: () => `<div class="grid3">${[45, 60, 75, 90, 120, 150, 180, 240, 300].map(v => `<button class="btn ${ex.rest === v ? 'primary' : ''}" data-a="v" data-v="${v}">${mmss(v)}</button>`).join('')}</div>${s.routineId ? `<div class="li tap mt" data-a="persist" style="padding:12px 0"><div class="grow small">Salva anche nella scheda</div></div>` : ''}`, actions: { v: (e, ev, sh) => { ex.rest = +e.dataset.v; save(); sh.refresh(); renderSession(); }, persist: (e, ev, sh) => { const it = routineItem(s, ex.exId); if (it) { it.rest = ex.rest; save(); toast('Salvato nella scheda'); } sh.close(); } } });
  },
  exMenu: el => {
    const s = activeSession(), ei = +el.dataset.ei, ex = s.exercises[ei];
    openSheet({
      title: exName(ex), body: () => `<div class="list"><div class="li tap" data-a="info">Esecuzione e statistiche</div><div class="li tap" data-a="up">Sposta su</div><div class="li tap" data-a="down">Sposta giù</div><div class="li tap" data-a="swap">Sostituisci esercizio</div><div class="li tap" data-a="rm" style="color:var(--danger)">Rimuovi dall'allenamento</div></div>`,
      actions: {
        info: (e, ev, sh) => { sh.close(); exerciseInfo(ex.exId); },
        up: (e, ev, sh) => { if (ei > 0) { [s.exercises[ei - 1], s.exercises[ei]] = [s.exercises[ei], s.exercises[ei - 1]]; save(); } sh.close(); renderSession(); },
        down: (e, ev, sh) => { if (ei < s.exercises.length - 1) { [s.exercises[ei + 1], s.exercises[ei]] = [s.exercises[ei], s.exercises[ei + 1]]; save(); } sh.close(); renderSession(); },
        swap: (e, ev, sh) => { sh.close(); exercisePicker(ids => { ex.exId = ids[0]; ex.sets.forEach(x => { if (!x.done) { x.kg = null; x.reps = null; } }); save(); renderSession(); }, true); },
        rm: (e, ev, sh) => { s.exercises.splice(ei, 1); save(); sh.close(); renderSession(); },
      },
    });
  },
  sessionAddEx: () => exercisePicker(ids => { const s = activeSession(); ids.forEach(id => s.exercises.push(newSessionEx(id, null, s.id))); save(); renderSession(); setTimeout(() => { const c = $('#session'); c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }); }, 50); }),
  finishSession,
  cancelSession: () => confirmSheet('Annullare l\'allenamento?', 'Tutte le serie di questo allenamento verranno eliminate.', 'Annulla allenamento', () => { const s = activeSession(); S.sessions = S.sessions.filter(x => x.id !== s.id); S.activeId = null; save(); stopTimer(); keepAwake(false); hideSession(); }),
};
function refreshLib() { $$('#libList').forEach(el => { const sh = sheets.find(s => s.el.contains(el)); if (sh) sh.refresh(); else el.innerHTML = libraryList('lib'); }); $$('.chips .chip[data-a="libFilter"]').forEach(c => c.classList.toggle('on', c.dataset.v === ui.libFilter)); }
function sessionDetail(id) {
  const s = S.sessions.find(x => x.id === id);
  openSheet({
    title: s.name, full: true,
    body: () => `<div class="sub">${longDate(s.date)} · ${s.imported ? 'registrato dalla scheda cartacea' : dur(s.end - s.start)}</div><div class="grid2 mt"><div class="card"><div class="small">Serie</div><div class="stat md">${sessionSets(s)}</div></div><div class="card"><div class="small">Volume</div><div class="stat md">${fmtInt(sessionVolume(s))}<small>kg</small></div></div></div>${s.exercises.map(ex => { const e = exById(ex.exId); return `<div class="card tight"><div class="ex-top">${thumb(e)}<b class="grow">${esc(exName(ex))}</b></div><div class="mt num small" style="color:var(--text);line-height:1.8">${ex.sets.map((x, i) => `<span class="tag ${x.pr ? 'acc' : ''}">${x.t !== 'N' ? x.t + ' ' : ''}${kgS(x.kg)} × ${x.reps}${x.pr ? ' 🏆' : ''}</span>`).join(' ')}</div></div>`; }).join('')}<button class="btn ghost danger block mt2" data-a="del">Elimina allenamento</button>`,
    actions: { del: (el, ev, sh) => confirmSheet('Eliminare l\'allenamento?', 'L\'operazione non si può annullare.', 'Elimina', () => { S.sessions = S.sessions.filter(x => x.id !== id); save(); sh.close(); render(); }) },
  });
}

/* input globali */
const IN = {
  libQ: el => { ui.libQ = el.value; libLimit = 60; const box = el.parentNode.querySelector('#libList') || $('#libList'); const sh = sheets.find(s => s.el.contains(el)); box.innerHTML = libraryList(sh ? 'pick' : 'lib', sh && sh._sel); },
  setKg: el => { const s = activeSession(); s.exercises[+el.dataset.ei].sets[+el.dataset.si].kg = parseNum(el.value); save(); },
  setReps: el => { const s = activeSession(); const v = parseNum(el.value); s.exercises[+el.dataset.ei].sets[+el.dataset.si].reps = v == null ? null : Math.round(v); save(); },
  importFile: el => { if (el.files[0]) importData(el.files[0]); el.value = ''; },
};

document.addEventListener('click', ev => {
  unlockAudio();
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const name = el.dataset.a, sh = sheets.find(s => s.el.contains(el));
  if (sh && sh.actions && sh.actions[name]) { ev.preventDefault(); sh.actions[name](el, ev, sh); return; }
  if (A[name]) { ev.preventDefault(); A[name](el, ev); }
});
const onInput = ev => {
  const el = ev.target.closest('[data-in]'); if (!el) return;
  const name = el.dataset.in, sh = sheets.find(s => s.el.contains(el));
  if (sh && sh.inputs && sh.inputs[name]) { sh.inputs[name](el, sh); return; }
  if (IN[name]) IN[name](el);
};
document.addEventListener('input', onInput);
document.addEventListener('change', ev => { if (ev.target.type === 'file' || ev.target.type === 'date') onInput(ev); });
// invio dalla tastiera = passa al campo successivo nella serie
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter') return; const el = ev.target;
  if (el.dataset && (el.dataset.in === 'setKg' || el.dataset.in === 'setReps')) { ev.preventDefault(); const inputs = $$('#session input'); const i = inputs.indexOf(el); if (inputs[i + 1]) inputs[i + 1].focus(); else el.blur(); }
});

/* ---------------- avvio ---------------- */
(async function init() {
  await Store.open();
  let saved = await Store.get('state'), mirror = null;
  try { mirror = JSON.parse(localStorage.getItem('forma:mirror')); } catch { }
  if (mirror && (!saved || (mirror.savedAt || 0) > (saved.savedAt || 0))) saved = mirror;
  if (saved) S = Object.assign(defaultState(), saved, { settings: Object.assign(defaultState().settings, saved.settings || {}) });
  applyPlan();
  try { const t = JSON.parse(localStorage.getItem('forma:timer')); if (t && t.end > Date.now() - 5000) T = t; } catch { }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch { }
  render();
  try {
    const r = await fetch('data/exercises.json'); EX = await r.json();
    EXM = Object.fromEntries(EX.map(e => [e.id, e]));
  } catch { toast('Libreria esercizi non disponibile'); }
  render();
  if (S.activeId && activeSession()) openSession(); else S.activeId = null;
  tick();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
})();
window.addEventListener('resize', () => { if (MOUNT[tab] && !sheets.length) MOUNT[tab](); });
