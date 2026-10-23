// v0.7.8: 일기토 핫키 버튼·진기 바·핫키 시트 — node tests/e2e/duel_hot.js 360x640 (포트 PORT, 기본 8791)
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number), PORT = process.env.PORT || 8813;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  await p.goto(`http://127.0.0.1:${PORT}/?debug=1&seed=1&preview=1`);
  const vis = s => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden'); }, s);
  let pressed = 0, dm = null;
  async function adv(n = 1500, inDuel) { for (let i = 0; i < n; i++) { await p.waitForTimeout(40);
    if (await vis('#overlay')) { if (await p.$('#overlay .pt.on')) { await p.click('#overlay .pt.on'); continue; } if (await p.$('#orb')) { await p.click('#orb'); continue; }
      if (inDuel && !dm && await p.$('#qibar')) dm = await p.evaluate(() => { const r = q => { const e = document.querySelector(q); return e ? e.getBoundingClientRect() : null; }; return { n: document.querySelectorAll('.hk').length, hk: r('.hk') && r('.hk').height, parry: r('#parry').bottom, ovH: document.querySelector('#overlay').scrollHeight, cl: document.querySelector('#overlay').clientHeight, vh: innerHeight }; });
      if (inDuel && pressed < 6) { const hk = await p.$$('.hk:not(.lockd)'); if (hk.length) { await hk[pressed % hk.length].click(); pressed++; } }
      const t = await p.$eval('#parry', e => e.textContent).catch(() => null); if (t && /승리|패배/.test(t)) { if (inDuel) inDuel.res = await p.$eval('#dres', e => e.textContent).catch(() => ''); await p.click('#parry'); continue; } if (await p.$('#parry.live')) { await p.click('#parry'); continue; } continue; }
    if (await vis('#modal')) { const bt = await p.$$('#modal .btns button:not([disabled])'); if (bt.length) { await bt[0].click(); await p.waitForTimeout(280); continue; } } await p.waitForTimeout(280); return; } }
  await p.click('#new'); await adv();
  ok(await p.$('.prevbadge') !== null, '미리보기 배지');
  ok(await p.evaluate(() => G.PREVIEW && !!localStorage.getItem('murim_preview_save_v6') && !localStorage.getItem('murim_save_v6')), '미리보기 저장 키');
  await p.evaluate(() => { const S = G.S; S.mg.sjg.s = 7; S.realm = 2; S.hot = null; G.hotDefault(); UI.tab = 'char'; UI.sub.char = 'mg'; UI.refresh(); });
  ok(await p.$('#hotBtn') !== null, '무공 탭 + 핫키 버튼');
  await p.click('#hotBtn'); await p.waitForTimeout(300);
  const sh = await p.evaluate(() => ({ slots: document.querySelectorAll('.hkslot').length, cands: document.querySelectorAll('.hkc').length, h: document.querySelector('.hksheet').getBoundingClientRect().height }));
  ok(sh.slots === 3 && sh.cands >= 4, '핫키 시트 칸 3 · 후보 ' + sh.cands);
  await p.click('.hkc[data-id="sjg1"]'); await p.waitForTimeout(100);
  ok(await p.$eval('.hkslots', e => e.textContent.includes('유성기세')), '후보 탭 → 칸에 넣기');
  await p.click('#modal .btns button >> nth=1'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => G.S.hot.includes('sjg1')), '완료 → G.setHot 저장');
  await p.evaluate(() => { UI.tab = 'map'; UI.refresh(); }); await p.waitForTimeout(100);
  const st = {}; await p.click('#aFight'); await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280); await adv(3000, st);
  ok(dm && dm.n === 3, '일기토 핫키 버튼 3개 (' + JSON.stringify(dm) + ')');
  ok(dm && dm.hk >= 44 && dm.ovH <= dm.cl + 1, '버튼 ≥44px · 스크롤 없음');
  ok(/이번 싸움 초식/.test(st.res || ''), '결과 줄: ' + st.res);
  // 초절정: 4칸
  await p.evaluate(() => { const S = G.S; S.realm = 5; G.mgMigrate(S); }); ok(await p.evaluate(() => G.S.hot.length === 4), '초절정 4칸');
  console.log(W + 'x' + H, '콘솔 오류', errs.length, errs.slice(0, 3)); ok(errs.length === 0, '콘솔 오류 0');
  await b.close(); process.exit(fail ? 1 : 0);
})();
