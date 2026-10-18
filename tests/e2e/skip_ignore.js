const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '360x800').split('x').map(Number);
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.goto('http://localhost:8766/?debug=1&seed=2');
  await p.click('#skip').catch(async () => { const bs = await p.$$('#start button'); console.log(await Promise.all(bs.map(x => x.textContent()))); await bs[bs.length - 1].click(); });
  for (let i = 0; i < 20000; i++) { await p.waitForTimeout(30);
    const st = await p.evaluate(() => ({ ov: !document.querySelector('#overlay').classList.contains('hidden'), mo: !document.querySelector('#modal').classList.contains('hidden'), t: G.S ? G.S.turn : 0 }));
    if (st.t >= (+process.env.TURN || 9)) break; if (i % 300 === 0) console.log(i, JSON.stringify(st), await p.evaluate(() => (document.querySelector('#modal:not(.hidden) h3')||{}).textContent));
    if (st.ov) { const x = await p.$('#overlay .pt.on') || await p.$('#orb') || await p.$('#parry'); if (x) await x.click().catch(() => {}); continue; }
    if (st.mo) { const bt = await p.$$('#modal .btns button:not([disabled])'); if (bt.length) { let k = 0; for (let j = 0; j < bt.length; j++) if (/나중|다음에/.test(await bt[j].textContent())) k = j; await bt[k].click().catch(() => {}); } continue; } // 안내 무시: 마지막(나중에) 버튼
    await p.click('#aEnd', { timeout: 2000 }).catch(() => {}); }
  const m = await p.evaluate(() => ({ t: G.S.turn, tut: (G.tutCurrent() || {}).id, todo: G.S.todo, top: document.querySelector('#top').textContent.slice(0, 140),
    hitMin: Math.min(...[...document.querySelectorAll('.node circle[fill="transparent"]')].map(c => c.getBoundingClientRect().width)).toFixed(1),
    labelMin: Math.min(...[...document.querySelectorAll('.node text')].filter(t => /[가-힣]/.test(t.textContent)).map(t => t.getBoundingClientRect().height)).toFixed(1),
    small: [...document.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.id || b.textContent.slice(0, 6)),
    gridBottom: document.querySelector('.acts-grid').getBoundingClientRect().bottom, tabsTop: document.querySelector('#tabs').getBoundingClientRect().top }));
  console.log(JSON.stringify(m)); await p.screenshot({ path: `/tmp/pw/fix_${W}_skip.png` }); console.log('ERRS', errs); await b.close(); })();
