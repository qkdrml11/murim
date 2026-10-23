// node tests/v078.test.js — v0.7.8 무공·진기·핫키·저장
global.window = globalThis; global.localStorage = { s: {}, getItem(k) { return this.s[k] || null; }, setItem(k, v) { this.s[k] = v; }, removeItem(k) { delete this.s[k]; } };
global.D = require('../js/data.js'); require('../js/mugong_data.js'); global.DuelLib = require('../js/duel.js'); const G = require('../js/game.js'); require('../js/mugong.js');
const fs = require('fs'); let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const fresh = () => { G.newGame('t', true); G.queue.length = 0; G.msgs.length = 0; return G.S; };
// 1. 진기 48행 = 16-10-3 표
const DES = __dirname + '/../../design/기획서_v0.7.8.md';
if (fs.existsSync(DES)) { const doc = fs.readFileSync(DES, 'utf8').split('\n'), j0 = doc.findIndex(l => l.startsWith('#### 16-10-3')); const t = {};
  for (const l of doc.slice(j0, j0 + 60)) { const c = l.split('|').map(x => x.trim()); if (c.length > 10 && c[2].startsWith('`')) t[c[2].replace(/`/g, '')] = +c[9].replace(/\*/g, ''); }
  const all = {}; for (const id in D.MG) for (const v of D.MG[id].moves || []) all[v.id] = v.qi; for (const k in D.DANCHO) all[k] = D.DANCHO[k].qi;
  const ks = Object.keys(t); ok(ks.length === 48 && ks.every(k => all[k] === t[k]), '진기 48행 표와 일치 (' + ks.filter(k => all[k] !== t[k]).join(',') + ')');
} else console.log('SKIP 진기 표(설계 문서 없음)');
// 2. D7 상수
ok(D.DUEL.QI_PARRY === 25 && D.DUEL.QI_REG === 0.5 && D.DUEL.MAN_CD === 40 && D.DUEL.POOL_MAX === 8, 'D7 상수');
ok(D.DUEL.HOT_N(4) === 3 && D.DUEL.HOT_N(5) === 4 && D.DUEL.HOT_N(1) === 3, '핫키 칸 3/4');
// 3. 새 게임 기본
let S = fresh(); ok(S.v === 6 && JSON.stringify(S.hot) === '["sjg1",null,null]', '새 게임 핫키 = [기수식, null, null]');
// 4. hotDefault 해석 A (6개)
S.mg.sjg.s = 7; S.realm = 3; S.hot = null; G.hotDefault(); const nm = S.hot.map(id => G.hotCands().find(c => c.id === id).name);
ok(nm.slice().sort().join() === ["지소","천격","인자"].sort().join(), 'hotDefault A: 지소·천격·인자 (' + nm.join('·') + ')');
// 5. migrate: 잃은 id → null → 길이 → 기본
S.hot = ['zzz', 'sjg2']; G.mgMigrate(S); ok(S.hot.length === G.hotN() && S.hot.every(x => x == null || G.hotCands().some(c => c.id === x)), 'migrate 잃은 초식 정리 (' + JSON.stringify(S.hot) + ')');
S.realm = 5; G.mgMigrate(S); ok(S.hot.length === 4, '초절정 migrate → 4칸');
// 6. 절초 자물쇠
S = fresh(); S.realm = 4; ok(G.hotLocked({ kind: '절초' }) && !G.hotLocked({ kind: '초식' }), '절정 이하 절초 잠김'); S.realm = 5; ok(!G.hotLocked({ kind: '절초' }), '초절정 절초 풀림');
// 7. 시드 결정성
ok(DuelLib.hash32(3, 1, 99) === DuelLib.hash32(3, 1, 99) && DuelLib.hash32(3, 1, 99) !== DuelLib.hash32(3, 2, 99), 'hash32 결정적');
S = fresh(); const c0 = S.cnt.duel, s1 = G.duelSeed(); ok(S.cnt.duel === c0 + 1, 'duelSeed → cnt.duel++');
const run = sd => { let r = DuelLib.mulberry(7); const d = new DuelLib.Duel(G.me(), [1, 60, 9, 0, 0, 0, '', '적'], G.mgOpts({}), () => r(), sd); let g = 0; while (!d.done && g++ < 5000) { d.stepA(); if (d.waiting) d.parry(true); } return JSON.stringify([d.done.win, d.done.t, Math.round(d.he)]); };
ok(run(s1) === run(s1), '같은 시드 = 같은 결과');
// 8. v5 저장 불러오기
S = fresh(); const o = JSON.parse(JSON.stringify(S)); o.v = 5; delete o.mg; delete o.hot; delete o.mgMain; o.grade = 2; o.realm = 3;
localStorage.removeItem(G.SAVE_KEY || 'murim_save_v6'); localStorage.setItem('murim_save_v5', JSON.stringify(o));
const L = G.load(); ok(L && G.S.v === 6 && G.S.mg && G.S.hot && G.S.hot.length === 3, 'v5 저장 → v6 변환 (' + JSON.stringify(G.S && G.S.hot) + ')');
// 9. 잠긴 절초 예약 불가
S = fresh(); const d = new DuelLib.Duel(Object.assign(G.me(), {}), [1, 60, 9, 0, 0, 0, '', '적'], { hot: [0] }, Math.random, 1); if (d.pool[0]) { d.pool[0].lock = 1; d.hist.push(1); ok(!d.canReserve(0), '잠긴 초식 예약 거부'); }
// #44 v5 grade → 무공·성 (13-9-1)
const up = (realm, grade, gsk) => { G.newGame('t', true); const o = JSON.parse(JSON.stringify(G.S)); o.v = 5; delete o.mg; delete o.hot; delete o.mgMain; o.realm = realm; o.grade = grade; o.gsk = gsk; G.mgUpgrade5(o); return o; };
let u = up(4, 0, 0); ok(u.mgMain === 'sjg' && u.mg.sjg.s === 7, '#44 절정 하승 → 유성 7성(경지표가 더 높음)');
u = up(1, 0, 0); ok(u.mgMain === 'sjg' && u.mg.sjg.s === 1, '#44 삼류 하승 → 유성 1성');
u = up(3, 1, 0); ok(u.mgMain === 'sjg' && u.mg.sjg.s === 5, '#44 일류 중승 → 유성 5성');
u = up(2, 1, 0); ok(u.mg.sjg.s === 5, '#44 이류 중승 → 유성 5성(상한 5)');
u = up(4, 2, 0); ok(u.mgMain === 'swg' && u.mg.swg.s === 7, '#44 절정 상승 → 단월 주 외공 max(5,7)=7성');
u = up(3, 2, 0); ok(u.mgMain === 'swg' && u.mg.swg.s === 5, '#44 일류 상승 → 단월 5성');
u = up(3, 2, 1); ok(u.mg.swg.s === 6, '#44 상승 + gsk1 → 6성');
u = up(2, 1, 2); ok(u.mg.sjg.s === 5, '#44 gsk 더해도 경지 상한(이류 5) 안');
u = up(1, 1, 0); ok(u.mg.sjg.s === 3, '#44 삼류 중승 → 상한 3성으로 자름');
S = fresh(); G.learnSkill('wtj', '비무'); ok(G.queue.some(e => e.title && e.title.indexOf('복호장') >= 0 && /무공 탭/.test(e.text)), 'M6 복호장 습득 문구에 무공 탭 안내');
console.log(fail ? 'FAIL ' + fail : 'ALL PASS'); process.exit(fail ? 1 : 0);
