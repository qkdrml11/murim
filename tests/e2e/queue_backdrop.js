// 목표 바 펼침 바깥 탭이 아래 버튼을 누르지 않는지 + 모달 큐(이벤트·요약 동시 발생 시 순서대로, 누락 없음)
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8766/?debug=1&seed=1';
(async () => { const b = await chromium.launch(); const errs = []; let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
 for (const [W, H] of [[360, 640], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
  await p.goto(URL); await p.click('#skip');
  for (let i = 0; i < 20 && await p.evaluate(() => !document.querySelector('#modal').classList.contains('hidden')); i++) { await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280); }
  await p.evaluate(() => { G.S.turn = 9; G.S.todo = true; UI.refresh(); });
  if (H < 720) {
   const before = await p.evaluate(() => JSON.stringify([G.S.acts, G.S.xp, G.S.turn]));
   await p.click('#top .goal .gt'); ok(await p.evaluate(() => document.querySelector('#top').classList.contains('open')), W + ' 패널 열림');
   const r = await p.$eval('#aTrain', e => { const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
   await p.touchscreen.tap(r[0], r[1]); await p.waitForTimeout(300);
   const after = await p.evaluate(() => JSON.stringify([G.S.acts, G.S.xp, G.S.turn]));
   ok(!(await p.evaluate(() => document.querySelector('#top').classList.contains('open'))), W + ' 바깥 탭 → 패널 닫힘');
   ok(before === after && await p.evaluate(() => document.querySelector('#modal').classList.contains('hidden')), W + ' 바깥 탭이 [수련]을 누르지 않음 ' + before + ' ' + after);
   // 지도 노드도
   await p.click('#top .goal .gt'); const pb = await p.$eval('#top', e => e.getBoundingClientRect().bottom); let nb = null; for (const n of await p.$$('.node')) { const bb = await n.boundingBox(); if (bb.y > pb + 10) { nb = bb; break; } } await p.touchscreen.tap(nb.x + nb.width / 2, nb.y + nb.height / 2); await p.waitForTimeout(200);
   ok(await p.evaluate(() => UI.sel === null || UI.sel === undefined), W + ' 바깥 탭이 지도 노드를 선택하지 않음');
  }
  await p.evaluate(() => { UI.modalLog.length = 0; UI.modal({ title: '이벤트A' }); G.toast('t1'); G.toast('t2'); G.toast('t3'); G.toast('t4'); UI.refresh(); UI.modal({ title: '이벤트B' }); });
  const seen = [];
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(120); const h = await p.evaluate(() => { const m = document.querySelector('#modal'); return m.classList.contains('hidden') ? null : m.querySelector('h2').textContent; });
    if (h) { seen.push(h); await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(300); } else if (seen.length >= 3 && await p.evaluate(() => UI.modalPending === 0)) break; }
  ok(seen.length === 3 && seen.includes('이벤트A') && seen.includes('이벤트B') && seen.some(x => /^알림 4건/.test(x)), W + ' 모달 순서대로 3개, 누락 없음: ' + seen.join(' → '));
  ok(seen[0] === '이벤트A', W + ' 먼저 연 모달이 먼저');
  // 3건은 묶지 않고 토스트(최대 2개 표시), 모달 닫힌 직후 250ms 입력 무시
  await p.evaluate(() => { UI.modalLog.length = 0; G.toast('a'); G.toast('b'); G.toast('c'); UI.refresh(); });
  ok(await p.evaluate(() => document.querySelector('#modal').classList.contains('hidden') && document.querySelectorAll('#toast div').length <= 2), W + ' 3건 → 모달 없이 토스트 2개 이하');
  await p.evaluate(() => { UI.modal({ title: '닫기 시험' }); }); await p.waitForTimeout(300); const a0 = await p.evaluate(() => G.S.acts);
  const tr = await p.$eval('#aTrain', e => { const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
  await p.click('#modal .btns button >> nth=0'); await p.mouse.click(tr[0], tr[1]); await p.waitForTimeout(50);
  ok(await p.evaluate(() => G.S.acts) === a0, W + ' 모달 닫은 직후 두 번째 탭은 무시');
  await p.waitForTimeout(300); await p.click('#aTrain'); ok(await p.evaluate(() => G.S.acts) === a0 - 1, W + ' 250ms 뒤에는 정상 입력');
  await ctx.close(); }
 ok(errs.length === 0, '콘솔 에러 0 ' + errs.join('|')); console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0); })();
