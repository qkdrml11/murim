// JS Duel(F20 칸 순환) vs sim_v078_duel_결과.txt 자동 승률 (1a 24조합 · 유성검법 9성 · 정경 8 · 파훼 50%)
const D = require('../js/data.js'); require('../js/mugong_data.js'); const DL = require('../js/duel.js');
const SJG = { sjg1: [1.0, 1, [['win', 0.3, 0]], '기수식'], sjg2: [1.2, 1, [['brk', 15, 3]], '초식'], sjg3: [1.0, 2, [['int', 1.0, 0]], '초식'],
  sjg4: [1.2, 1, [['bld', 1, 3]], '초식'], ss1: [1.3, 1, [['daze', 0.6, 0]], '초식'], wtj1: [1.0, 1, [['heal', 3, 0]], '기수식'] };
const SETS = { 1: ['sjg1'], 3: ['sjg1', 'sjg2', 'sjg4'], 6: ['sjg1', 'sjg2', 'sjg4', 'ss1', 'sjg3', 'wtj1'] };
const P = D.MGBASE[0] * (1 + 0.1 * 8);
const POOL1 = []; for (const mu of [70, 76]) for (const ne of [70, 76]) for (const tag of [null, '쾌검', '철벽']) for (const k of ['n', 'm']) POOL1.push([4, mu, ne, 55, 1, tag, k]);
const TGT = { 1: 31.5, 3: 53.8, 6: 51.2 }; let bad = 0;
const N = +process.argv[2] || 400;
for (const n of [1, 3, 6]) {
  const pool = SETS[n].map(id => { const [c, h, e, kind] = SJG[id]; return { id, name: id, pw: Math.round(P * c * 100) / 100, hits: h, eff: e, kind, qi: 50 }; });
  const p = { realm: 4, mu: 58, ne: 62, ji: 55, mer: 8, grade: 0, gsk: 0, pool };
  let w = 0, c = 0; const rng = DL.mulberry(12345);
  for (const e of POOL1) for (let i = 0; i < N; i++) { w += new DL.Duel(p, e, {}, rng, i * 7919 + c).runSim(0.5).win ? 1 : 0; c++; }
  const r = 100 * w / c, ok = Math.abs(r - TGT[n]) <= 2; if (!ok) bad++;
  console.log(`초식 ${n}: JS ${r.toFixed(1)} / sim ${TGT[n]} → ${ok ? 'OK' : 'FAIL'}`);
}
process.exit(bad ? 1 : 0);
