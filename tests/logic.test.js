// node tests/logic.test.js — 완료 기준 #32·#33·#34(로직), 폐관 #17·#21·#28, 감쇠 #26
global.window = globalThis; global.localStorage = { s: {}, getItem(k) { return this.s[k] || null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
global.D = require('../js/data.js'); global.DuelLib = require('../js/duel.js'); const G = require('../js/game.js');
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const fresh = () => { G.newGame('t', true); G.queue.length = 0; G.msgs.length = 0; return G.S; };
// #32 토벌 1건 인정
let S = fresh(); S.turn = 3;
S.quests = [{ kind: '토벌', tgt: 'guizhou', mul: 1, fm: 5, left: 2, ttl: 3, seq: 1 }, { kind: '토벌', tgt: 'guizhou', mul: 1, fm: 5, left: 2, ttl: 2, seq: 2 }];
G.fightResult({ kind: 'enemy', id: 'guizhou' }, true, 1);
ok(S.quests[0].left === 2 && S.quests[1].left === 1, '#32 처치 1명 → 기한 2턴짜리만 1/2');
for (let i = 0; i < 3; i++) G.fightResult({ kind: 'enemy', id: 'guizhou' }, true, 1);
ok(S.quests.length === 0, '#32 처치 4명 → 두 건 모두 완료');
S.quests = [{ kind: '토벌', tgt: 'guizhou', mul: 1, fm: 5, left: 2, ttl: 3, seq: 5 }, { kind: '토벌', tgt: 'guizhou', mul: 1, fm: 5, left: 2, ttl: 3, seq: 4 }];
G.fightResult({ kind: 'boss', id: 'guizhou' }, true, 1);
ok(S.quests.find(q => q.seq === 4).left === 1 && S.quests.find(q => q.seq === 5).left === 2, '#32 두목 처치 = 1명, 기한 같으면 먼저 받은 것');
// #33 의뢰판 비율
for (const [loc, realm] of [['guizhou', 1], ['henan', 3]]) {
  S = fresh(); S.loc = loc; S.realm = realm; const elig = G.questTargets(loc).length; let here = 0, k = { '토벌': 0, '배달': 0, '정탐': 0 }, dHere = 0; const N = 1000;
  for (let i = 0; i < N; i++) { const q = G.makeQuest(loc); if (q.tgt === loc) here++; k[q.kind]++; if (q.kind === '배달' && q.tgt === loc) dHere++; }
  const exp = 0.6 + 0.4 / elig; console.log('  ', loc, '자격', elig, '현재 비율', here / N, '기대(배달 재추첨 전)', exp.toFixed(3), JSON.stringify(k));
  const nonDel = N - k['배달']; // 배달은 현재 지역 불가라 비율 기대는 배달 제외 카드로 확인
  let hereND = 0; S.ra = 12345; for (let i = 0; i < N; i++) { const q = G.makeQuest(loc); if (q.kind !== '배달' && q.tgt === loc) hereND++; }
  ok(dHere === 0, '#33 ' + loc + ' 배달이 현재 지역 0장');
  const city = G.kind(loc) === '도시'; const r = k['토벌'] / k['배달'];
  ok(Math.abs(r - 2) < 0.35 && (!city || Math.abs(k['정탐'] / k['배달'] - 1) < 0.25), '#33 ' + loc + ' 종류 비율 ' + (city ? '2:1:1' : '2:1') + ' (' + r.toFixed(2) + ')');
  ok(Math.abs(here / N - exp * (1 - k['배달'] / N)) < 0.05 || Math.abs(hereND / (N - k['배달'] || 1) - exp) < 0.06, '#33 ' + loc + ' 현재 지역 비율 ≈ 0.6 + 0.4/' + elig);
}
// #34 지금 할 일 (로직)
S = fresh(); S.turn = 3; G.goalLines(); const m0 = S.goals.mainIdx; S.goals.mainSince = 3; S.todo = false;
G.endTurn(); ok(!S.todo, '#34 1턴 정체: 표시 없음'); G.queue.length = 0;
G.endTurn(); ok(S.todo === true, '#34 주 목표 2턴 정체 → 지금 할 일 켜짐'); G.queue.length = 0;
G.endTurn(); ok(!S.todo, '#34 턴 종료로 꺼짐(3턴째 정체는 표시 없음)'); G.queue.length = 0;
G.endTurn(); ok(S.todo === true, '#34 이후 2턴마다 다시 켜짐'); G.queue.length = 0;
const acts = S.acts; ok(acts === 3, '#34 행동 소모 0');
S.kills = 1; S.goals.claimed = []; G.goalLines(); ok(S.goals.mainIdx === m0, 'main'); S.goals.claimed.push(0); G.goalLines(); ok(!S.todo, '#34 주 목표 완료로 꺼짐');
// BFS: 이웃에 첫 처치 두목 없을 때 최단 경로 첫 칸
S = fresh(); S.realm = 3; S.mer = 2; S.mu = 63; S.ne = 60; S.grade = 1; S.loc = 'guizhou'; for (const id of ['guizhou', 'sichuan', 'hunan', 'yunnan', 'guangxi']) S.bossesKilled[id] = 1;
const w = G.whereTo(); const st = G.bfsFirstStep(id => !S.bossesKilled[id] && G.bossAlive(id) && !G.closed(id) && G.predict(G.bossOf(id), 'boss', id).w >= 0.6);
ok(w.ids.length === 1 && D.ADJ.guizhou.includes(w.ids[0]) && st && w.ids[0] === st.step, '#34 [어디로?] 최단 경로 첫 칸 = ' + (st && G.rname(st.step)) + ' → ' + (st && G.rname(st.goal)));
// #26 감쇠 (명성 포함)
S = fresh(); S.realm = 1; const f0 = S.fame, s0 = S.silver; G.fightResult({ kind: 'enemy', id: 'guizhou' }, true, 1); G.fightResult({ kind: 'enemy', id: 'guizhou' }, true, 1);
ok(S.silver - s0 === 12 && S.fame - f0 === 3, '#26 소탕도 1 → 은자·명성 0.5배 (8+4, 2+1 · v0.7.8 은자 ×0.85)');
// 폐관 #17·#21·#28
S = fresh(); const E = [1, 2, 4, 6, 8, 10, 14].map(h => G.E0(Math.min(10, h)).toFixed(1)); ok(E.join() === '1.0,2.0,3.4,4.8,5.6,6.4,6.4', '#17 유효시간 ' + E.join());
S.off.bucket = 0; S.off.bucketTs = Date.now(); S.off.lastSeen = S.off.maxSeen = Date.now(); S.off.acted = true;
let tot = 0; for (const h of [4, 4, 15.5]) { S.timeShift += h * 3600000; const r = G.processOffline(); tot += r.E; S.off.acted = true; }
ok(Math.abs(tot - 6.4) < 0.15, '#28 그릇: 4+4+15.5시간 → 유효 합계 ' + tot.toFixed(2));
S.timeShift -= 3600000 * 2; let r = G.processOffline(); ok(r.rollback === true, '#21 시계 되돌림 → 0');
S.off.lastSeen = G.clock() + 86400000; S.off.maxSeen = S.off.lastSeen; r = G.processOffline(); ok(r.rollback === true, '#21 미래 저장 시각 → 0');
S = fresh(); S.xp = 99; S.realm = 1; S.off.bucket = 6.4; S.off.acted = true; S.timeShift += 14 * 3600000; r = G.processOffline(); ok(S.xp === 99 && S.off.reserve > 0 && !G.canBreak(), '#18 폐관만으로 돌파 불가(필요치−1, 잔여 기운 ' + Math.round(S.off.reserve) + ')');

// 플레이테스트 수정 (H1·M2·M3·L6)
S = fresh(); S.tut.personal.skipped = false; S.tut.personal.step = 0; S.kills = 1; S.realm = 2; S.bossesKilled.guizhou = 1; S.explores = 1; S.questsDone = 1; S.turn = 3; S.xp = 330;
ok(G.tutCurrent().id === 'T6', 'H1 3턴 T6 표시');
S.tatongs = 1; S.realm = 3; S.mer = 2; ok(G.tutCurrent() === null || G.tutCurrent().id !== 'T6', 'H1 경맥 화면 없이 타통(팝업 기본 버튼) → T6·T7 완료');
S.turn = 4; ok(G.tutCurrent() && G.tutCurrent().id === 'T8', 'H1 4턴 T8(이동) 표시');
S.turn = 4; G.tutCurrent(); S.turn = 7; const tc = G.tutCurrent(); ok(!tc || tc.id !== 'T8', 'H1 어느 단계도 3턴 넘게 고착되지 않음 (현재 ' + (tc && tc.id) + ')');
S.turn = 30; ok(G.tutCurrent() === null, 'H1 끝까지 진행 → 말풍선 없음');
const BAN = /문파|모집|영토|거래|무주지|세력/;
const pre = [].concat(D.RUMORS, D.GOALS.map(g => g[0]), D.TUT.map(t => t.t), Object.values(D.LOCAL).flat(), Object.values(D.MYEONGMUL).map(m => m.desc), D.SHOP.map(x => x.desc), Object.values(D.CLOSED));
const bad = pre.filter(x => typeof x === 'string' && BAN.test(x)); ok(bad.length === 0, 'M2/#31 1막 문자열에 금지어 0건 ' + bad.join(','));
S = fresh(); S.visited = ['a', 'b', 'c']; ok(JSON.stringify(G.goalProg(14)) === '[3,10]', 'M3 진행도 지역 3/10');
S = fresh(); S.kills = 3; S.realm = 3; S.ev.branched = 'choosing'; G.chooseRoute(3); ok(S.goals.claimed.indexOf(0) >= 0 && S.goals.claimed.indexOf(6) >= 0, 'L6 분기 시 채운 1막 목표 자동 지급');

S = fresh(); S.realm = 4; S.goals.mainIdx = 14; S.visited = Object.keys(D.REGIONS).filter(id => !G.closed(id) && G.risk(id) <= 4).slice(1); { const w = G.whereTo(); const rem = G.unvisitedOk(); ok(rem.length >= 1 && rem.every(r => w.why.indexOf(G.rname(r)) >= 0), 'N3 남은 지역 이름 표시: ' + w.why); }

// ---- v0.6 2-24 ----
// #45 중간 목표
S = fresh(); S.turn = 4; S.realm = 2; S.mer = 2; S.sub.last = 3; G.subStall();
ok(S.sub.cur === 'SG02', '#45 4턴 첫 중간 목표 = SG02(SG01 무공 조건은 1a 전 건너뜀) ' + S.sub.cur);
ok(/정경 한 걸음: 정경 4개/.test(G.subText().t), '#45 문구·진행 ' + G.subText().t);
let sv = S.silver; S.mer = 4; G.subTick(); ok(S.silver === sv + 10 && S.sub.done.indexOf('SG02') >= 0 && G.msgs.some(m => /중간 목표/.test(m)), '#45 채우면 자동 지급 은자 +10 + 토스트');
S.sub.cur = 'SG00'; S.sub.base = G.subMetric('any')[0] + 1; const xp0 = S.xp; S.acts = 3; G.train(); ok(S.xp - xp0 < G.trainAmt() + 20 - 0.01, '#45 같은 턴 두 번째 중간 목표 보상 없음(턴당 1개)');
S.turn = 5; G.subTick(); ok(S.sub.gotTurn === 5, '#45 다음 턴에 지급');
S = fresh(); S.turn = 8; S.realm = 2; S.mer = 12; S.sub.last = 5; S.sub.goalsSeen = 99; G.subStall(); ok(S.sub.cur === 'SG00' && /이번 달/.test(G.subText().t), '#45 3턴째 보상 없음 → SG00');
['SG04', 'SG07', 'SG09', 'SG12'].forEach(id => ok(G.subMetric(G.subRow(id)[3]) === null, '#45 ' + id + ' 1a 전 채울 수 없음 → 건너뜀'));
ok(D.SUBG.length === 13, '#45 D.SUBG 13줄');
// 자동 진행: 매 턴 수련 1~3회(가끔 아무것도 안 함) → 보상 공백 ≤ 4턴, 은자 합 ≤ 50
{ let worst = 0, silv = 0;
  for (let seed = 1; seed <= 30; seed++) { S = fresh(); S.realm = 2; let lastR = 3, prevN = 0, prevSeen = 0; G.rand = (() => { let a = seed * 9301; return () => (a = (a * 16807) % 2147483647) / 2147483647; })();
    for (let t = 1; t <= 24; t++) { S.turn = t; S.acts = 3; G.subStall(); const k = 1 + Math.floor(G.rand() * 3); // 매 턴 한 번은 행동(싸움·수련·타통 중 하나)
      for (let i = 0; i < k; i++) { S.acts = 3; G.train(); }
      if (G.rand() < 0.3 && S.mer < 12) { S.mer += 2; G.subTick(); }
      if (t >= 4) { if (S.sub.n > prevN || S.sub.goalsSeen > prevSeen) lastR = t; worst = Math.max(worst, t - lastR); prevN = S.sub.n; prevSeen = S.sub.goalsSeen; }
      G.queue.length = 0; G.msgs.length = 0; }
    silv = Math.max(silv, S.sub.silver); }
  delete G.rand; ok(worst <= 4, '#45 보상 공백 최대 ' + worst + '턴 (≤4)'); ok(silv <= 50, '#45 중간 목표 은자 합 최대 ' + silv + ' (≤50)'); }
// 저장 이전
{ S = fresh(); delete S.sub; delete S.cnt; delete S.tut.personal.used; localStorage.setItem('murim_save_v5', JSON.stringify(S)); const L = G.load(); ok(L && L.sub && L.cnt && L.tut.personal.used, '#45 옛 저장 불러오기 → S.sub·S.cnt 빈 값 생성'); }
// #46 튜토리얼 넘김
S = fresh(); S.tut.personal.skipped = false; S.turn = 1; ok(G.tutCurrent().id === 'T1', '#46 T1 표시');
G.tutUse('T1'); ok(G.tutCurrent().id === 'T2', '#46 (나) [싸움] 시트 열기 → 즉시 T2');
G.tutUse('T2'); ok(G.tutCurrent().id === 'T3', '#46 T2 수련 → T3');
G.tutUse('T1'); ok(G.tutCurrent().id === 'T3', '#46 T3은 시트 열기만으로 안 넘어감');
G.tutUse('T3'); ok(!G.tutCurrent() || G.tutCurrent().id !== 'T3', '#46 T3 두목전 첫 기세 뒤 넘어감');
S.turn = 2; S.explores = 1; ok(G.tutCurrent().id === 'T5', '#46 (다) 탐색 조건 이미 채움 → T4 말풍선 없이 T5');
S.turn = 4; ok(G.tutCurrent().id === 'T5', '#46 T5 2턴에 처음 뜸 → 4턴까지 유지'); S.turn = 5; ok(G.tutCurrent().id !== 'T5', '#46 (가) 3턴 안 건드림 → 자동');
{ S = fresh(); S.tut.personal.skipped = false; S.tut.personal.t10 = false; const it = S.items['금창약']; G.startRest('ne', false); ok(S.items['금창약'] === it && !S.tut.personal.t10, '#46 T10: 폐관 시작만으로는 완료 아님'); G.t10Done(); G.t10Done(); ok(S.items['금창약'] === it + 1, '#46 T10 출관 화면 1번 → 완료, 보상 중복 0'); }
console.log(fail ? fail + ' FAILED' : 'ALL PASS'); process.exit(fail ? 1 : 0);
