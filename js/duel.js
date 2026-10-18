// F8 v0.5.1 일기토 (sim_v051.py duel() 이식). 0.1초 단위 스텝, 기세 때 파훼 판정을 외부(손/확률)에서 받는다.
'use strict';
(function (root) {
const D = root.D || require('./data.js');
function mulberry(seed) { let a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const F8 = { hpk:45, boss_hp:1.2, p_skill0:20, e_skill0:50, skill_cd:70, gise0:30, gise_cd:60, heal_at:0.4, heal:0.25, heal_j4:0.35, m_heal:0.25, tlim:900, assist:0.15 };
// p = {realm, mu, ne, ji, grade, mer, gsk, cdRed(0.1s), atkMul, firstMul}
// e = [경지, 무, 내, 지, 등급, 특기, 종류(n/b/m), 이름], opts = {eHpMul, window(초)}
class Duel {
  constructor(p, e, opts, rng) {
    opts = opts || {}; this.rng = rng || Math.random; this.p = p; this.e = e; this.log = [];
    const [er, em, en, ej, eg, tr, ek] = e; this.tr = tr; this.ek = ek;
    this.auto = null;
    if (p.realm - er >= 2) this.auto = true; else if (er - p.realm >= 2) this.auto = false;
    this.pa = p.mu * D.MULT[p.realm] * (p.atkMul || 1);
    this.php = p.ne * F8.hpk * D.MULT[p.realm] * (p.mer >= 12 ? 1.1 : 1);
    this.ea = em * D.MULT[er];
    this.ehp = en * F8.hpk * D.MULT[er] * (ek === 'b' ? F8.boss_hp : 1) * (opts.eHpMul || 1);
    this.hp = this.php; this.he = this.ehp;
    this.pcd = Math.max(20, (p.mer >= 8 ? 60 : F8.skill_cd) - (p.cdRed || 0));
    this.heal = p.mer >= 4 ? F8.heal_j4 : F8.heal;
    this.ppct = D.GPCT[p.grade] * (1 + 0.1 * (p.gsk || 0));
    this.ns = F8.p_skill0; this.es = F8.e_skill0; this.nextg = F8.gise0;
    this.stun = 0; this.t = 0; this.nh = 0; this.neh = 0; this.gise = 0; this.okp = 0;
    this.eint = tr === '쾌검' ? 10 / 1.2 : 10; this.nextea = this.eint; this.first = true; this.pfirst = true;
    this.dmgIn = tr === '철벽' ? 0.85 : 1; this.stunLen = tr === '고수' ? 15 : 20;
    this.poison = 0; this.fails2 = 0; this.done = null; this.waiting = false;
    this.baseWindow = opts.window || 1.2; this.pskillReadyAt = this.ns;
  }
  window() { return this.baseWindow + (this.fails2 >= 2 ? 0.5 : 0); }
  L(s) { this.log.push((this.t / 10).toFixed(1) + '초 ' + s); }
  // 한 스텝 앞부분. 기세가 오면 waiting=true로 멈춘다.
  stepA() {
    if (this.done) return;
    if (this.auto !== null) { this.done = { win: this.auto, t: 1, auto: true }; this.L(this.auto ? '경지 차 2 이상: 자동 승리' : '경지 차 2 이상: 자동 패배'); return; }
    if (this.t >= F8.tlim) { this.done = { win: this.he / this.ehp < this.hp / this.php, t: 90, timeout: true }; return; }
    const r = this.rng, t = this.t, b = (this.stun > 0 ? 1.5 : 1) * this.dmgIn;
    this.ev = [];
    if (t > 0 && t % 10 === 0) {
      let d = this.pa * (r() < this.p.ji / 400 ? 1.5 : 1) * b;
      if (this.pfirst && this.p.firstMul) { d *= this.p.firstMul; }
      this.pfirst = false; this.he -= d; this.ev.push(['phit', d]);
    }
    if (t >= this.ns) { const d = this.pa * this.ppct * b; this.he -= d; this.ns = t + this.pcd; this.ev.push(['pskill', d]); this.L('내 초식 ' + Math.round(d)); }
    if (this.gise === 0 && this.he < 1) this.he = 1; // 첫 기세 보장
    if (this.ek === 'm' && this.he < this.ehp * F8.heal_at && this.neh < 1 && this.he > 0) { this.he += this.ehp * F8.m_heal; this.neh++; this.ev.push(['eheal']); this.L('적 운기조식'); }
    if (this.he <= 0) { this.done = { win: true, t: t / 10 }; this.L('승리'); return; }
    if (t >= this.es && this.stun <= 0) {
      const d = this.ea * D.GPCT[this.e[4]]; this.hp -= d; this.es = t + F8.skill_cd; this.ev.push(['eskill', d]); this.L('적 초식 ' + Math.round(d));
      if (this.tr === '독공') this.poison = 30;
    }
    if (t === this.nextg) { this.gise++; this.nextg += F8.gise_cd; this.waiting = true; this.L('기세 #' + this.gise); return; }
    if (t >= this.nextea - 1e-9) {
      if (this.stun <= 0) {
        let d = this.ea * (r() < this.e[3] / 400 ? 1.5 : 1);
        if (this.first && this.tr === '돌격') d *= 2;
        this.first = false; this.hp -= d; this.ev.push(['ehit', d]);
      }
      this.nextea += this.eint;
    }
    this.stepB();
  }
  parry(ok) {
    if (!this.waiting) return;
    this.waiting = false;
    if (ok) { this.stun = this.stunLen; this.okp++; this.fails2 = 0; this.ev.push(['parryok']); this.L('파훼 성공'); }
    else { const d = this.ea * 3; this.hp -= d; this.fails2++; this.ev.push(['parryfail', d]); this.L('파훼 실패 강타 ' + Math.round(d)); }
    this.stepB();
  }
  stepB() {
    if (this.poison > 0) { if (this.poison % 10 === 0) this.hp -= this.php * 0.01; this.poison--; }
    if (this.hp < this.php * F8.heal_at && this.nh < 1 && this.hp > 0) { this.hp = Math.min(this.php, this.hp + this.php * this.heal); this.nh++; this.ev.push(['pheal']); this.L('운기조식 자동'); }
    if (this.hp <= 0) { this.done = { win: false, t: this.t / 10 }; this.L('패배'); return; }
    this.stun--; this.t++;
  }
  // 확률 파훼로 끝까지 (예상 승률·디버그용)
  runSim(parryRate) {
    let guard = 0;
    while (!this.done && guard++ < 5000) {
      this.stepA();
      if (this.waiting) this.parry(this.rng() < Math.min(0.95, parryRate + (this.fails2 >= 2 ? F8.assist : 0)));
    }
    return { win: this.done.win, t: this.done.t, gise: this.gise, ok: this.okp };
  }
}
const cache = {};
function winProb(p, e, opts, parry, n) {
  n = n || 100; const key = JSON.stringify([p, e, opts, Math.round(parry * 100)]);
  if (cache[key]) return cache[key];
  const rng = mulberry(7); let w = 0, len = 0, g = 0;
  for (let i = 0; i < n; i++) { const r = new Duel(p, e, opts, rng).runSim(parry); if (r.win) w++; len += r.t; g += r.gise; }
  return (cache[key] = { w: w / n, len: len / n, gise: g / n });
}
function band(w) { return w >= 0.9 ? ['쉬움','g'] : w >= 0.6 ? ['해볼 만함','y'] : w >= 0.2 ? ['위험','o'] : ['무모','r']; }
const api = { Duel, winProb, band, mulberry, F8 };
if (typeof module !== 'undefined') module.exports = api; else root.DuelLib = api;
})(typeof window !== 'undefined' ? window : globalThis);
