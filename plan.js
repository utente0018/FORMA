/* Importazione una tantum della scheda "Ricomposizione corporea" (PDF di settembre 2026) e dei carichi di Adelio.
   Gira una sola volta per dispositivo: dopo, tutto è modificabile dall'app e queste righe non toccano più nulla. */
function applyPlan() {
  S.imports = S.imports || [];
  if (S.imports.includes('piano-2026-09')) return;

  // --- alimenti (valori indicativi per 100 g/ml o per pezzo) ---
  const F = (id, name, unit, kcal, p, c, f) => ({ id, name, unit, kcal, p, c, f });
  const newFoods = [
    F('p1', 'Cereali da colazione', 'g', 375, 7.5, 84, 1.5),
    F('p2', 'Banana (1 media)', 'pz', 105, 1.3, 27, 0.4),
    F('p3', 'Mela (1 media)', 'pz', 95, 0.5, 25, 0.3),
    F('p4', 'Pera (1 media)', 'pz', 100, 0.6, 27, 0.2),
    F('p5', 'Frutto (1 porzione)', 'pz', 80, 0.8, 19, 0.3),
    F('p6', 'Pomodori / insalata', 'g', 18, 1, 3.2, 0.2),
    F('p7', 'Spinaci', 'g', 23, 2.9, 3.6, 0.4),
    F('p8', 'Lonza / filetto di maiale (crudo)', 'g', 140, 21, 0, 6),
    F('p9', 'Gamberi (crudi)', 'g', 85, 20, 0.9, 0.5),
    F('p10', 'Pizza margherita (intera)', 'pz', 800, 32, 110, 25),
    F('p11', 'Hamburger di manzo magro (crudo)', 'g', 176, 20, 0, 10),
    F('p12', 'Pane da hamburger', 'g', 265, 9, 48, 4),
    F('p13', 'Formaggio a fette', 'g', 350, 25, 1, 27),
  ];
  newFoods.forEach(f => { if (!S.foods.some(x => x.id === f.id)) S.foods.push(f); });
  const milk = S.foods.find(f => f.id === 'f16'); if (milk && milk.seed) milk.unit = 'ml';
  const has = id => S.foods.some(f => f.id === id);

  // --- piano alimentare (giorno della settimana: 0 = domenica) ---
  const it = (foodId, qty) => { const food = S.foods.find(f => f.id === foodId); return { foodId, name: food.name, qty, unit: food.unit, ...foodCalc(food, qty) }; };
  const COL = q => [it('f16', 300), it('p1', q), it('f15', 250)];
  const plan = {
    1: { colazione: [...COL(60), it('p2', 1)], pranzo: [it('f0', 100), it('f6', 200), it('f19', 15), it('f21', 15), it('p6', 200), it('p3', 1)], cena: [it('f8', 200), it('f5', 300), it('f2', 60), it('f21', 10), it('p6', 200), it('p5', 1)] },
    2: { colazione: [...COL(50), it('p3', 1)], pranzo: [it('f1', 90), it('f7', 200), it('f19', 10), it('f21', 15), it('p7', 200), it('p5', 1)], cena: [it('f9', 180), it('f5', 300), it('f2', 50), it('p6', 200), it('f15', 200), it('p5', 1)] },
    3: { colazione: [...COL(60), it('p2', 1)], pranzo: [it('f1', 110), it('f7', 200), it('f21', 10), it('p6', 200), it('p5', 1)], cena: [it('p8', 200), it('f0', 90), it('f21', 15), it('p7', 200), it('f2', 50), it('p5', 1)] },
    4: { colazione: [...COL(50), it('p4', 1)], pranzo: [it('f0', 90), it('f8', 180), it('f19', 10), it('f21', 10), it('p6', 200), it('p5', 1)], cena: [it('f13', 3), it('f6', 150), it('f5', 300), it('f2', 50), it('f21', 5), it('p6', 200), it('f15', 150)] },
    5: { colazione: [...COL(60), it('p2', 1)], pranzo: [it('f0', 100), it('f11', 180), it('f19', 10), it('f21', 10), it('p6', 200), it('p5', 1)], cena: [it('p10', 1), it('f15', 200)] },
    6: { colazione: [...COL(50), it('p3', 1)], pranzo: [it('f1', 100), it('p9', 250), it('f21', 15), it('p7', 200), it('p5', 1)], cena: [it('p11', 200), it('p12', 100), it('f5', 250), it('p13', 30), it('p6', 200)] },
    0: { colazione: [...COL(50), it('p5', 1)], pranzo: [{ ...it('f8', 250), name: 'Carne alla griglia (ristorante)', label: 'Carne alla griglia (ristorante)' }, it('f5', 275), it('f2', 50), it('p6', 200), it('f21', 10)], cena: [it('f11', 180), it('f2', 80), it('p6', 200), it('f21', 10), it('f15', 200), it('p5', 1)] },
  };
  if (!S.mealPlan || !Object.keys(S.mealPlan).length) S.mealPlan = plan;

  // --- obiettivi e profilo ---
  if (!S.settings.targets) S.settings.targets = { train: { kcal: 2400, p: 160, c: 320, f: 50 }, rest: { kcal: 2300, p: 160, c: 290, f: 55 } };
  if (!S.settings.height) S.settings.height = 187;
  if (!S.settings.start) S.settings.start = { label: 'settembre 2026', w: 77, waist: 94, bicep: 34 };
  if (S.settings.waterTarget === 8) S.settings.waterTarget = 11;

  // --- esercizi personalizzati (non presenti nella libreria) ---
  const cust = [
    { id: 'c-hkr', n: 'Hanging knee raise', b: 'Addome', t: 'Addominali', e: 'Corpo libero', custom: true, s: ['Appeso alla sbarra a braccia tese, spalle attive.', 'Porta le ginocchia verso il petto arrotondando il bacino, senza slancio.', 'Scendi lentamente fino a gambe distese e ripeti.'] },
    { id: 'c-plank', n: 'Plank', b: 'Addome', t: 'Addominali', e: 'Corpo libero', custom: true, g: '2135-VBAWRPG.gif', s: ['Avambracci a terra sotto le spalle, corpo in linea dalla testa ai talloni.', 'Costole giù, glutei contratti, respira normalmente.', 'Mantieni la posizione per il tempo indicato.'] },
  ];
  cust.forEach(c => { if (!S.customEx.some(x => x.id === c.id)) S.customEx.push(c); });

  // --- schede ---
  const R = (exId, label, sets, repMin, repMax, rest, rir, kg, note) => ({ exId, label, sets, repMin, repMax, rest, rir, kg, note });
  const WARM = "Riscaldamento: 5' di tapis roulant a 4,5-5,5 km/h, pendenza 3-5%. Sul primo esercizio: 12 ripetizioni leggere, 6-8 medie, 3-4 quasi da lavoro (non sono serie allenanti).\nIl peso giusto è quello che lascia il RIR richiesto.";
  const routines = [
    { id: 'r-lun', name: 'Lunedì – Petto, bicipiti, quadricipiti, spalle, addome', short: 'Petto, bicipiti, gambe', days: [1], note: WARM + "\nCardio finale: 15' di tapis roulant, 4,5-5,5 km/h, pendenza 7-10%.", items: [
      R('1299', 'Chest press inclinata', 4, 6, 8, 150, '1-2', 35, 'Scapole addotte, piedi saldi, discesa controllata.'),
      R('0577', 'Chest press piana presa neutra', 3, 8, 10, 120, '1-2', 30, 'Non chiudere le spalle in avanti; traiettoria pulita.'),
      R('2616', 'Lat machine triangolo', 3, 8, 10, 120, '1-2', 40, 'Gomiti verso le costole, petto alto, niente slancio.'),
      R('0739', 'Leg press', 3, 8, 10, 150, '2', 90, 'Schiena aderente; niente cedimento.'),
      R('0334', 'Alzate laterali manubri', 3, 12, 20, 70, 'quasi ced.', 8, 'Sali con controllo; ultima serie quasi a cedimento. Peso per manubrio.'),
      R('0447', 'Curl bilanciere EZ', 3, 8, 10, 90, '1', 6.5, 'Gomiti fermi; nessuna spinta dalla schiena.'),
      R('0318', 'Curl manubri panca inclinata', 2, 10, 12, 75, 'quasi ced.', 6, 'Braccio lungo, supinazione controllata. Peso per manubrio.'),
      R('1452', 'Crunch machine', 3, 10, 15, 60, '1', 0, 'Arrotonda il tronco; non tirare con le braccia.'),
      R('0872', 'Reverse crunch', 2, 12, 20, 60, 'controllo', 0, 'Solleva il bacino senza slancio.'),
    ] },
    { id: 'r-mer', name: 'Mercoledì – Dorso, spalle, femorali, tricipiti, richiami, addome', short: 'Dorso, spalle, femorali', days: [3], note: WARM + "\nIl Romanian deadlift non va mai portato a cedimento.\nCardio finale: 15' di tapis roulant, pendenza 7-10%.", items: [
      R('0606', 'Rematore T-Bar', 3, 6, 10, 120, '1-2', 25, 'Tira senza compensare con i lombari.'),
      R('0150', 'Lat machine presa medio-larga', 3, 8, 12, 120, '1-2', 40, 'Non tirare dietro la nuca.'),
      R('0405', 'Shoulder press manubri/macchina', 3, 8, 10, 120, '1-2', 10, 'Schiena stabile, niente iperestensione.'),
      R('1459', 'Romanian deadlift', 3, 8, 10, 150, '2', 10, 'Anche indietro e schiena neutra: esecuzione perfetta. Mai a cedimento.'),
      R('0586', 'Leg curl', 2, 10, 15, 90, '1', 40, 'Bacino fermo, ritorno lento.'),
      R('0596', 'Pectoral machine', 2, 12, 15, 75, 'quasi ced.', 15, 'Ultima serie quasi a cedimento.'),
      R('0200', 'Push down corda', 3, 10, 15, 75, '1', 15, 'Gomiti fissi.'),
      R('0070', 'Curl preacher / spider curl', 2, 10, 12, 75, '1', 7.5, 'Nessun rimbalzo.'),
      R('1391', 'Calf press', 3, 12, 20, 60, '1', 60, 'Pausa in massimo allungamento e contrazione.'),
      R('c-hkr', 'Hanging knee raise', 3, 8, 15, 60, 'controllo', 0, 'Ginocchia al petto senza slancio.'),
      R('c-plank', 'Plank', 2, 45, 60, 60, null, 0, 'Costole giù, glutei contratti. Le ripetizioni sono i secondi di tenuta.'),
    ] },
    { id: 'r-ven', name: 'Venerdì – Petto, bicipiti, dorso, gambe, spalle, tricipiti, addome', short: 'Petto, braccia, gambe', days: [5], note: WARM + "\nCardio finale: 15-20' di tapis roulant, pendenza 7-10%.\nIl cedimento tecnico al curl al cavo inizia dalla settimana 3.", items: [
      R('0025', 'Panca piana bilanciere / chest press', 3, 6, 8, 150, '1-2', 10, 'Scapole stabili; nessun cedimento. Peso indicato per lato (bilanciere escluso).'),
      R('0314', 'Panca inclinata manubri', 3, 8, 10, 120, '1', 8, 'Controllo e ampiezza pulita. Peso per manubrio.'),
      R('0861', 'Pulley presa media', 3, 8, 12, 120, '1-2', 35, 'Petto alto, gomiti indietro.'),
      R('0410', 'Bulgarian split squat', 3, 8, 10, 90, '2', 8, 'Niente cedimento; equilibrio e controllo. 8-10 ripetizioni per gamba, peso per manubrio.'),
      R('0334', 'Alzate laterali', 3, 12, 20, 60, 'quasi ced.', 7, 'Ultima quasi a cedimento. Peso per manubrio.'),
      R('0313', 'Hammer curl', 3, 8, 12, 80, '1', 8, 'Polso neutro, no slancio. Peso per manubrio.'),
      R('0868', 'Curl al cavo', 2, 12, 15, 60, 'ced. tecnico (dalla sett. 3)', 12.5, 'Cedimento tecnico solo dalla settimana 3.'),
      R('0194', 'French press corda sopra testa', 2, 10, 15, 75, '1', 12.5, 'Gomiti fermi, allungamento senza dolore.'),
      R('0857', 'Ab wheel', 3, 6, 12, 60, 'controllo', 0, 'Blocca il bacino, niente lombare.'),
      R('1452', 'Crunch machine', 2, 12, 15, 60, 'quasi ced.', 0, 'Ultima quasi a cedimento.'),
    ] },
  ];
  routines.forEach(r => { if (!S.routines.some(x => x.id === r.id)) S.routines.push(r); });

  // --- serie già fatte questa settimana (dalla scheda cartacea) ---
  const sess = (id, date, routineId, list) => {
    const r = routines.find(x => x.id === routineId), t = fromKey(date).setHours(18, 0, 0, 0);
    return { id, date, routineId, name: r.name, start: t, end: t + 60 * 60000, imported: true, exercises: list.map(([exId, kg, reps]) => { const item = r.items.find(i => i.exId === exId); return { exId, label: item.label, rir: item.rir, note: item.note, kgStart: item.kg, rest: item.rest, repMin: item.repMin, repMax: item.repMax, sets: reps.map(n => ({ kg, reps: n, t: 'N', done: true })) }; }) };
  };
  const past = [
    sess('imp-lun', '2026-09-28', 'r-lun', [['1299', 35, [8, 8, 7]]]),
    sess('imp-mer', '2026-09-30', 'r-mer', [['0606', 25, [10, 10, 10]], ['0150', 40, [10, 9, 8]], ['0405', 10, [10, 10, 10]], ['1459', 10, [6, 6, 6]], ['0586', 40, [12, 12]], ['0596', 15, [12, 12]], ['0200', 15, [12, 10, 10]], ['0070', 7.5, [10]]]),
  ];
  past.forEach(p => { if (!S.sessions.some(x => x.id === p.id)) S.sessions.push(p); });

  S.imports.push('piano-2026-09');
  save(true);
}
