// v0.6 2-24-3 완료 기준 #47~#50: 최소 화면·축소·가로 덮개, 터치 대상 44px, 지도 확대, 핀치 중 탭 무시
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8767/?debug=1&seed=1';
(async () => { const b = await chromium.launch(); const errs = []; let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
  async function open(W, H, fresh = true) { const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(W + 'x' + H + ' ' + m.text()); }); p.on('pageerror', e => errs.push('PE ' + e.message));
    await p.goto(URL); if (fresh) { await p.click('#skip'); for (let i = 0; i < 20 && await p.evaluate(() => !document.querySelector('#modal').classList.contains('hidden')); i++) await p.click('#modal .btns button >> nth=0'); await p.waitForTimeout(280); }
    const cdp = await ctx.newCDPSession(p); return { ctx, p, cdp }; }
  const small = p => p.evaluate(() => [...document.querySelectorAll('button')].filter(x => x.offsetParent && !x.closest('#dbg') && x.id !== 'dbgT' && !x.classList.contains('pt')).map(x => [x.id || x.textContent.trim().slice(0, 6), x.getBoundingClientRect()]).filter(([, r]) => r.height < 43.9 || r.width < 43.9).map(([n, r]) => n + ':' + r.width.toFixed(0) + 'x' + r.height.toFixed(0)));
  const nodeMin = p => p.evaluate(() => Math.min(...[...document.querySelectorAll('.node circle[fill="transparent"]')].map(c => c.getBoundingClientRect().width)));
  const labMin = p => p.evaluate(() => Math.min(...[...document.querySelectorAll('.node text')].filter(t => /[가-힣]/.test(t.textContent)).map(t => parseFloat(t.getAttribute('font-size')) * t.getScreenCTM().a)));
  const hscroll = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('#content,.sheet')].some(e => e.scrollWidth > e.clientWidth + 1));
  const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  // ---- #47 #48 at 360x640 ----
  { const { ctx, p } = await open(360, 640);
    for (const tab of ['map', 'char', 'base']) { await p.click('#tabs button[data-tab=' + tab + ']'); ok(!(await hscroll(p)), '#47 360×640 ' + tab + ' 가로 스크롤 0');
      const sm = (await small(p)).filter(x => !/^🐞/.test(x)); ok(sm.length === 0, '#48 360×640 ' + tab + ' 44px 미만 0 ' + sm.join(',')); }
    await p.click('#tabs button[data-tab=map]');
    await p.click('#aFight'); await p.waitForSelector('#modal .btns button'); const vis = await p.evaluate(() => [...document.querySelectorAll('#modal .btns button')].every(x => { const r = x.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
    ok(vis, '#47 360×640 싸움 시트 버튼 스크롤 없이 보임'); await p.click('#modal .btns button >> text=그만둔다'); await p.waitForTimeout(280);
    await p.evaluate(() => UI.restSheet ? 0 : 0); await p.click('#rest'); await p.waitForSelector('#modal .btns button');
    ok(await p.evaluate(() => [...document.querySelectorAll('#modal .btns button')].every(x => x.getBoundingClientRect().bottom <= innerHeight)), '#47 360×640 폐관 시트 버튼 보임');
    await p.click('#modal .btns button >> nth=-1'); await p.waitForTimeout(280);
    ok(await nodeMin(p) >= 44, '#48 360×640 지도 노드 ' + (await nodeMin(p)).toFixed(1) + 'px');
    // 일기토 화면
    await p.evaluate(() => { UI.duelUI([2, 10, 10, 10, 10, 10, 10, '시험 상대'], {}, { w: 0.5 }); }); await p.waitForSelector('#parry');
    ok(await p.evaluate(() => { const r = document.querySelector('#parry').getBoundingClientRect(); return r.bottom <= innerHeight && r.height >= 44; }), '#47 360×640 일기토 [파훼] 버튼 보임');
    // #50 일기토에서 핀치해도 배율 그대로
    const k0 = await p.evaluate(() => UI.zoom.k); const cdp = await ctx.newCDPSession(p);
    await touch(cdp, 'touchStart', [[150, 300], [210, 300]]); await touch(cdp, 'touchMove', [[100, 300], [260, 300]]); await touch(cdp, 'touchEnd', []);
    ok(await p.evaluate(() => UI.zoom.k) === k0, '#50 일기토 중 핀치 → 배율 그대로');
    await ctx.close(); }
  // ---- #47 320x568 ----
  { const { ctx, p } = await open(320, 568);
    ok(Math.abs(await p.evaluate(() => UI.appScale) - 320 / 360) < 0.01, '#47 320×568 0.89배 축소');
    ok(await p.evaluate(() => !document.querySelector('#narrow').classList.contains('hidden')), '#47 320 경고 띠 표시');
    const sm = (await small(p)).filter(x => !/^🐞/.test(x)); ok(sm.length === 0, '#48 320 축소 상태 44px 미만 0 ' + sm.join(','));
    ok(await nodeMin(p) >= 44, '#48 320 지도 노드 ' + (await nodeMin(p)).toFixed(1) + 'px'); ok(!(await hscroll(p)), '#47 320 가로 스크롤 0');
    await p.click('#narrowX'); await p.reload(); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#narrow').classList.contains('hidden')), '#47 320 경고 띠는 한 번만(닫은 뒤 다시 안 뜸)');
    await ctx.close(); }
  // ---- #47 640x360 가로 ----
  { const { ctx, p } = await open(640, 360, false);
    ok(await p.evaluate(() => !document.querySelector('#rot').classList.contains('hidden') && UI.paused), '#47 640×360 가로 덮개 + 일시정지 플래그');
    await ctx.close(); }
  // ---- #49 #50 지도 확대 (360x640) ----
  { const { ctx, p, cdp } = await open(360, 640);
    for (let i = 0; i < 6; i++) await p.click('#zIn'); ok(await p.evaluate(() => UI.zoom.k) === 2 && /2×/.test(await p.textContent('#zLbl')), '#49 ＋ 반복 → 최대 2× (' + await p.textContent('#zLbl') + ')');
    await p.click('#zOut'); ok(await p.evaluate(() => UI.zoom.k) === 1.75, '#49 － 0.25× 단위');
    for (let i = 0; i < 6; i++) await p.click('#zOut'); ok(await p.evaluate(() => UI.zoom.k) === 0.75, '#49 최소 0.75×');
    ok(await nodeMin(p) >= 44, '#48/#49 0.75×에서 노드 누름 ' + (await nodeMin(p)).toFixed(1) + 'px'); ok(await labMin(p) >= 12, '#49 0.75× 지역 이름 ' + (await labMin(p)).toFixed(1) + 'px');
    const box = await p.evaluate(() => { const r = document.querySelector('svg.map').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
    // 핀치 확대 범위
    await touch(cdp, 'touchStart', [[cx - 20, cy], [cx + 20, cy]]); for (let i = 1; i <= 10; i++) await touch(cdp, 'touchMove', [[cx - 20 - i * 20, cy], [cx + 20 + i * 20, cy]]); await touch(cdp, 'touchEnd', []);
    ok(await p.evaluate(() => UI.zoom.k) <= 2, '#49 핀치 확대 상한 2× (' + await p.evaluate(() => UI.zoom.k) + ')');
    await touch(cdp, 'touchStart', [[cx - 150, cy], [cx + 150, cy]]); for (let i = 1; i <= 10; i++) await touch(cdp, 'touchMove', [[cx - 150 + i * 14, cy], [cx + 150 - i * 14, cy]]); await touch(cdp, 'touchEnd', []);
    ok(await p.evaluate(() => UI.zoom.k) >= 0.75, '#49 핀치 축소 하한 0.75× (' + await p.evaluate(() => UI.zoom.k) + ')');
    // 드래그 이동 + 가두기
    await p.waitForTimeout(350); const t0 = await p.evaluate(() => [UI.zoom.tx, UI.zoom.ty]); const tl0 = await p.evaluate(() => UI.tapLog.length);
    await touch(cdp, 'touchStart', [[cx, cy]]); for (let i = 1; i <= 8; i++) await touch(cdp, 'touchMove', [[cx + i * 8, cy + i * 4]]); await touch(cdp, 'touchEnd', []);
    const t1 = await p.evaluate(() => [UI.zoom.tx, UI.zoom.ty]); ok(t1[0] !== t0[0] && await p.evaluate(() => UI.tapLog.length) === tl0, '#49/#50 드래그 이동, 선택 0');
    await touch(cdp, 'touchStart', [[cx, cy]]); for (let i = 1; i <= 30; i++) await touch(cdp, 'touchMove', [[cx + i * 60, cy + i * 60]]); await touch(cdp, 'touchEnd', []);
    ok(await p.evaluate(() => { const g = document.getElementById('mz').getBoundingClientRect(), s = document.querySelector('svg.map').getBoundingClientRect(); return g.left < s.right - 10 && g.top < s.bottom - 10; }), '#49 지도 그림이 화면 밖으로 다 나가지 않음');
    // 빈 곳 더블탭 리셋
    const empty = await p.evaluate(() => { const s = document.querySelector('svg.map').getBoundingClientRect(); for (let y = s.top + 5; y < s.bottom; y += 7) for (let x = s.left + 5; x < s.right; x += 7) { const e = document.elementFromPoint(x, y); if (e && !e.closest('.node') && !e.closest('.zctl') && e.closest('svg.map')) return [x, y]; } return null; });
    await p.waitForTimeout(350); await p.touchscreen.tap(empty[0], empty[1]); await p.waitForTimeout(80); await p.touchscreen.tap(empty[0], empty[1]); await p.waitForTimeout(100);
    ok(await p.evaluate(() => UI.zoom.k === 1 && UI.zoom.tx === 0 && UI.zoom.ty === 0), '#49 빈 곳 더블탭 → 1×·처음 위치');
    // #50 핀치 100회 → 선택 0
    await p.evaluate(() => { UI.sel = null; UI.tapLog.length = 0; });
    for (let i = 0; i < 100; i++) { await touch(cdp, 'touchStart', [[cx - 30, cy], [cx + 30, cy]]); await touch(cdp, 'touchMove', [[cx - 40 - (i % 3), cy], [cx + 40 + (i % 3), cy]]); await touch(cdp, 'touchEnd', [[cx + 40, cy]]); await touch(cdp, 'touchEnd', []); }
    ok(await p.evaluate(() => UI.tapLog.filter(x => x !== '-').length === 0 && UI.sel === null), '#50 핀치 100회 → 지역 선택 0');
    // 핀치 직후 300ms 안 손떼기
    await touch(cdp, 'touchStart', [[cx - 30, cy], [cx + 30, cy]]); await touch(cdp, 'touchEnd', []);
    const node = await p.evaluate(() => { const n = [...document.querySelectorAll('.node')].find(n => n.dataset.id !== G.S.loc); const r = n.querySelector('circle').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, n.dataset.id]; });
    await touch(cdp, 'touchStart', [[node[0], node[1]]]); await touch(cdp, 'touchEnd', []);
    ok(await p.evaluate(() => UI.sel === null), '#50 핀치 뒤 300ms 안 탭 → 선택 0');
    // 10px 이상 드래그 → 선택 0
    await p.waitForTimeout(350); await touch(cdp, 'touchStart', [[node[0], node[1]]]); await touch(cdp, 'touchMove', [[node[0] + 12, node[1]]]); await touch(cdp, 'touchEnd', []);
    ok(await p.evaluate(() => UI.sel === null), '#50 10px 드래그 → 선택 0');
    await p.evaluate(() => { UI.zoom = { k: 1, tx: 0, ty: 0 }; UI.refresh(); });
    // 보통 탭 100회 → 선택 100
    await p.waitForTimeout(350); await p.evaluate(() => { UI.tapLog.length = 0; });
    let hit = 0; for (let i = 0; i < 100; i++) { const q = await p.evaluate(id => { const n = document.querySelector('.node[data-id="' + id + '"] circle'); const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, node[2]);
      await touch(cdp, 'touchStart', [q]); await touch(cdp, 'touchEnd', []); if (await p.evaluate(id => UI.tapLog[UI.tapLog.length - 1] === id, node[2])) hit++; await p.evaluate(() => { UI.sel = null; }); }
    ok(hit === 100, '#50 보통 탭 100회 → 선택 ' + hit);
    await ctx.close(); }
  ok(errs.length === 0, '콘솔 에러 0 ' + errs.join(' | ')); console.log(fail ? 'FAILED ' + fail : 'ALL PASS'); await b.close(); process.exit(fail ? 1 : 0); })();
