const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
 for (const [W, H] of [[360, 640], [360, 800], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push(W + 'x' + H + ' ' + m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.goto('http://localhost:8766/?debug=1&seed=1'); await p.click('#skip');
  for (let i = 0; i < 20 && await p.evaluate(() => !document.querySelector('#modal').classList.contains('hidden')); i++) await p.click('#modal .btns button >> nth=0');
  const states = { '1줄': S => { S.todo = false; }, '3줄+할일': S => { S.turn = 9; S.todo = true; }, '4줄+경고+토스트': S => { S.turn = 9; S.todo = true; S.xp = 99999; S.realm = 2; S.mer = 12; S.loc = 'guangxi'; } };
  for (const [nm, f] of Object.entries(states)) {
   await p.evaluate(src => { eval('(' + src + ')')(G.S); UI.refresh(); if (G.canBreak()) { G.toast('돌파할 수 있다!'); } UI.refresh(); }, f.toString());
   await p.waitForTimeout(300);
   for (const open of [false, true]) {
    if (open) { const g = await p.$('#top.compact .goal .gt'); if (!g) continue; await g.click(); await p.waitForTimeout(400); }
    const m = await p.evaluate(() => { const R = e => e.getBoundingClientRect(); const tabs = R(document.querySelector('#tabs'));
     const btns = [...document.querySelectorAll('.acts-grid button, .extra button')]; const gb = Math.max(...btns.map(x => R(x).bottom));
     const hits = [...document.querySelectorAll('.node circle[fill="transparent"]')].map(c => R(c).width);
     const toasts = [...document.querySelectorAll('#toast div')].map(R); const ov = toasts.some(t => btns.some(x => { const r = R(x); return t.left < r.right && t.right > r.left && t.top < r.bottom && t.bottom > r.top; }));
     return { lines: document.querySelectorAll('#top .goal').length, gridBottom: Math.round(gb), tabsTop: Math.round(tabs.top), mapH: Math.round(R(document.querySelector('svg.map')).height), hitMin: Math.min(...hits).toFixed(1), toasts: toasts.length, toastOverBtn: ov }; });
    console.log(W + 'x' + H, nm, open ? '펼침' : '', JSON.stringify(m), m.gridBottom <= m.tabsTop ? 'OK' : 'BAD');
    await p.screenshot({ path: `/tmp/pw/n_${W}x${H}_${nm}${open ? '_open' : ''}.png` });
    if (open) { await p.click('#top .goal .gt'); }
   } }
  await ctx.close(); }
 console.log('ERRS', errs); await b.close(); })();
