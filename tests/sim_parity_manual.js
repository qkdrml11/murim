// 수동 예약 정책(잘 씀/연타) vs sim_v078_duel_결과.txt (절정 진기 50)
const D = require('../js/data.js'); require('../js/mugong_data.js'); const DL = require('../js/duel.js');
const SJG = { sjg1: [1.0, 1, [['win', 0.3, 0]], '기수식', 20], sjg2: [1.2, 1, [['brk', 15, 3]], '초식', 40], sjg3: [1.0, 2, [['int', 1.0, 0]], '초식', 45],
  sjg4: [1.2, 1, [['bld', 1, 3]], '초식', 40], ss1: [1.3, 1, [['daze', 0.6, 0]], '초식', 50], wtj1: [1.0, 1, [['heal', 3, 0]], '기수식', 20] };
const SIX = ['sjg1', 'sjg2', 'sjg4', 'ss1', 'sjg3', 'wtj1'], THREE = ['sjg1', 'sjg2', 'sjg4'];
const LOADS = [['3개·3칸', THREE, THREE, 4.4], ['6개·가벼운(기세·천격·인자)', SIX, ['sjg1', 'sjg2', 'sjg4'], 6.4], ['6개·큰(천격·인자·낙석세)', SIX, ['sjg2', 'sjg4', 'ss1'], 7.4], ['6개·제어(낙석세·지소·합장세)', SIX, ['ss1', 'sjg3', 'wtj1'], 3.2]];
const P = D.MGBASE[0] * 1.8, N = +process.argv[2] || 300;
const POOL1 = []; for (const mu of [70, 76]) for (const ne of [70, 76]) for (const tag of [null, '쾌검', '철벽']) for (const k of ['n', 'm']) POOL1.push([4, mu, ne, 55, 1, tag, k]);
function choose(d, pol, rm) {
  const t = d.t; d.wheel(); const ready = d.hot.filter(i => d.cdLeft(i) <= 0 && !d.deck.has(i) && d.qi >= d.pool[i].qi); if (!ready.length) return null;
  if (pol === 'mash') return ready[Math.floor(rm() * ready.length)];
  const sw = i => d.sitw(i) / D.DUEL.BASEW[d.pool[i].kind];
  const burst = d.stun > 0 || t < d.brkU; let r = ready; if (!(burst || d.he / d.ehp < 0.25)) r = r.filter(i => sw(i) >= 9); if (!r.length) return null;
  return r.reduce((a, b) => sw(b) * d.pool[b].pw / Math.sqrt(d.pool[b].qi / 50) > sw(a) * d.pool[a].pw / Math.sqrt(d.pool[a].qi / 50) ? b : a);
}
function run(ids, slots, pol) {
  const pool = ids.map(id => { const [c, h, e, kind, qi] = SJG[id]; return { id, name: id, pw: Math.round(P * c * 100) / 100, hits: h, eff: e, kind, qi }; });
  const hot = slots.map(s => ids.indexOf(s)); const p = { realm: 4, mu: 58, ne: 62, ji: 55, mer: 8, grade: 0, gsk: 0, pool };
  let w = 0, c = 0, used = 0; const rng = DL.mulberry(4242), rm = DL.mulberry(9);
  for (const e of POOL1) for (let i = 0; i < N; i++) {
    const d = new DL.Duel(p, e, { hot }, rng, i * 7919 + c); c++;
    while (!d.done) {
      if (pol && d.hist.length && d.t >= d.ns) { d.reserve = choose(d, pol, rm); }
      d.stepA(); if (d.waiting) d.parry(rng() < Math.min(0.95, 0.5 + (d.fails2 >= 2 ? DL.F8.assist : 0) + d.parryBonus()));
    }
    w += d.done.win ? 1 : 0; used += d.man;
  }
  return [100 * w / c, used / c];
}
let bad = 0;
for (const [nm, ids, sl, tgt] of LOADS) {
  const a = run(ids, sl, null)[0], [s, us] = run(ids, sl, 'smart'), [m] = run(ids, sl, 'mash');
  const ok = Math.abs(s - a - tgt) <= 2 && m - a <= 0.5; if (!ok) bad++;
  console.log(`${nm}: 자동 ${a.toFixed(1)} · 잘 씀 ${(s - a >= 0 ? '+' : '') + (s - a).toFixed(1)} (sim +${tgt}, 판당 ${us.toFixed(2)}) · 연타 ${(m - a).toFixed(1)} → ${ok ? 'OK' : 'FAIL'}`);
}
process.exit(bad ? 1 : 0);
