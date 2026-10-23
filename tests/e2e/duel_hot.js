// v0.7.8: 일기토 핫키 버튼·진기 바·핫키 시트 — node tests/e2e/duel_hot.js 360x640 (포트 PORT, 기본 8791)
const { chromium } = require('playwright');
const [W, H] = (process.argv[2] || '390x844').split('x').map(Number), PORT = process.env.PORT || 8813;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  await p.goto(`http://127.0.0.1:${PORT}/?debug=1&seed=1&preview=1`);
  const vis = s => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.classList.contains('hidden'); }, s);
  let pressed = 0, dm = null, seenReady = false;
  async function adv(n = 1500, inDuel) { for (let i = 0; i < n; i++) { await p.waitForTimeout(40);
    if (await vis('#overlay')) { if (await p.$('#overlay .pt.on')) { await p.click('#overlay .pt.on'); continue; } if (await p.$('#orb')) { await p.click('#orb'); continue; }
      if (inDuel && !dm && await p.$('#qibar')) dm = await p.evaluate(() => { const r = q => { const e = document.querySelector(q); return e ? e.getBoundingClientRect() : null; }; return { bg: getComputedStyle(document.querySelector('#overlay')).backgroundColor, mainVis: getComputedStyle(document.querySelector('#main')).visibility, badge: getComputedStyle(document.querySelector('.prevbadge')).display, n: document.querySelectorAll('.hk').length, hk: r('.hk') && r('.hk').height, parry: r('#parry').bottom, ovH: document.querySelector('#overlay').scrollHeight, cl: document.querySelector('#overlay').clientHeight, vh: innerHeight }; });
      if (inDuel && !seenReady && await p.$('.hk.ready')) seenReady = true;
      if (inDuel && pressed < 6 && (pressed < 2 || await p.$('.hk.ready'))) { const hk = await p.$$('.hk:not(.lockd)'); if (hk.length) { await hk[pressed % hk.length].click(); pressed++; } }
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
  await p.evaluate(() => { G.S.opt.fx = '높음'; FX.stat = { parts: 0, flash: 0, soft: 0, trail: 0 }; });
  const st = {}; await p.click('#aFight'); await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280); await adv(3000, st);
  ok(dm && dm.n === 3, '일기토 핫키 버튼 3개 (' + JSON.stringify(dm) + ')');
  ok(dm && dm.hk >= 44 && dm.ovH <= dm.cl + 1, '버튼 ≥44px · 스크롤 없음');
  ok(/이번 싸움 초식/.test(st.res || ''), '결과 줄: ' + st.res);
  ok(dm && dm.bg === 'rgb(12, 10, 9)' && dm.mainVis === 'hidden', 'M2 일기토 배경 불투명 · 지도 가림 (' + (dm && dm.bg) + ')');
  ok(dm && dm.badge === 'none', 'M3 일기토 중 미리보기 배지 숨김');
  ok(seenReady, 'M5 준비 ▸ 때 버튼 강조(.hk.ready)');
  const s1 = await p.evaluate(() => FX.stat); ok(s1.trail > 0, 'M1 높음 → 잔상 그리기 (' + JSON.stringify(s1) + ')');
  // M1: 보통/낮음 파티클 수·번쩍임 줄이기
  const cmp = await p.evaluate(() => { const ar = document.createElement('div'); ar.style.cssText = 'position:fixed;width:300px;height:200px'; const cv = document.createElement('canvas'); ar.appendChild(cv); document.body.appendChild(ar); FX.attach(ar, cv); const r = {};
    for (const lv of ['높음', '보통', '낮음']) { FX.opt = { shake: true, fx: lv, flash: lv === '낮음', vib: false }; FX.parts = []; FX.flashT = []; FX.stat = { parts: 0, flash: 0, soft: 0, trail: 0 }; FX.play('manual', { text: 'x', side: 'e' }); FX.frame(0.016); r[lv] = Object.assign({ cls: ar.className }, FX.stat); }
    FX.clear(); ar.remove(); return r; });
  ok(cmp['높음'].parts > cmp['보통'].parts && cmp['보통'].parts > cmp['낮음'].parts && cmp['낮음'].parts > 0, 'M1 파티클 높음>보통>낮음 ' + [cmp['높음'].parts, cmp['보통'].parts, cmp['낮음'].parts]);
  ok(cmp['높음'].trail === 1 && cmp['보통'].trail === 0, 'M1 잔상은 높음만');
  ok(cmp['낮음'].soft === 1 && /flashs/.test(cmp['낮음'].cls) && /\bflash\b/.test(cmp['보통'].cls), '번쩍임 줄이기 → 약한 번쩍임(알파 0.2)');
  ok(cmp['낮음'].shake > 0 && cmp['보통'].shake > 0, '흔들림: 낮음에서도 켜짐');
  const sh0 = await p.evaluate(() => { const ar = document.createElement('div'); document.body.appendChild(ar); FX.attach(ar, null); FX.opt = { shake: false, fx: '높음', flash: false, vib: false }; FX.stat = {}; FX.play('manual', { side: 'e' }); FX.clear(); ar.remove(); return FX.stat.shake || 0; });
  ok(sh0 === 0, '흔들림 끔 설정 → 흔들림 0');
  // 초절정: 4칸
  await p.evaluate(() => { const S = G.S; S.realm = 5; G.mgMigrate(S); }); ok(await p.evaluate(() => G.S.hot.length === 4), '초절정 4칸');
  console.log(W + 'x' + H, '콘솔 오류', errs.length, errs.slice(0, 3)); ok(errs.length === 0, '콘솔 오류 0');
  await b.close(); process.exit(fail ? 1 : 0);
})();
