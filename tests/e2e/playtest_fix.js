const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.goto('http://localhost:8766/?debug=1&seed=1');
  const vis = s => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden'); }, s);
  async function adv(n = 1500) { for (let i = 0; i < n; i++) { await p.waitForTimeout(40);
    if (await vis('#overlay')) { if (await p.$('#overlay .pt.on')) { await p.click('#overlay .pt.on'); continue; } if (await p.$('#orb')) { await p.click('#orb'); continue; }
      const t = await p.$eval('#parry', e => e.textContent).catch(() => null); if (t && /승리|패배/.test(t)) { await p.click('#parry'); continue; } if (await p.$('#parry.live')) { await p.click('#parry'); continue; } continue; }
    if (await vis('#modal')) { const bt = await p.$$('#modal .btns button:not([disabled])'); if (bt.length) { await bt[0].click(); await p.waitForTimeout(280); continue; } } await p.waitForTimeout(280); return; } }
  const claim = async () => { if (await p.$('#claim:not([disabled])')) { await p.click('#claim'); await adv(); } };
  const measure = async (tag) => { const m = await p.evaluate(() => {
      const app = document.querySelector('#app').getBoundingClientRect();
      const hits = [...document.querySelectorAll('.node circle[fill="transparent"]')].map(c => c.getBoundingClientRect().width);
      const lab = [...document.querySelectorAll('.node text')].filter(t => /[가-힣]/.test(t.textContent)).map(t => t.getBoundingClientRect().height);
      const small = [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44 && !b.closest('#dbg') && !b.classList.contains('dbgbtn') && !b.classList.contains('pt')).map(b => (b.id || b.textContent.trim().slice(0, 8)) + ':' + Math.round(b.getBoundingClientRect().height));
      const bub = document.querySelector('#bubble'); let ov = null;
      if (!bub.classList.contains('hidden')) { const r = bub.getBoundingClientRect(), t = document.querySelector('#top').getBoundingClientRect(), g = document.querySelector('.acts-grid'); ov = { topOverlap: r.top < t.bottom - 1, gridOverlap: g ? r.bottom > g.getBoundingClientRect().top + 1 : false, who: bub.querySelector('.who').textContent }; }
      return { hitMin: Math.min(...hits).toFixed(1), labelMin: Math.min(...lab).toFixed(1), small, bubble: ov, scrollW: document.documentElement.scrollWidth };
    }); console.log(tag, JSON.stringify(m)); await p.screenshot({ path: `/tmp/pw/fix_${W}_${tag}.png` }); };
  await p.click('#new'); await adv(); await measure('t1');
  await p.click('#aFight'); await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280); await adv(); await claim();
  await p.click('#aTrain'); await adv(); if (await p.$('#aBreak')) { await p.click('#aBreak'); await adv(); } await claim();
  await p.click('#aFight'); await p.click('#modal .btns button >> nth=1'); await p.waitForTimeout(280); await adv(); await claim();
  await p.click('#aEnd'); await adv();
  await p.click('#aExplore'); await adv(); await measure('t2');
  await p.click('#tabs button[data-tab=base]'); await p.click('[data-q="0"]'); await measure('base'); await p.click('#tabs button[data-tab=map]');
  await p.click('#aFight'); await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280); await adv(); await claim();
  await p.click('#aTrain'); await adv(); await claim();
  console.log('T at turn2 end:', await p.evaluate(() => (G.tutCurrent() || {}).id));
  // 나쁜 경로: 경맥 화면을 보지 않고 턴 종료 → 3턴 팝업 기본 버튼
  await p.click('#aEnd'); await adv(); await claim();
  console.log('after turn3 popup default:', await p.evaluate(() => JSON.stringify({ realm: G.S.realm, mer: G.S.mer, seen: G.S.tut.personal.seen, T: (G.tutCurrent() || {}).id })));
  if (await p.$('#aBreak')) { await p.click('#aBreak'); await adv(); } await claim();
  await p.click('#aEnd'); await adv(); await claim();
  console.log('turn4 tut:', await p.evaluate(() => (G.tutCurrent() || {}).id)); await measure('t4');
  // 이웃 버튼으로 이동 (T8)
  const nb = await p.$('[data-nb]'); await nb.click(); await p.click('#goBtn'); await adv(); await claim();
  console.log('after move tut:', await p.evaluate(() => JSON.stringify({ T: (G.tutCurrent() || {}).id, loc: G.S.loc })));
  await p.click('#tabs button[data-tab=char]'); await measure('char'); await p.click('.tabs2 button[data-sub=wanted]'); await p.click('#tabs button[data-tab=map]');
  console.log('after wanted tut:', await p.evaluate(() => (G.tutCurrent() || {}).id));
  // 목표 진행도/지금 할 일 줄 확인용: 정체 만들기
  for (let i = 0; i < 4; i++) { try { await p.click('#aEnd', {timeout: 3000}); } catch (e) { await p.screenshot({path:'/tmp/pw/stuck.png'}); console.log('STUCK', await p.evaluate(() => document.elementFromPoint(300, 760).outerHTML.slice(0, 200))); break; } await adv(); await claim(); }
  await measure('stall');
  console.log('top text:', (await p.textContent('#top')).slice(0, 160));
  console.log('ERRS', errs); await b.close();
})();
