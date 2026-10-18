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
ok(S.silver - s0 === 15 && S.fame - f0 === 3, '#26 소탕도 1 → 은자·명성 0.5배 (10+5, 2+1)');
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
console.log(fail ? fail + ' FAILED' : 'ALL PASS'); process.exit(fail ? 1 : 0);
