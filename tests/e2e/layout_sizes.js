const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
 for (const [W, H] of [[360, 640], [360, 800], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push(W + 'x' + H + ' ' + m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.goto('http://localhost:8766/?debug=1&seed=1'); await p.click('#skip');
  for (let i = 0; i < 20 && await p.evaluate(() => !document.querySelector('#modal').classList.contains('hidden')); i++) await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280);
  const states = { '1줄': S => { S.todo = false; }, '3줄+할일': S => { S.turn = 9; S.todo = true; }, '4줄+경고+토스트': S => { S.turn = 9; S.todo = true; S.xp = 99999; S.realm = 2; S.mer = 12; S.loc = 'guangxi'; } };
  for (const [nm, f] of Object.entries(states)) {
   await p.evaluate(src => { eval('(' + src + ')')(G.S); UI.refresh(); if (G.canBreak()) { G.toast('돌파할 수 있다!'); } UI.refresh(); }, f.toString());
   await p.waitForTimeout(300);
   for (const open of [false, true]) {
    if (open) { const g = await p.$('#top.compact .goal .gt'); if (!g) continue; await g.click(); await p.waitForTimeout(400); }
    const m = await p.evaluate(() => { const R = e => e.getBoundingClientRect(); const tabs = R(document.querySelector('#tabs'));
     const btns = [...document.querySelectorAll('.acts-grid button, .extra button')]; const gb = Math.max(...btns.map(x => R(x).bottom));
     const lab = [...document.querySelectorAll('.node text')].filter(t => /[가-힣]/.test(t.textContent)).map(t => parseFloat(t.getAttribute('font-size')) * t.ownerSVGElement.getScreenCTM().a); const hits = [...document.querySelectorAll('.node circle[fill="transparent"]')].map(c => R(c).width);
     const toasts = [...document.querySelectorAll('#toast div')].map(R); const ov = toasts.some(t => btns.some(x => { const r = R(x); return t.left < r.right && t.right > r.left && t.top < r.bottom && t.bottom > r.top; }));
     return { lines: document.querySelectorAll('#top .goal').length, gridBottom: Math.round(gb), tabsTop: Math.round(tabs.top), mapH: Math.round(R(document.querySelector('svg.map')).height), hitMin: Math.min(...hits).toFixed(1), labelPx: Math.min(...lab).toFixed(1), topOv: document.querySelector('#top').classList.contains('open'), toasts: toasts.length, toastOverBtn: ov }; });
    console.log(W + 'x' + H, nm, open ? '펼침' : '', JSON.stringify(m), m.gridBottom <= m.tabsTop ? 'OK' : 'BAD');
    await p.screenshot({ path: `/tmp/pw/n_${W}x${H}_${nm}${open ? '_open' : ''}.png` });
    if (open) { await p.click('#top .goal .gt'); }
   } }
  // 25턴 분기 흐름
  await p.evaluate(() => { const S = G.S; S.turn = 24; S.kills = 30; S.realm = 4; S.mer = 12; S.visited = Object.keys(D.REGIONS).slice(0, 12); S.acts = 0; S.goals.claimed = []; S.bossesKilled = { guizhou: 1, sichuan: 1, hunan: 1, guangxi: 1, yunnan: 1 }; UI.refresh(); });
  let maxToasts = 0, sums = 0, titles = [];
  await p.click('#aEnd');
  for (let i = 0; i < 400; i++) { await p.waitForTimeout(50); maxToasts = Math.max(maxToasts, await p.evaluate(() => document.querySelectorAll('#toast div').length));
    const h = await p.evaluate(() => { const m = document.querySelector('#modal'); return m.classList.contains('hidden') ? null : (m.querySelector('h2') || {}).textContent; });
    if (h) { if (titles[titles.length - 1] !== h) titles.push(h); if (/^알림/.test(h)) sums++;
      const bs = await p.$$('#modal .btns button:not([disabled])'); let k = 0; for (let j = 0; j < bs.length; j++) if (/배우며|홀로|③|낭인/.test(await bs[j].textContent())) k = j; if (bs.length) { await bs[k].click().catch(() => {}); await p.waitForTimeout(260); } }
    else if (await p.evaluate(() => G.S.turn >= 25 && G.S.route === 3) && i > 60) break; }
  console.log(W + 'x' + H, 'branch', JSON.stringify({ turn: await p.evaluate(() => G.S.turn), route: await p.evaluate(() => G.S.route), maxToasts, titles }));
  await p.screenshot({ path: `/tmp/pw/n_${W}x${H}_branch.png` });
  await ctx.close(); }
 console.log('ERRS', errs); await b.close(); })();
