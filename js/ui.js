// murim 1단계 UI
'use strict';
(function () {
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = { tab: 'map', sub: { char: 'me', base: 'inn' }, sel: null, flash: [], busy: false, replay: null, lastDuelLog: [], instant: false, autoParry: false };
window.UI = UI;
const S = () => G.S;
const bandBadge = w => { const [t, c] = DuelLib.band(w); return '<span class="badge b-' + c + '">' + t + (G.debug ? ' ' + Math.round(w * 100) + '%' : '') + '</span>'; };

// ---------- 공통: 토스트·모달 ----------
function flushToasts() { while (G.msgs.length) { const d = document.createElement('div'); d.textContent = G.msgs.shift(); const tb = $('#toast'); tb.appendChild(d); while (tb.children.length > 4) tb.firstChild.remove(); setTimeout(() => d.remove(), 3300); } }
function modal(o) { // {title, text, html, buttons:[{t, cls, fn, keep}]}
  return new Promise(res => {
    const m = $('#modal'); m.classList.remove('hidden');
    m.innerHTML = '<div class="sheet"><h2>' + esc(o.title || '') + '</h2>' + (o.text ? '<div class="txt">' + esc(o.text) + '</div>' : '') + (o.html || '') + '<div class="btns"></div></div>';
    const box = m.querySelector('.btns');
    (o.buttons || [{ t: '확인', cls: 'pri' }]).forEach((b, i) => { const el = document.createElement('button'); el.className = 'big ' + (b.cls || ''); el.textContent = b.t; el.disabled = !!b.disabled;
      el.onclick = () => { m.classList.add('hidden'); m.innerHTML = ''; if (b.fn) b.fn(); res(i); }; box.appendChild(el); });
    if (o.after) o.after(m);
  });
}
UI.modal = modal;
function refresh() { if (!S()) return; G.claimable(); render(); flushToasts(); }
UI.refresh = refresh;
// 사건 큐 처리
async function drain() {
  if (UI.busy) return; UI.busy = true;
  try { while (G.queue.length) { const ev = G.queue.shift(); refresh(); await handle(ev); } }
  finally { UI.busy = false; refresh(); }
}
UI.drain = drain;
async function handle(ev) {
  const s = S();
  switch (ev.type) {
    case 'info': await modal({ title: ev.title, text: ev.text }); break;
    case 'kiyeon': await kiyeonUI(ev); break;
    case 'encounter': { const e = G.enemyOf(ev.id); const w = G.predict(e, 'enemy', ev.id).w;
      await modal({ title: '적 조우', text: D.LOCAL[ev.id][0] + '와(과) 마주쳤다! (행동 추가 소모 없음)', html: '<p>예상 승률 ' + bandBadge(w) + '</p>' });
      const win = await duelUI(e, G.duelOpts('enemy', ev.id), { w }); G.fightResult({ kind: 'enemy', id: ev.id }, win, w); break; }
    case 'story': await storyUI(ev); break;
    case 'tourney': await tourneyUI(ev.t); break;
    case 'omen': { const [t, x] = G.omenText(ev.n); await modal({ title: t, text: x }); G.omen(ev.n); break; }
    case 'rival23': await rivalUI(); break;
    case 'branch': await branchUI(); break;
    case 'tatongHint': await tatongHintUI(); break;
  }
  flushToasts();
}
// ---------- 시작 화면 ----------
function startScreen() {
  const has = !!G.load(); const el = $('#start'); el.classList.remove('hidden'); $('#main').classList.add('hidden');
  el.innerHTML = '<h1>강호쟁패</h1><p class="muted">(가제) · 1단계 프로토타입</p><p>정마대전 전야, 검 한 자루뿐인 삼류 낭인.</p>' +
    (has ? '<button class="big pri" id="cont">이어 하기</button>' : '') +
    '<input id="nm" maxlength="8" placeholder="이름" value="한무결"><button class="big ' + (has ? '' : 'pri') + '" id="new">새 게임</button>' +
    '<button class="big ghost" id="skip">튜토리얼 건너뛰기로 새 게임</button>';
  if (has) $('#cont').onclick = () => enterGame(false);
  const go = async (skip) => {
    if (has && !(await confirmP('새 게임을 시작하면 기존 저장이 지워집니다.'))) return;
    if (skip && !(await confirmP('튜토리얼을 건너뛸까요? 남은 단계 보상은 즉시 지급됩니다.'))) return;
    G.newGame($('#nm').value.trim() || '한무결', skip); enterGame(true);
  };
  $('#new').onclick = () => go(false); $('#skip').onclick = () => go(true);
}
function confirmP(text, yes, no) { return modal({ title: '확인', text, buttons: [{ t: yes || '예', cls: 'pri' }, { t: no || '아니오' }] }).then(i => i === 0); }
async function enterGame(isNew) {
  $('#start').classList.add('hidden'); $('#main').classList.remove('hidden');
  if (isNew) {
    G.push({ type: 'info', title: '귀주의 산골 마을', text: S().name + ', 25세. 소속 없는 삼류 낭인. 낡은 검 한 자루와 은자 100냥.\n\n산적에게 쫓기던 나무꾼을 구하고, 객잔에서 개방 거지 취팔 노개를 만났다.\n"막힌 혈은 앉아서 뚫는 거야. 강해지고 싶으면 걷고, 앉고, 또 걸어."' });
  } else {
    const q = new URLSearchParams(location.search); const off = parseFloat(q.get('offline'));
    if (G.debug && !isNaN(off)) { S().off.lastSeen -= off * 60000; S().off.maxSeen = S().off.lastSeen; S().off.bucketTs -= off * 60000; history.replaceState(null, '', location.pathname + '?debug=1'); }
    await outUI(G.processOffline());
  }
  refresh(); drain();
}
// ---------- 상단 바 ----------
const progTxt = i => { const p = G.goalProg(i); return p ? ' (' + Math.min(p[0], p[1]) + '/' + p[1] + ')' : ''; };
const todoHint = () => { const w = G.whereTo(); return w.ids.length && w.why ? ' → ' + (w.why.indexOf('길') >= 0 || w.why.indexOf('미방문') >= 0 || w.why.indexOf('객잔') >= 0 ? w.why : w.ids.map(G.rname).join('·')) : ''; };
function topHTML() {
  const s = S(); let h = '';
  const P = s.tut.path;
  if (s.route === 3 && P && !P.skipped && P.step < 5) {
    const r = D.RTUT[P.step]; h += '<div class="goal"><span class="gt">🧭 ' + esc(r.goal) + '</span></div>';
  } else if (s.route === 3) h += '<div class="goal"><span class="gt">🧭 홀로 걷는 길: 현상금·호위로 이름을 떨쳐라 (25~30턴)</span></div>';
  else {
    const lines = G.goalLines(), cl = G.claimable();
    lines.forEach((i, k) => { const ok = G.goalCond(i); const sub = k > 0 && !D.GOALS[i][2];
      h += '<div class="goal ' + (sub ? 'sub ' : '') + (ok ? 'ok' : '') + '"><span class="gt">' + (k === 0 ? '🎯 ' : '· ') + esc(D.GOALS[i][0]) + '<b style="color:#fbbf24">' + progTxt(i) + '</b><span class="muted">' + esc(G.giveText(D.GOALS[i][1])) + '</span></span>' +
        (k === 0 ? '<button class="sm ' + (cl.length ? 'pri glow' : '') + '" id="claim" ' + (cl.length ? '' : 'disabled') + '>받기' + (cl.length > 1 ? ' ' + cl.length : '') + '</button><button class="sm icon' + (s.todo ? ' glow' : '') + '" id="where" title="어디로?">➜</button>' : '') + '</div>'; });
    if (!lines.length) h += '<div class="goal"><span class="gt">🎯 1막 목표를 모두 마쳤다</span></div>';
  }
  if (s.todo && !s.route) h += '<div class="goal sub" style="color:#fbbf24;font-weight:700" id="todo"><span class="gt">👉 지금 할 일: ' + esc((s.goals.mainIdx >= 0 && D.GOALS[s.goals.mainIdx] ? D.GOALS[s.goals.mainIdx][0] + progTxt(s.goals.mainIdx) : G.nowTodo()) + todoHint()) + '</span></div>';
  const lk = G.breakLock();
  if (lk && !G.tatongSpot(s.loc) && s.route !== 3) h += '<div class="goal sub"><span class="gt">⚠ 타통하려면 객잔이나 산으로</span></div>';
  h += '<div class="statrow"><span>' + G.dateStr() + ' (' + s.turn + '턴)</span><span class="acts">' + '●'.repeat(Math.max(0, s.acts)) + '<span style="color:#57534e">' + '●'.repeat(3 - Math.max(0, s.acts)) + '</span></span><span>💰' + s.silver + '</span><span class="sp"></span>' +
    '<button class="icon sm" id="rest" title="폐관에 들고 쉬기">🕯️</button><button class="icon sm" id="help">?</button><button class="icon sm" id="set">⚙</button></div>';
  return h;
}
// ---------- 지도 ----------
const XY = id => { const r = D.REGIONS[id]; return [18 + r[1] * 354, 16 + r[2] * 528]; };
const TER = { '마을': '#c08a52', '도시': '#7c8aa0', '산': '#4d7c0f', '강': '#0e7490', '변방': '#78716c' };
function mapSVG() {
  const s = S(); if (s.todo && !UI.flash.length) UI.flash = G.whereTo().ids;
  const mt = G.moveTargets(), reveal = !!s.ev.branched && s.ev.branched !== false;
  let h = '<svg class="map" viewBox="0 0 390 560" preserveAspectRatio="xMidYMid meet">';
  const done = {};
  for (const a in D.ADJ) for (const b of D.ADJ[a]) { const k = [a, b].sort().join(); if (done[k]) continue; done[k] = 1; const [x1, y1] = XY(a), [x2, y2] = XY(b);
    const hl = (a === s.loc && mt[b]) || (b === s.loc && mt[a]); h += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (hl ? '#fbbf24' : '#57534e') + '" stroke-width="' + (hl ? 2.5 : 1.2) + '"/>'; }
  for (const id in D.REGIONS) {
    const [x, y] = XY(id), r = G.risk(id), cl = G.closed(id);
    let ring = r <= s.realm ? '#22c55e' : r === s.realm + 1 ? '#f97316' : '#ef4444';
    let fill = cl ? '#3f3f46' : TER[G.kind(id)];
    if (reveal && s.ev.branched !== false && s.revealMap) fill = D.FACTION_COLOR[s.owners[id][1]] || fill;
    const adj = mt[id], fl = UI.flash.indexOf(id) >= 0;
    h += '<g class="node' + (fl ? ' flash' : '') + '" data-id="' + id + '">';
    if (adj) h += '<circle cx="' + x + '" cy="' + y + '" r="24" fill="#fbbf2433" stroke="#fbbf24" stroke-width="2"/>';
    if (UI.sel === id) h += '<circle cx="' + x + '" cy="' + y + '" r="27" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="5 3"/>';
    h += '<circle cx="' + x + '" cy="' + y + '" r="18" fill="' + fill + '" stroke="' + (cl ? '#71717a' : ring) + '" stroke-width="3.5"/>';
    h += '<text x="' + x + '" y="' + (y + 6) + '" text-anchor="middle" font-size="17" font-weight="700" fill="#fff">' + (cl ? '🔒' : r) + '</text>';
    h += '<text x="' + x + '" y="' + (y + 37) + '" text-anchor="middle" font-size="18" font-weight="600" fill="#f5f5f4" stroke="#1c1917" stroke-width="3" paint-order="stroke">' + G.rname(id) + '</text>';
    if ((s.chaos[id] || 0) >= s.turn && s.visited.indexOf(id) >= 0) h += '<text x="' + (x + 13) + '" y="' + (y - 9) + '" font-size="11">🔥</text>';
    if (id === s.loc) h += '<text x="' + (x - 7) + '" y="' + (y - 14) + '" font-size="16">🗡️</text>';
    h += '<circle cx="' + x + '" cy="' + y + '" r="33" fill="transparent"/></g>';
  }
  return h + '</svg>';
}
function regionCard(id) {
  const s = S(), cl = G.closed(id), here = id === s.loc;
  let h = '<div class="card"><h3>' + G.rname(id) + ' <span class="badge b-n">' + G.kind(id) + '</span> <span class="badge b-' + (G.risk(id) <= s.realm ? 'g' : G.risk(id) === s.realm + 1 ? 'o' : 'r') + '">위험도 ' + G.risk(id) + '</span>' +
    '<span style="flex:1"></span><span class="muted">' + (G.has(id, '객') ? '🏮객잔 ' : '') + (G.has(id, '상') ? '💊약방 ' : '') + (D.MYEONGMUL[id] ? '🎁명물' : '') + '</span></h3>';
  if (cl) return h + '<div class="row">🔒 ' + D.CLOSED[id] + ' (25턴부터)</div></div>';
  const e = G.enemyOf(id), we = G.predict(e, 'enemy', id).w, sm = G.sweepMul(id), k = s.sweep[id] || 0;
  h += '<div class="row"><span class="f">⚔ ' + D.LOCAL[id][0] + ' <span class="muted">' + D.LOCAL[id][2] + '</span></span>' + bandBadge(we) + '</div>';
  h += '<div class="row"><span class="muted">소탕도</span><div class="bar"><i style="width:' + Math.max(0, 100 - k * 33) + '%;background:' + (k ? '#78716c' : '#22c55e') + '"></i></div>' + (k ? '<span class="muted">소탕도 ×' + (k <= 2 ? 0.5 : 0.25) + '</span>' : '') + '</div>';
  if (k >= 1) h += '<div class="muted">이 고을 졸개들은 몸을 사린다</div>';
  { const dd = s.realm - G.risk(id); if (dd >= 1) h += '<div class="muted">경지 차 감쇠: 출몰 적 보상 ×' + (dd === 1 ? 0.5 : 0.25) + '</div>'; }
  if (id === 'yunnan' && s.turn >= 2 && G.pres() < 300) h += '<div class="muted">은거 고수: 개인 위신 300 필요 (현재 ' + G.pres() + ')</div>';
  if (G.bossAlive(id)) { const wb = G.predict(G.bossOf(id), 'boss', id).w; h += '<div class="row"><span class="f">👹 ' + D.LOCAL[id][1] + ' (' + D.REALM[G.bossOf(id)[0]] + ')' + (s.resp[id] ? ' <span class="badge b-r">재등장</span>' : '') + ((s.bossLoss[id] || 0) ? ' <span class="muted">지난 싸움의 상처가 남았다</span>' : '') + '</span>' + bandBadge(wb) + '</div>'; }
  else h += '<div class="row muted">👹 ' + D.LOCAL[id][1] + ' — 처치함 (' + (6 - (s.turn - s.dead[id])) + '턴 뒤 재등장)</div>';
  if (here) { const mt = G.moveTargets(); h += '<div class="muted" style="margin-top:4px">갈 수 있는 곳 (눌러서 선택)</div><div class="nbs">' + Object.keys(mt).map(n => '<button data-nb="' + n + '"><span class="badge b-' + (G.risk(n) <= s.realm ? 'g' : G.risk(n) === s.realm + 1 ? 'o' : 'r') + '">' + G.risk(n) + '</span> ' + G.rname(n) + (s.visited.indexOf(n) < 0 ? ' ·새' : '') + '</button>').join('') + '</div>'; }
  return h + '</div>';
}
function mapTab() {
  const s = S(), sel = UI.sel || s.loc;
  let h = '<div class="mapwrap">' + mapSVG() + '</div>';
  if (UI.sel && UI.sel !== s.loc) { const mt = G.moveTargets(), id = UI.sel;
    h += '<div class="selbar"><b>' + G.rname(id) + ' · 위험도 ' + G.risk(id) + (G.closed(id) ? ' 🔒' : '') + '</b><button class="sm ' + (mt[id] ? 'pri' : '') + '" id="goBtn" ' + (mt[id] && (s.acts > 0 || s.off.steps > 0) ? '' : 'disabled') + '>' + (mt[id] ? '이동 (' + mt[id] + '칸)' : '인접 아님') + '</button><button class="sm" id="selX">✕</button></div>'; }
  else h += '<div class="rumor">📜 ' + esc(s.rumor) + '</div>';
  const cardHTML = regionCard(sel);
  const glow = G.tatongGlow() && s.turn <= 24;
  const B = (id, label, why, cls) => '<button id="' + id + '" class="' + (cls || '') + '" ' + (why ? 'disabled' : '') + '>' + label + '<small>' + (why ? esc(why) : '&nbsp;') + '</small></button>';
  const tb = G.tatongBlock();
  h += '<div class="acts-grid">' + B('aTrain', '수련', G.canAct('train')) + B('aFight', '싸움', G.canAct('fight')) + B('aExplore', '탐색', G.canAct('explore')) +
    B('aMove', '이동', s.acts <= 0 && s.off.steps <= 0 ? '행동 없음' : null) +
    '<button id="aTat" class="' + (glow ? 'glow' : '') + '" ' + (tb ? 'disabled' : '') + '>' + (s.mer >= 12 && !s.imdok ? '생사현관' : '타통') + '<small>' + (tb ? esc(tb) : (glow ? '정경 ' + s.mer + '/' + G.gateMer() + ' · ' : '') + '은자 ' + G.tatongCost() + (s.warm ? ' (온양)' : '')) + '</small></button>' +
    B('aEnd', '턴 종료', null, s.acts === 0 ? 'pri' : '') + '</div>';
  const lk = G.breakLock();
  h += '<div class="extra">';
  if (G.canBreak()) h += '<button class="big pri glow" id="aBreak">⚡ ' + D.REALM[s.realm + 1] + ' 돌파!</button>';
  else if (lk) h += '<button class="big" id="aLock">🔒 돌파 잠김 · ' + esc(lk) + '</button>';
  if (s.route === 3) h += '<button class="big" id="myPath">🧭 나의 길</button>';
  if (s.injured && s.items['금창약']) h += '<button class="big" id="useGeum">금창약 사용</button>';
  h += '</div>' + cardHTML + '<div style="height:8px"></div>';
  return h;
}
// ---------- 인물 ----------
function charTab() {
  const s = S(), sub = UI.sub.char;
  let h = '<div class="tabs2">' + [['me', '주인공'], ['mer', '경맥'], ['wanted', '수배첩']].map(([k, t]) => '<button data-sub="' + k + '" class="' + (sub === k ? 'on' : '') + '">' + t + '</button>').join('') + '</div>';
  if (sub === 'me') {
    h += '<div class="card"><h3>' + esc(s.name) + ' <span class="badge b-y">' + D.REALM[s.realm] + '</span>' + (s.equipped ? ' <span class="badge b-n">' + esc(s.equipped) + '</span>' : '') + '</h3><div class="kv">' +
      '<span>수련치</span><b>' + Math.floor(s.xp) + (s.realm < 5 ? ' / ' + G.needXp() : '') + (s.off.reserve > 0 ? ' (잔여 기운 ' + Math.round(s.off.reserve) + ')' : '') + '</b>' +
      '<span>무력 / 내공 / 지략</span><b>' + s.mu + ' / ' + s.ne + ' / ' + s.ji + '</b>' +
      '<span>무공</span><b>검법 ' + D.GNAME[s.grade] + (s.gsk ? ' · 초식 숙련 +' + s.gsk * 10 + '%' : '') + '</b>' +
      '<span>정경</span><b>' + s.mer + ' / 12' + (s.imdok ? ' + 임독양맥' : '') + '</b>' +
      '<span>개인 명성 / 위신</span><b>' + s.fame + ' / ' + G.pres() + '</b>' +
      '<span>협행 / 악행</span><b>' + s.hyeop + ' / ' + s.ak + '</b>' +
      '<span>파훼</span><b>' + Math.round(G.parryRate() * 100) + '% (최근 ' + s.parryHist.length + '번)</b>' +
      '<span>상태</span><b>' + [s.injured ? '부상' : '', s.warm ? '온양' : '', s.freeTat ? '노개의 가르침' : '', s.firstAtk ? '첫 공격 +50%' : '', s.haomun ? '두목 체력 −20%' : '', s.off.steps ? '날랜 걸음 ' + s.off.steps : ''].filter(Boolean).join(', ') + '</b>' +
      '<span>토벌록</span><b>' + s.kills + '명</b>' +
      '<span>소지품</span><b>금창약 ' + s.items['금창약'] + ' · 소환단 ' + s.items['소환단'] + '</b></div>' +
      '<div class="row" style="margin-top:6px"><button class="sm" id="useSoh" ' + (s.items['소환단'] ? '' : 'disabled') + '>소환단 먹기</button><button class="sm" id="useGeum2" ' + (s.items['금창약'] && s.injured ? '' : 'disabled') + '>금창약 쓰기</button></div></div>';
    h += '<div class="card"><h3>별호</h3>' + (s.titles.length ? s.titles.map(t => '<div class="row"><span class="f">' + esc(t) + (s.equipped === t ? ' (장착)' : '') + '</span>' + (s.equipped !== t ? '<button class="sm" data-eq="' + esc(t) + '" ' + (s.fame >= 100 ? '' : 'disabled') + '>장착' + (s.fame >= 100 ? '' : '(명성 100)') + '</button>' : '') + '</div>').join('') : '<div class="muted">아직 없다. 첫 두목을 쓰러뜨려라.</div>') + '</div>';
  } else if (sub === 'mer') {
    h += '<div class="card"><h3>경맥 <span class="muted">' + (s.realm < 5 ? '다음 경지 ' + D.REALM[s.realm + 1] + ': 정경 ' + s.mer + '/' + G.gateMer() + (s.realm === 4 ? ' + 임독양맥' : '') : '') + '</span></h3><div class="mer">' +
      D.JUNG.map((n, i) => '<div class="' + (i < s.mer ? 'o' : i === s.mer ? 'n' : '') + '">' + (i + 1) + '. ' + n + (i === 3 ? ' ★운기' : i === 7 ? ' ★초식' : i === 11 ? ' ★체력' : '') + '</div>').join('') +
      '<div class="' + (s.imdok ? 'o' : s.mer >= 12 ? 'n' : '') + '">임맥 (생사현관)</div><div class="' + (s.imdok ? 'o' : s.mer >= 12 ? 'n' : '') + '">독맥 (생사현관)</div>' +
      D.GIGYEONG.map(n => '<div class="l">🔒 ' + n + '</div>').join('') + '</div>' +
      '<p class="muted">기경 6맥은 초절정에 이른 뒤에 열린다. 생사현관: 정경 12 + 절정 수련치 2,000, 은자 300, 16턴부터' + (s.turn < 16 ? ' — 아직 몸이 받아들이지 못한다' : '') + '</p>' +
      '<div class="kv"><span>단계 보너스</span><b>정경 4: 운기 35% · 8: 초식 쿨 6초 · 12: 체력 +10%</b><span>타통</span><b>' + (G.tatongBlock() || '가능 · 은자 ' + G.tatongCost()) + '</b><span>정경 추가원(1막)</span><b>' + s.extraJung + ' / 3</b></div></div>';
  } else {
    const ks = Object.keys(s.bossesKilled);
    h += '<div class="card"><h3>현상 수배첩 <span class="muted">' + ks.length + ' / 24</span></h3><div class="wanted">' +
      Object.keys(D.REGIONS).map(id => { const k = !!s.bossesKilled[id], seen = s.visited.indexOf(id) >= 0;
        const b = s.bounties.find(x => x.tgt === id) || s.bountyOffer.find(x => x.tgt === id);
        return '<div class="' + (k ? 'k' : '') + '">' + (k || seen ? D.LOCAL[id][1] : '???') + '<br><span class="muted">' + G.rname(id) + '</span>' + (s.resp[id] && G.bossAlive(id) ? '<br><span style="color:#f87171">재등장</span>' : '') + (s.route === 3 && b ? '<br><span style="color:#fbbf24">💰현상금 ' + 60 * G.risk(id) + '</span>' : '') + '</div>'; }).join('') + '</div>' +
      '<p class="muted">5명: 명성 20·은자 100 / 10명: 명성 40·은자 150 + 별호 흑도사냥꾼 / 15명: 명성 60·은자 200</p></div>';
  }
  return h;
}
// ---------- 거점 ----------
function baseTab() {
  const s = S(), sub = UI.sub.base, loc = s.loc;
  const tabs = [['inn', '객잔', G.has(loc, '객')], ['shop', '약방', G.has(loc, '상')], ['mm', '명물', !!D.MYEONGMUL[loc] || (s.merchant && s.merchant.kind === 'mm')]];
  let h = '<div class="tabs2">' + tabs.map(([k, t, ok]) => '<button data-sub="' + k + '" class="' + (sub === k ? 'on' : '') + '" ' + (ok ? '' : 'style="opacity:.5"') + '>' + t + '</button>').join('') + '</div>';
  if (s.quests.length || s.bounties.length || s.escort) {
    h += '<div class="card"><h3>진행 중</h3>' + s.quests.map(q => '<div class="row"><span class="f">' + q.kind + ' · ' + G.rname(q.tgt) + (q.kind === '토벌' ? ' (남은 ' + q.left + '명)' : '') + '</span><span class="muted">기한 ' + q.ttl + '턴</span></div>').join('') +
      s.bounties.map(b => '<div class="row"><span class="f">💰현상금 · ' + D.LOCAL[b.tgt][1] + ' (' + G.rname(b.tgt) + ')</span><span class="muted">기한 ' + b.ttl + '턴</span></div>').join('') +
      (s.escort ? '<div class="row"><span class="f">🛡️호위 · ' + G.rname(s.escort.tgt) + '까지</span></div>' : '') + '</div>';
  }
  if (sub === 'inn') {
    if (s.turn < 2) h += '<div class="card muted">객잔 의뢰판은 2턴에 열린다.</div>';
    else if (!G.has(loc, '객')) h += '<div class="card muted">이 지역엔 객잔이 없다.</div>';
    else { const b = G.getBoard(); h += '<div class="card"><h3>객잔 의뢰판 <span class="muted">동시 최대 2개 · 기한 3턴</span></h3>' + (b.list.length ? b.list.map((q, i) => {
        const v = q.fixed || Math.round(30 * G.risk(q.tgt) * q.mul * G.pmult()); const fm = q.fixedFame || q.fm * G.risk(q.tgt);
        return '<div class="row"><span class="f">' + (q.kind === '토벌' ? '⚔' : q.kind === '배달' ? '📦' : '👁') + ' ' + q.kind + ' · ' + G.rname(q.tgt) + (q.tgt === loc ? '' : '(인접)') + '<br><span class="muted">' + (q.kind === '토벌' ? '출몰 적 ' + q.left + '명 처치' : q.kind === '배달' ? '그 지역 방문' : '그 지역 탐색 1회') + ' · 은자 ' + v + ' · 명성 ' + fm + '</span></span><button class="sm pri" data-q="' + i + '">받기</button></div>'; }).join('') : '<div class="muted">남은 의뢰가 없다.</div>') + '</div>';
      if (s.route === 3) {
        h += '<div class="card"><h3>💰 현상금 <span class="muted">기한 4턴 · 동시 2건</span></h3>' + (s.bountyOffer.length ? s.bountyOffer.map((x, i) => '<div class="row"><span class="f">' + D.LOCAL[x.tgt][1] + ' (' + G.rname(x.tgt) + ')<br><span class="muted">은자 ' + 60 * G.risk(x.tgt) + ' · 명성 ' + 10 * G.risk(x.tgt) + '</span></span><button class="sm pri" data-b="' + i + '">수락</button></div>').join('') : '<div class="muted">걸린 현상금이 없다.</div>') + '</div>';
        h += '<div class="card"><h3>🛡️ 호위</h3>' + (s.escortOffer ? '<div class="row"><span class="f">상인과 ' + G.rname(s.escortOffer.tgt) + '까지<br><span class="muted">이동마다 30% 습격 · 보수 ' + Math.round(30 * G.risk(s.escortOffer.tgt) * (s.escortOffer.river ? 1.8 : 1.5) * G.pmult()) + '</span></span><button class="sm pri" id="escAcc">수락</button></div>' : '<div class="muted">호위 의뢰는 도시·강 객잔에서만 나온다.</div>') + '</div>';
      } }
  } else if (sub === 'shop') {
    if (s.turn < 2) h += '<div class="card muted">약방은 2턴에 열린다.</div>';
    else if (!G.has(loc, '상')) h += '<div class="card muted">이 지역엔 약방이 없다.</div>';
    else h += '<div class="card"><h3>약방</h3>' + D.SHOP.filter(x => !x.city || G.kind(loc) === '도시').map(x => { const p = G.price('shop', x.id, x.price);
      return '<div class="row"><span class="f">' + x.name + ' <b>' + p + '</b>' + (p < x.price ? ' <span class="badge b-y">약장수 할인</span>' : '') + '<br><span class="muted">' + x.desc + '</span></span><button class="sm pri" data-buy="shop:' + x.id + '">사기</button></div>'; }).join('') + '</div>';
  } else {
    if (s.turn < 5) h += '<div class="card muted">지역 명물은 5턴에 열린다.</div>';
    else { const ids = [loc].concat(s.merchant && s.merchant.kind === 'mm' && s.merchant.id !== loc ? [s.merchant.id] : []).filter(id => D.MYEONGMUL[id]);
      h += '<div class="card"><h3>그 고장의 영약·병기</h3>' + (ids.length ? ids.map(id => { const m = D.MYEONGMUL[id], p = G.price('mm', id, m.price);
        const lockQ = id === 'qinghai' && s.turn <= 24 && (!G.jungOk() || s.mer >= 12);
        return '<div class="row"><span class="f">' + G.rname(id) + ' ' + m.name + ' <b>' + p + '</b>' + (p < m.price ? ' <span class="badge b-y">약장수 할인</span>' : '') + '<br><span class="muted">' + (lockQ ? '진열만 됨 — 25턴부터' : m.desc) + (m.lim === 'once' ? ' · 1회' : ' · 턴당 1') + '</span></span><button class="sm pri" data-buy="mm:' + id + '">사기</button></div>'; }).join('') : '<div class="muted">이 고장엔 이름난 물건이 없다.</div>') + '</div>'; }
  }
  return h;
}
// ---------- 렌더 ----------
function render() {
  const s = S(); if (!s) return;
  $('#top').innerHTML = topHTML();
  $('#content').innerHTML = UI.tab === 'map' ? mapTab() : UI.tab === 'char' ? charTab() : baseTab();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
  bind(); bubble(); if (G.debug) debugPanel();
}
function on(id, fn) { const e = document.getElementById(id); if (e) e.onclick = fn; }
function bind() {
  const s = S();
  on('claim', () => { G.claim(); checkWanted(); refresh(); drain(); });
  on('where', whereTo);
  on('rest', restSheet); on('help', helpCards); on('set', settings);
  document.querySelectorAll('.node').forEach(n => n.onclick = () => { UI.sel = n.dataset.id; if (UI.sel === s.loc) UI.sel = null; refresh(); });
  on('goBtn', () => doMove(UI.sel)); on('selX', () => { UI.sel = null; refresh(); });
  document.querySelectorAll('[data-nb]').forEach(b => b.onclick = () => { UI.sel = b.dataset.nb; refresh(); document.getElementById('content').scrollTop = 0; });
  on('aTrain', () => { G.train(); afterAct(); });
  on('aFight', fightSheet);
  on('aExplore', () => { G.explore(); afterAct(); });
  on('aMove', () => { G.toast('지도에서 빛나는 이웃 지역을 눌러 이동하세요'); flushToasts(); });
  on('aTat', tatongUI);
  on('aEnd', async () => { if (s.acts > 0 && !(await confirmP('행동이 ' + s.acts + '개 남았다. 턴을 끝낼까?'))) return; G.endTurn(); UI.sel = null; UI.flash = []; afterAct(); });
  on('aBreak', breakUI);
  on('aLock', () => { if (s.tut.personal) s.tut.personal.seen.meridian = true; UI.tab = 'char'; UI.sub.char = 'mer'; refresh(); });
  on('myPath', () => routeCards(true));
  on('useGeum', () => { G.useItem('금창약'); refresh(); }); on('useGeum2', () => { G.useItem('금창약'); refresh(); }); on('useSoh', () => { G.useItem('소환단'); refresh(); });
  document.querySelectorAll('.tabs2 button').forEach(b => b.onclick = () => { UI.sub[UI.tab] = b.dataset.sub; if (UI.tab === 'char') { s.tut.personal.seen[b.dataset.sub === 'mer' ? 'meridian' : b.dataset.sub === 'wanted' ? 'wanted' : 'x'] = true; G.save(); } refresh(); });
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const e = G.acceptQuest(+b.dataset.q); if (e) G.toast(e); refresh(); });
  document.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const e = G.acceptBounty(+b.dataset.b); if (e) G.toast(e); refresh(); });
  on('escAcc', () => { const e = G.acceptEscort(); if (e) G.toast(e); refresh(); });
  document.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const [k, id] = b.dataset.buy.split(':'); const e = G.buy(k, id); if (e) G.toast(e); afterAct(); });
  document.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => { s.equipped = b.dataset.eq; G.save(); refresh(); });
}
function afterAct() { checkWanted(); refresh(); drain(); }
function checkWanted() { // 수배첩 단계 보상(자동)
  const s = S(), n = Object.keys(s.bossesKilled).length;
  [[5, 20, 100], [10, 40, 150], [15, 60, 200]].forEach(([k, f, sv]) => { if (n >= k && !s.wantedRw[k]) { s.wantedRw[k] = 1; s.fame += f; s.silver += sv; if (k === 10) G.addTitle('흑도사냥꾼'); G.push({ type: 'info', title: '수배첩 ' + k + '명', text: '명성 +' + f + ', 은자 +' + sv }); } });
  G.save();
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; refresh(); });
// ---------- 이동 ----------
async function doMove(id) {
  const s = S(); if (!id) return; const r = G.risk(id);
  if (r > s.realm) { const w = G.predict(G.enemyOf(id), 'enemy', id).w;
    if (!(await confirmP('이 지역의 적은 당신보다 ' + (r - s.realm) + '경지 위입니다. 예상 승률: ' + DuelLib.band(w)[0] + '\n그래도 가겠습니까?', '간다', '그만둔다'))) return; }
  G.move(id); UI.sel = null; UI.flash = []; afterAct();
}
function whereTo() { const w = G.whereTo(); UI.flash = w.ids; UI.tab = 'map'; G.toast('➜ ' + (w.why || '') + (w.ids.length ? ': ' + w.ids.map(G.rname).join(', ') : '')); refresh(); setTimeout(() => { UI.flash = []; }, 4200); }
// ---------- 싸움 ----------
async function fightSheet() {
  const s = S(), ts = G.fightTargets();
  let pick = -1;
  await modal({ title: '싸움 · ' + G.rname(s.loc), html: ts.map((t, i) => { const pr = G.predict(t.e, t.kind, t.id); return '<div class="card"><div class="row"><span class="f">' + esc(t.label) + '<br><span class="muted">' + D.REALM[t.e[0]] + ' · 무 ' + t.e[1] + ' 내 ' + t.e[2] + ' · ' + D.GNAME[t.e[4]] + ' · 특기 ' + t.e[5] + '(' + D.TRAITS[t.e[5]] + ')' + (G.debug ? ' · 약 ' + pr.len.toFixed(0) + '초' : '') + '</span></span>' + bandBadge(pr.w) + '</div></div>'; }).join(''),
    buttons: ts.map((t, i) => ({ t: (t.kind === 'boss' ? '두목과 싸운다' : '출몰 적과 싸운다'), cls: 'pri', fn: () => pick = i })).concat([{ t: '그만둔다' }]) });
  if (pick < 0) return; const t = ts[pick], w = G.predict(t.e, t.kind, t.id).w, b = DuelLib.band(w)[0];
  if (b === '위험') { const i = await modal({ title: '위험', text: '예상 승률: 위험. 정말 싸우겠습니까?', buttons: [{ t: '다음에', cls: 'pri' }, { t: '싸운다', cls: 'red' }] }); if (i !== 1) return; }
  if (b === '무모') { if (!(await confirmP('예상 승률: 무모. 정말 싸우겠습니까?', '싸운다', '다음에'))) return;
    if (!(await confirmP('정말 싸우겠습니까? 지면 이번 턴 싸울 수 없습니다.', '그래도 싸운다', '물러난다'))) return; }
  G.useAct(1);
  const tut = !s.tut.personal.skipped && t.kind === 'boss' && t.id === 'guizhou' && !s.bossesKilled.guizhou;
  const win = await duelUI(t.e, G.duelOpts(t.kind, t.id), { w, window: tut ? 2.0 : 1.2, tutorial: tut });
  G.fightResult(t, win, w); afterAct();
}
// 일기토 화면. resolve(win)
function duelUI(e, opts, cfg) {
  cfg = cfg || {}; const s = S();
  return new Promise(resolve => {
    const d = new DuelLib.Duel(G.me(), e.slice(0, 7), Object.assign({}, opts, { window: cfg.window || 1.2 }), G.rand);
    if (d.auto !== null) { G.toast((d.auto ? '압도: ' : '역부족: ') + (e[7] || '상대') + ' (경지 차 2 이상, 자동 판정)'); s.lastDuel = { nm: e[7], win: d.auto, t: 1, gise: 0, ok: 0, log: ['경지 차 자동 판정'] }; flushToasts(); return resolve(d.auto); }
    const ov = $('#overlay'); ov.classList.remove('hidden');
    const nm = e[7] || '상대';
    ov.innerHTML = '<div class="duel"><div class="fighter"><div class="nm"><b>' + esc(nm) + '</b><span>' + D.REALM[e[0]] + ' · ' + (e[5] ? '특기 ' + e[5] : '') + (e[6] === 'm' ? ' · 운기 1' : '') + (e[6] === 'b' ? ' · 두목' : '') + '</span></div><div class="hp"><i id="ehp"></i></div><div class="gise"><i id="gbar"></i></div><div class="muted" id="gtxt">기세 게이지</div></div>' +
      '<div class="arena" id="arena">🗡️ ⚔️ 👤</div><div class="dlog" id="dlog"></div>' +
      '<div class="fighter"><div class="nm"><b>' + esc(s.name) + '</b><span>' + D.REALM[s.realm] + ' · 초식 <span id="cd">준비</span> · 운기 <span id="heal">1/1</span></span></div><div class="hp me"><i id="php"></i></div>' + (cfg.w !== undefined ? '<div class="muted">예상 승률 ' + DuelLib.band(cfg.w)[0] + ' · 내 파훼율 ' + Math.round(G.parryRate() * 100) + '%</div>' : '') + '</div>' +
      '<button class="parry" id="parry" disabled>파훼</button><div class="muted" style="text-align:center">초식·운기조식은 자동. 적이 기를 모으면 [파훼]!</div></div>';
    const P = $('#parry'); let win = null, winT = 0, timer = null, waitTimer = null, startAt = performance.now();
    const arena = $('#arena');
    const pop = (txt, col) => { const el = document.createElement('div'); el.className = 'dmg'; el.style.color = col; el.style.left = (30 + Math.random() * 40) + '%'; el.textContent = txt; arena.appendChild(el); setTimeout(() => el.remove(), 800); };
    const draw = () => {
      $('#ehp').style.width = Math.max(0, d.he / d.ehp * 100) + '%'; $('#php').style.width = Math.max(0, d.hp / d.php * 100) + '%';
      const gp = d.waiting ? 100 : Math.max(0, 100 - (d.nextg - d.t) / 60 * 100); $('#gbar').style.width = gp + '%';
      $('#gtxt').textContent = d.waiting ? '⚠ 기세! 지금 파훼!' : (d.stun > 0 ? '💫 기절 (받는 피해 ×1.5)' : '다음 기세 ' + ((d.nextg - d.t) / 10).toFixed(1) + '초');
      $('#cd').textContent = d.ns - d.t <= 0 ? '준비' : ((d.ns - d.t) / 10).toFixed(1) + '초';
      $('#heal').textContent = (1 - d.nh) + '/1';
      $('#dlog').innerHTML = d.log.slice(-4).map(esc).join('<br>');
      for (const [k, v] of d.ev || []) { if (k === 'pskill') pop('초식 ' + Math.round(v), '#fbbf24'); if (k === 'eskill') pop('적 초식 −' + Math.round(v), '#f87171'); if (k === 'parryok') pop('파훼 성공!', '#86efac'); if (k === 'parryfail') pop('강타 −' + Math.round(v), '#ef4444'); if (k === 'pheal') pop('운기조식', '#60a5fa'); if (k === 'eheal') pop('적 운기', '#c084fc'); }
      d.ev = [];
    };
    const finish = () => { clearInterval(timer); clearTimeout(waitTimer); draw(); const r = d.done;
      UI.lastDuelLog = d.log.slice(); s.lastDuel = { nm, win: r.win, t: r.t, gise: d.gise, ok: d.okp, log: d.log.slice(-40) };
      P.disabled = false; P.classList.remove('live'); P.textContent = r.win ? '승리! (' + r.t.toFixed(1) + '초 · 기세 ' + d.gise + '회 · 파훼 ' + d.okp + ')' : '패배… (' + r.t.toFixed(1) + '초)';
      P.style.fontSize = '18px'; P.onclick = () => { ov.classList.add('hidden'); ov.innerHTML = ''; resolve(r.win); }; };
    const onGise = () => {
      if (UI.instant || UI.autoParry) { const ok = G.rand() < Math.min(0.95, G.parryRate() + (d.fails2 >= 2 ? 0.15 : 0)); d.parry(ok); return; }
      clearInterval(timer); timer = null; P.disabled = false; P.classList.add('live'); const wms = d.window() * 1000;
      P.textContent = '파훼! (' + d.window().toFixed(1) + '초)';
      const t0 = performance.now(); draw();
      P.onclick = () => { if (!d.waiting) return; clearTimeout(waitTimer); resolveP(true); };
      waitTimer = setTimeout(() => resolveP(false), wms);
      function resolveP(ok) { if (!d.waiting) return; s.parryHist.push(ok ? 1 : 0); if (s.parryHist.length > 20) s.parryHist.shift(); d.parry(ok); P.classList.remove('live'); P.disabled = true; P.textContent = ok ? '파훼 성공!' : '파훼 실패…'; P.onclick = null; draw(); if (d.done) return finish(); run(); }
    };
    const stepOnce = () => { d.stepA(); if (d.done) return 'done'; if (d.waiting) return 'gise'; return null; };
    const run = () => {
      if (UI.instant) { let g = 0; while (!d.done && g++ < 5000) { const r = stepOnce(); if (r === 'gise') onGise(); } return finish(); }
      const per = Math.max(1, Math.round(s.speed || 1));
      timer = setInterval(() => { for (let i = 0; i < per; i++) { const r = stepOnce(); if (r === 'done') return finish(); if (r === 'gise') { if (UI.autoParry) { onGise(); if (d.done) return finish(); continue; } draw(); return onGise(); } } draw(); }, 100);
    };
    draw(); setTimeout(run, UI.instant ? 0 : 600);
  });
}
UI.duelUI = duelUI;
// ---------- 사건 UI ----------
async function kiyeonUI(ev) {
  const df = G.kiyeonDef(ev.name, ev.id); let b = false;
  await modal({ title: df.t, text: df.d, buttons: [{ t: 'A · ' + df.a, cls: 'pri', fn: () => b = false }, { t: 'B · ' + df.b, fn: () => b = true }] });
  const r = G.chooseKiyeon(ev.name, ev.id, b);
  if (r && r.duel) {
    const n = r.series || 1;
    for (let i = 0; i < n; i++) { const w = G.predict(r.duel, 'x', ev.id).w;
      if (n > 1) await modal({ title: '비무 ' + (i + 1) + '/' + n, text: (r.duel[7] || '상대') + ' · 예상 ' + DuelLib.band(w)[0] });
      const win = await duelUI(r.duel, {}, { w });
      if (!win) { S().injured = true; G.toast('패배. 부상(이번 턴 싸움 불가)'); break; }
      G.give(r.reward); G.toast('승리' + G.giveText(r.reward)); }
    G.after();
  }
}
async function storyUI(ev) {
  const s = S(); const w = G.predict(ev.duel, ev.trial ? 'trial' : 'x', s.loc).w;
  let go = true;
  if (ev.reckless) { const i = await modal({ title: ev.title, text: ev.text, buttons: [{ t: '다음에 오겠다', cls: 'pri' }, { t: '그래도 겨룬다', cls: 'red' }] }); go = i === 1; }
  else await modal({ title: ev.title, text: ev.text, html: '<p>예상 승률 ' + bandBadge(w) + '</p>', buttons: [{ t: '싸운다', cls: 'pri' }] });
  if (!go) { s.explored[s.loc] = false; G.save(); return; }
  if (s.injured) { G.toast('부상 중이라 물러났다'); s.explored[s.loc] = false; return; }
  const win = await duelUI(ev.duel, {}, { w });
  if (win) { const c = ev.onWin || '';
    if (c === 'yeonhwa') { s.silver += 50; s.yeonhwaMet = true; await modal({ title: '인연 · 소연화', text: '약초꾼의 딸 소연화를 구했다. "이 은혜는 잊지 않을게요." 은자 +50, 부상 1회 무료 치료 쪽지' }); s.items['금창약']++; }
    else if (c.startsWith('fame:')) { const f = +c.slice(5); s.fame += f; G.toast('승리! 명성 +' + f); }
  } else { s.injured = true; if (ev.trial || ev.onLose === 'relm') { if (ev.trial || ev.title.indexOf('소연화') >= 0) s.explored[s.loc] = false; } G.toast('패배. 부상(이번 턴 싸움 불가). 다음에 다시.'); }
  G.after();
}
async function tourneyUI(t) {
  const s = S(), opps = t === 6 ? D.T6 : D.T18; let res = 0;
  await modal({ title: (t === 6 ? '제1회' : '제2회') + ' 무림대회 (하남)', text: '어디에 있든 초청장이 날아왔다. 3경기(8강·4강·결승), 경기 사이 체력은 모두 회복된다.' });
  for (const o of opps) { const w = G.predict(o, 'x', s.loc).w;
    await modal({ title: o[7], text: D.REALM[o[0]] + ' · 무 ' + o[1] + ' 내 ' + o[2] + ' · ' + D.GNAME[o[4]], html: '<p>예상 승률 ' + bandBadge(w) + '</p>', buttons: [{ t: '비무대에 오른다', cls: 'pri' }] });
    if (await duelUI(o, {}, { w })) res++; else break; }
  const r = G.tourneyResult(t, res);
  await modal({ title: '무림대회 결과', text: ['8강 탈락', '4강 진출', '준우승', '우승!'][res] + '\n명성 +' + r.fame + (r.silver ? ', 은자 +' + r.silver : '') + (t === 6 && res < 3 ? '\n\n윤서각: "다음 대회에선 끝까지 가겠다."' : '') });
}
async function rivalUI() {
  const s = S(), e = D.RIVAL23, w = G.predict(e, 'x', s.loc).w;
  const i = await modal({ title: '윤서각의 도전', text: '"강호가 칼을 뽑기 전에, 너와 끝을 보고 싶다." — 화산 윤서각\n(응하든 거절하든 목표는 완료된다)', html: '<p>예상 승률 ' + bandBadge(w) + '</p>', buttons: [{ t: '응한다', cls: 'pri' }, { t: '거절한다' }] });
  if (i === 1) { G.rivalResult(false, false); await modal({ title: '윤서각', text: '"다음에 보자."' }); return; }
  const win = await duelUI(e, {}, { w }); G.rivalResult(true, win);
  await modal({ title: win ? '화산의 벽' : '패배', text: win ? "윤서각을 꺾었다. 별호 '화산의 벽', 명성 +30" : '"아직 멀었군." 윤서각이 검을 거둔다.' });
}
async function tatongHintUI() {
  const s = S(); if (!G.tatongGlow()) return;
  const later = s.hintIgnore >= 2;
  const i = await modal({ title: '취팔 노개', text: '"혈이 막힌 채로 칼만 휘두르면 제자리다. 이번 달은 앉아라."\n(정경 ' + s.mer + '/' + G.gateMer() + ')', buttons: [{ t: later ? '지금 앉는다(권장)' : '타통한다', cls: 'pri' }, { t: '나중에' }] });
  if (i === 0) { s.hintIgnore = 0; await tatongUI(); } else { s.hintIgnore++; G.save(); }
}
// ---------- 타통 ----------
async function tatongUI() {
  const s = S(), blk = G.tatongBlock(); if (blk) { G.toast(blk); flushToasts(); return; }
  const cost = G.tatongCost(); const saeng = s.mer >= 12;
  if (!(await confirmP((saeng ? '생사현관' : '타통') + ': 이번 달 행동 3개를 모두 쓴다. 은자 ' + cost + (s.warm ? ' (온양: 무료·자동 완벽)' : s.freeTat ? ' (노개의 가르침: 무료·자동 완벽)' : '') + '\n' + (saeng ? '임맥·독맥 개통' : '정경 2개 개통 + 수련치'), '앉는다', '그만둔다'))) return;
  const perfect = G.tatongAuto() ? true : await acupointGame();
  const r = G.doTatong(perfect); if (!r) return;
  await modal({ title: (r.saeng ? '생사현관' : '타통') + ' 완료', text: '개통: ' + r.opened.join(', ') + '\n수련치 +' + r.xp + (r.perfect ? ' (운기행공 완벽 +20%)' : '') + '\n\n한 달 사이 강호에서는…\n· ' + r.rumors.join('\n· ') });
  if (G.canBreak()) G.toast('돌파할 수 있다!');
  afterAct();
}
function acupointGame() { // 운기행공: 빛나는 혈도 3곳 순서대로 (15초)
  return new Promise(res => {
    const ov = $('#overlay'); ov.classList.remove('hidden');
    const pts = [[50, 14], [50, 30], [38, 36], [62, 36], [50, 44], [40, 55], [60, 55], [36, 72], [64, 72], [36, 90], [64, 90], [50, 22]];
    const order = []; while (order.length < 3) { const k = Math.floor(G.rand() * pts.length); if (order.indexOf(k) < 0) order.push(k); }
    ov.innerHTML = '<h2 style="text-align:center;margin:6px">운기행공</h2><p class="muted" style="text-align:center">빛나는 혈도를 순서대로 누르세요 (실패해도 효과는 그대로)</p><div class="body" id="body">' + pts.map((p, i) => '<button class="pt" data-i="' + i + '" style="left:' + p[0] + '%;top:' + p[1] + '%"></button>').join('') + '</div><p id="tt" style="text-align:center">15초</p>';
    let k = 0, ok = true, left = 15; const els = ov.querySelectorAll('.pt');
    const lit = () => els.forEach((e, i) => e.classList.toggle('on', i === order[k]));
    lit();
    const iv = setInterval(() => { left--; $('#tt').textContent = left + '초'; if (left <= 0) end(false); }, 1000);
    els.forEach(e => e.onclick = () => { const i = +e.dataset.i; if (i === order[k]) { e.classList.add('hit'); k++; if (k >= 3) end(ok); else lit(); } else { ok = false; } });
    function end(r) { clearInterval(iv); ov.classList.add('hidden'); ov.innerHTML = ''; res(!!r && k >= 3); }
  });
}
async function breakUI() {
  const s = S(); const to = D.REALM[s.realm + 1];
  await new Promise(res => { const ov = $('#overlay'); ov.classList.remove('hidden'); let n = 0;
    ov.innerHTML = '<h2 style="text-align:center">' + to + ' 돌파</h2><p class="muted" style="text-align:center">기를 모아라! 원을 5번 누르세요</p><div style="flex:1;display:flex;align-items:center;justify-content:center"><button id="orb" style="width:180px;height:180px;border-radius:50%;font-size:40px;background:radial-gradient(#fde68a,#b45309)">氣</button></div>';
    $('#orb').onclick = () => { n++; $('#orb').style.transform = 'scale(' + (1 + n * 0.08) + ')'; if (n >= 5) { ov.classList.add('hidden'); ov.innerHTML = ''; res(); } }; });
  const g0 = s.grade; G.doBreak();
  await modal({ title: to + ' 돌파!', text: '무력·내공 +3, 명성 +' + D.BFAME[s.realm] + (s.grade > g0 ? '\n무공 자동 상승: ' + D.GNAME[s.grade] : '') + (s.realm === 4 ? '\n경공: 이동 2칸' : '') + (s.realm === 5 ? '\n검강이 피어오른다.' : '') });
  afterAct();
}
// ---------- 폐관 ----------
function restSheet() {
  const s = S(); let type = s.off.type, tat = false;
  const canTat = !G.tatongBlock() && s.turn <= 24;
  modal({ title: '폐관에 들고 쉬기', html: '<p class="muted">앱이 꺼져 있던 실제 시간만큼 수련치가 쌓인다. 2시간까지 100%, 6시간까지 70%, 10시간까지 40%, 상한 10시간. 턴과 강호는 멈춘다.</p>' +
    '<div class="tabs2" id="ty">' + ['ne', 'mu', 'gy'].map(k => '<button data-k="' + k + '" class="' + (k === type ? 'on' : '') + '">' + G.OFF_NAME[k] + '<br><small>×' + G.OFF_RATE[k] + '</small></button>').join('') + '</div>' +
    (canTat ? '<label class="row" style="font-size:15px;padding:8px"><input type="checkbox" id="tatT" style="width:24px;height:24px"> 이번 달 타통도 걸어 둘까? (은자 ' + G.tatongCost() + ', 즉시 처리)</label>' : ''),
    buttons: [{ t: '쉬기', cls: 'pri', fn: () => goRest(type, tat) }, { t: '그만둔다' }],
    after: m => { m.querySelectorAll('#ty button').forEach(b => b.onclick = () => { type = b.dataset.k; m.querySelectorAll('#ty button').forEach(x => x.classList.toggle('on', x === b)); });
      const c = m.querySelector('#tatT'); if (c) c.onchange = () => tat = c.checked; } });
}
function goRest(type, tat) {
  G.startRest(type, tat); G.queue.length = 0;
  const ov = $('#overlay'); ov.classList.remove('hidden');
  ov.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px"><div style="font-size:60px">🕯️</div><h2>폐관 중</h2><p>"몸은 쉬어도 기는 돈다."</p><p class="muted">' + G.OFF_NAME[type] + ' 폐관. 이제 앱을 닫아도 됩니다.<br>다시 열면 출관 화면이 나옵니다.</p><button class="big pri" id="outNow">출관 (지금 돌아오기)</button></div>';
  $('#outNow').onclick = async () => { ov.classList.add('hidden'); ov.innerHTML = ''; await outUI(G.processOffline()); refresh(); drain(); };
}
async function outUI(r) {
  const s = S();
  if (r.pendingTat) { const t = r.pendingTat; await modal({ title: '타통 결과', text: '개통: ' + t.opened.join(', ') + '\n수련치 +' + t.xp + '\n' + (G.canBreak() ? '돌파할 수 있다!' : '') + '\n\n한 달 사이 강호에서는…\n· ' + t.rumors.join('\n· ') }); }
  if (r.rollback) { await modal({ title: '출관', text: r.future ? '기가 흐트러졌다. (저장 시각이 지금보다 앞서 있어 이번 폐관은 0으로 처리했다)' : '기가 흐트러졌다. (시각이 되돌려져 이번 폐관은 0으로 처리했다)' }); G.queue.push(...[]); return; }
  if (r.h < 1 / 6) { G.toast('잠깐 숨을 골랐다' + (r.put > 0.5 ? ' (수련치 +' + Math.round(r.put) + ')' : '')); flushToasts(); return; }
  const hh = Math.floor(r.totH), mm = Math.floor((r.totH - hh) * 60);
  const seg = Math.min(10, r.totH);
  const w1 = Math.min(seg, 2) / 10 * 100, w2 = Math.max(0, Math.min(seg, 6) - 2) / 10 * 100, w3 = Math.max(0, Math.min(seg, 10) - 6) / 10 * 100;
  const html = '<div style="text-align:center;font-size:40px">🧘✨</div>' +
    '<div class="kv"><span>폐관</span><b>' + G.OFF_NAME[r.type] + ' · ' + hh + '시간 ' + mm + '분' + (r.capped ? ' (상한 10시간)' : '') + (r.prevH > 0 ? ' (같은 회차 이어짐)' : '') + '</b></div>' +
    '<div class="muted">효율 막대 (0~2h 100% · 2~6h 70% · 6~10h 40%)</div><div class="effbar" style="background:#44403c"><i style="width:' + w1 + '%;background:#22c55e"></i><i style="width:' + w2 + '%;background:#eab308"></i><i style="width:' + w3 + '%;background:#f97316"></i></div>' +
    '<div class="muted">폐관 그릇: 오늘 담을 수 있는 기운 ' + Math.round(r.bucketAfter / 6.4 * 100) + '% 남음 (이번에 ' + r.E.toFixed(2) + ' / 계산상 ' + r.E0.toFixed(2) + ')</div><div class="effbar" style="background:#44403c"><i style="width:' + (r.bucketAfter / 6.4 * 100) + '%;background:#60a5fa"></i></div>' +
    '<div class="kv"><span>수련치</span><b>+' + Math.round(r.put) + (r.reserveAdd > 0.5 ? ' (잔여 기운 +' + Math.round(r.reserveAdd) + ')' : '') + '</b>' +
    '<span>숙련</span><b>' + (r.suk.length ? r.suk.join(', ') : Math.round(r.sukProg * 100) + '%') + '</b>' +
    '<span>온양</span><b>' + (r.warm ? '온양 상태! 다음 타통 무료·자동 완벽' : r.warmWait ? '오늘은 이미 온양을 얻었다(20시간마다)' : '—') + '</b></div>' +
    '<p style="margin-top:10px">👉 이번 턴 할 일: <b>' + esc(G.nowTodo()) + '</b></p>';
  if (r.firstOut && !s.tut.personal.skipped) G.toast('튜토리얼 T10: ' + D.TUT[9].t);
  let again = false;
  await modal({ title: '출관', html, buttons: [{ t: '강호로', cls: 'pri' }, { t: '다시 폐관', fn: () => again = true }] });
  if (again) { restSheet(); return; }
  s.todo = true; G.save(); // v0.5.2 ③ 재접속: '지금 할 일' 줄 + [어디로?] 자동 깜빡임
}
UI.outUI = outUI;
// ---------- 분기 ----------
async function branchUI() {
  const s = S(); s.ev.branched = 'choosing'; G.save();
  const st = G.settlement();
  await modal({ title: '1막 결산 — 개인 성장', text: '개인 위신 ' + G.pres() + ' × 0.3 = ' + st.p + '\n경지 ' + D.REALM[s.realm] + ' = ' + st.r + '\n별호 ' + s.titles.length + '개 = ' + st.ti + '\n무림대회 = ' + st.to + '\n수배첩 ' + Object.keys(s.bossesKilled).length + '명 = ' + st.wa + '\n윤서각 재대결 = ' + st.rv + '\n\n합계 ' + st.tot + ' → 「' + st.grade + '」' });
  await modal({ title: '정마대전 전조', text: '"정파와 마교가 칼을 뽑았다."\n30년 휴전이 끝났다. 천마신교가 정마대전을 선포했다.' });
  s.revealMap = true; G.save(); UI.tab = 'map'; refresh();
  const taken = s.aiLog.filter(x => x.taken);
  const empty = Object.keys(s.owners).filter(k => s.owners[k][1] === '중립').length;
  await modal({ title: '천하 판도 공개', text: '2년 동안 강호는 이렇게 바뀌었다.\n' + (taken.length ? taken.slice(-8).map(x => '· ' + G.dateStr(x.turn) + ' ' + x.a + '이(가) ' + G.rname(x.b) + '을(를) 차지 (' + x.prev + ')').join('\n') : '· 큰 주인 바뀜은 없었다.') + '\n\n지도에 처음으로 세력 색이 칠해졌다. 무주지 ' + empty + '곳.', html: '<p class="muted">🟦정파 🟫사파 🟥마교 🟪세외 ⬜무주지</p>' });
  await routeCards(false);
}
async function routeCards(again) {
  const s = S(); let pick = -1;
  if (again) { s.myPathSeen = true; G.after(); }
  const card = (n, t, d, sub, ok) => '<div class="routec ' + (ok ? '' : 'off') + '"><h3>' + t + '</h3><div>' + d + '</div><div class="muted">' + sub + '</div></div>';
  await modal({ title: again ? '나의 길' : '진로 선택', html:
    card(1, '① 내 문파를 세운다', '"이름 없는 문파, 내가 장문인이다"', '2단계에서 열림 (선택 불가)', false) +
    card(2, '② 명문의 문을 두드린다', '"구파일방·오대세가·사파·마교·세외에 입문해 정상까지"', '준비 중', false) +
    card(3, '③ 홀로 강호를 걷는다', '"소속 없이 현상금·호위·비무로"', s.route === 3 ? '지금 걷는 길' : '조건 없음 · 선택 가능', true),
    buttons: again ? [{ t: '닫기', cls: 'pri' }] : [{ t: '③ 홀로 강호를 걷는다', cls: 'pri', fn: () => pick = 3 }, { t: '① 2단계에서 열림', disabled: true }, { t: '② 준비 중', disabled: true }] });
  if (again) { refresh(); return; }
  G.chooseRoute(3); s.myPathSeen = false;
  const i = await modal({ title: '홀로 걷는 길', text: '취팔 노개: "소속 없이도 칼 한 자루면 먹고산다. 현상금, 호위, 비무."', buttons: [{ t: '배우며 시작', cls: 'pri' }, { t: '건너뛰기' }] });
  if (i === 1 && (await confirmP('낭인 튜토리얼을 건너뛸까요? 남은 단계 보상은 즉시 지급됩니다.'))) G.skipPathTut();
  G.claim(); refresh();
}
// ---------- 말풍선(튜토리얼) ----------
function compactTop() { const t = $('#top'); const c = window.innerHeight < 720; t.classList.toggle('compact', c); t.classList.toggle('open', c && !!UI.goalOpen);
  const g = t.querySelector('.goal .gt'); if (g && c) g.onclick = () => { UI.goalOpen = !UI.goalOpen; compactTop(); fitMap(); placeBubble(); }; }
function fitMap() { compactTop(); const svg = document.querySelector('svg.map'), grid = document.querySelector('.acts-grid'); if (!svg || !grid) return;
  const top = $('#top').getBoundingClientRect().height, tabs = $('#tabs').getBoundingClientRect().height, sel = (document.querySelector('.selbar') || document.querySelector('.rumor') || { offsetHeight: 0 }).offsetHeight;
  const ex = document.querySelector('.extra'); const exH = ex && ex.children.length ? ex.getBoundingClientRect().height + 6 : 0;
  const avail = window.innerHeight - top - tabs - sel - grid.offsetHeight - exH - 14; svg.style.height = Math.max(150, Math.min(540, avail)) + 'px';
  // 터치 원은 지도 배율과 상관없이 화면 기준 지름 46px 이상
  const sc = Math.min(svg.clientWidth / 390, svg.clientHeight / 560) || 1; const r = Math.max(33, 23 / sc);
  svg.querySelectorAll('.node circle[fill="transparent"]').forEach(c => c.setAttribute('r', r.toFixed(1)));
  // 토스트는 상단 바 바로 아래(지도 위)에 띄워 행동 버튼을 가리지 않게
  const tb = $('#toast'); if (tb) { tb.style.bottom = 'auto'; tb.style.top = ($('#top').getBoundingClientRect().bottom - $('#app').getBoundingClientRect().top + 6) + 'px'; } }
window.addEventListener('resize', () => { fitMap(); placeBubble(); });
function bubble() { fitMap(); bubble0(); placeBubble(); }
function placeBubble() { const b = $('#bubble'); if (b.classList.contains('hidden')) return; const app = $('#app').getBoundingClientRect(), top = $('#top').getBoundingClientRect();
  const tid = (b.querySelector('.who') || {}).textContent || ''; const grid = document.querySelector('.acts-grid');
  let y; if (/T8|R1/.test(tid) || !grid) y = top.bottom - app.top + 6; // 지도 노드가 대상이면 상단 바 바로 아래
  else { const g = grid.getBoundingClientRect(); y = g.top - app.top - b.offsetHeight - 6; if (y < top.bottom - app.top + 4) y = top.bottom - app.top + 4; }
  b.style.top = y + 'px'; }
function bubble0() {
  const s = S(), b = $('#bubble');
  if (UI.replay) { const st = UI.replay.list[UI.replay.i]; b.classList.remove('hidden');
    b.innerHTML = '<div class="who">취팔 노개 <span class="muted">(다시 보기 ' + (UI.replay.i + 1) + '/' + UI.replay.list.length + ')</span></div>' + esc(st.t) + '<div class="bb"><button id="rpN">다음</button><button id="rpX">닫기</button></div>';
    on('rpN', () => { UI.replay.i++; if (UI.replay.i >= UI.replay.list.length) UI.replay = null; render(); }); on('rpX', () => { UI.replay = null; render(); }); return; }
  if (UI.tab !== 'map') { b.classList.add('hidden'); return; }
  const P = s.tut.path;
  if (s.route === 3 && P && !P.skipped && P.step < 5) { const r = D.RTUT[P.step]; b.classList.remove('hidden');
    b.innerHTML = '<div class="who">취팔 노개 · ' + r.id + '</div>' + esc(r.t) + '<div class="bb">' + (P.step === 0 ? '<button id="r1n">다음</button>' : '') + '<button id="tSkip">건너뛰기</button><button id="tHide">접기</button></div>';
    on('r1n', () => { P.r1 = true; G.after(); refresh(); }); on('tSkip', async () => { if (await confirmP('낭인 튜토리얼을 건너뛸까요? 남은 보상은 즉시 지급됩니다.')) { G.skipPathTut(); refresh(); } }); on('tHide', () => b.classList.add('hidden')); return; }
  const t = s.route ? null : G.tutCurrent();
  if (!t || UI.hideBubble === t.id) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  b.innerHTML = '<div class="who">취팔 노개 · ' + t.id + '</div>' + esc(t.t) + '<div class="bb"><button id="tHide">접기</button><button id="tSkip">건너뛰기</button></div>';
  on('tHide', () => { UI.hideBubble = t.id; b.classList.add('hidden'); });
  on('tSkip', async () => { if (await confirmP('튜토리얼을 건너뛸까요? 남은 단계 보상은 즉시 지급됩니다.')) { G.skipTutorial(); refresh(); } });
}
// ---------- 도움말·설정 ----------
function helpCards() {
  const H = { map: ['지도', '빛나는 이웃 지역을 눌러 이동. 노드 숫자 = 위험도, 테두리 초록(내 경지 이하)·주황(+1)·빨강(+2↑).\n행동은 턴마다 3개(●●●). 타통은 3개 전부.\n돌파 = 수련치 + 경맥(정경) 둘 다 필요.'],
    char: ['인물', '주인공: 경지·무공·명성·별호·파훼율.\n경맥: 정경 12 + 임독양맥. 일류 2·절정 8·초절정 12+임독.\n수배첩: 두목을 모으면 5·10·15명 보상.'],
    base: ['거점', '객잔 의뢰판: 토벌·배달·정탐. 받는 건 무료, 조건을 채우면 즉시 보상.\n잠정 규칙: 처치 1명은 토벌 의뢰 1건에만 인정.\n약방: 금창약·소환단·비급. 명물: 그 고장의 영약·병기(5턴~).'] };
  const [t, x] = H[UI.tab]; modal({ title: '[?] ' + t, text: x + '\n\n폐관(🕯️): 앱을 닫아 둔 실제 시간만큼 수련(상한 10시간, 하루 그릇 6.4).' });
}
function settings() {
  const s = S();
  modal({ title: '설정', html: '<div class="row">속도 <button class="sm ' + (s.speed === 1 ? 'pri' : '') + '" data-sp="1">1×</button><button class="sm ' + (s.speed === 2 ? 'pri' : '') + '" data-sp="2">2×</button></div>',
    buttons: [{ t: '튜토리얼 다시 보기 · 개인 성장', fn: () => { UI.replay = { list: D.TUT, i: 0 }; UI.tab = 'map'; render(); } },
      { t: '튜토리얼 다시 보기 · 내 진로', disabled: !s.route, fn: () => { UI.replay = { list: D.RTUT, i: 0 }; UI.tab = 'map'; render(); } },
      { t: '새 게임(저장 삭제)', cls: 'red', fn: async () => { if (await confirmP('정말 저장을 지우고 처음부터?')) { localStorage.removeItem(G.SAVE_KEY); location.reload(); } } },
      { t: '닫기' }],
    after: m => m.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { s.speed = +b.dataset.sp; G.save(); m.querySelectorAll('[data-sp]').forEach(x => x.classList.toggle('pri', x === b)); }) });
}
// ---------- 디버그 (?debug=1) ----------
let dbgOpen = false;
function debugPanel() {
  let btn = document.querySelector('.dbgbtn'); if (!btn) { btn = document.createElement('button'); btn.className = 'dbgbtn'; btn.textContent = '🐞'; btn.onclick = () => { dbgOpen = !dbgOpen; debugPanel(); }; $('#app').appendChild(btn); }
  const p = $('#dbg'); if (!dbgOpen) { p.classList.add('hidden'); return; } p.classList.remove('hidden');
  const s = S(), O = s.off;
  p.innerHTML = '<b>디버그</b> 턴 ' + s.turn + ' · 파훼 ' + Math.round(G.parryRate() * 100) + '%<br>' +
    '폐관 경과(분) <input id="dMin" type="number" value="600"><button id="dApply">적용</button><br>' +
    [5, 60, 120, 360, 600, 840].map(m => '<button data-pm="' + m + '">' + (m < 60 ? m + '분' : m / 60 + '시간') + '</button>').join('') + '<button data-pm="-60">−60분(되돌림)</button><button id="dFut">미래 저장 시각</button><button id="dFill">그릇 가득</button><br>' +
    '<pre>그릇 ' + O.bucket.toFixed(2) + '/6.4 · 회차 ' + O.sessH.toFixed(2) + 'h E ' + O.sessE.toFixed(2) + ' · acted ' + O.acted + '\n잔여 기운 ' + Math.round(O.reserve) + ' · 숙련 ' + JSON.stringify(O.suk) + ' · 온양 ' + s.warm + '\n' + (UI.lastOff || '') + '</pre>' +
    '<button id="dTurn">턴 넘기기</button><button id="dXp">수련치+500</button><button id="dSil">은자+500</button><button id="dMer">정경+2</button><button id="dRealm">경지+1(즉시)</button><button id="dHeal">부상 회복</button><button id="dT24">23턴 끝으로</button><br>' +
    '<label><input type="checkbox" id="dInst" ' + (UI.instant ? 'checked' : '') + '>즉시 전투</label> <label><input type="checkbox" id="dAuto" ' + (UI.autoParry ? 'checked' : '') + '>자동 파훼(확률)</label><br>' +
    '순간이동 <select id="dTp">' + Object.keys(D.REGIONS).map(k => '<option value="' + k + '"' + (k === s.loc ? ' selected' : '') + '>' + G.rname(k) + '</option>').join('') + '</select><button id="dTpGo">이동</button>' +
    '<pre>일기토 로그: ' + (s.lastDuel ? s.lastDuel.nm + ' ' + (s.lastDuel.win ? '승' : '패') + ' ' + s.lastDuel.t + '초 기세 ' + s.lastDuel.gise + ' 파훼 ' + s.lastDuel.ok + '\n' + s.lastDuel.log.slice(-14).join('\n') : '-') + '</pre>';
  const offApply = async (min) => { s.timeShift += min * 60000; G.save(); const r = G.processOffline(); UI.lastOff = '마지막: ' + min + '분 → ' + (r.rollback ? '되돌림 0' : 'h ' + (r.h || 0).toFixed(2) + ' E0 ' + (r.E0 || 0).toFixed(2) + ' E ' + (r.E || 0).toFixed(2) + ' 수련치 +' + Math.round(r.put || 0) + ' 잔여 +' + Math.round(r.reserveAdd || 0) + (r.warm ? ' 온양' : '')); await outUI(r); refresh(); drain(); };
  on('dApply', () => offApply(+$('#dMin').value || 0));
  p.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => offApply(+b.dataset.pm));
  on('dFut', async () => { s.off.lastSeen = G.clock() + 86400000; s.off.maxSeen = s.off.lastSeen; G.save(); const r = G.processOffline(); UI.lastOff = '미래 저장 시각 → ' + (r.rollback ? '0 처리' : '?'); await outUI(r); refresh(); });
  on('dFill', () => { s.off.bucket = 6.4; G.save(); refresh(); });
  on('dTurn', () => { G.endTurn(); afterAct(); });
  on('dXp', () => { s.xp += 500; G.save(); refresh(); }); on('dSil', () => { s.silver += 500; G.save(); refresh(); });
  on('dMer', () => { const n = Math.min(2, 12 - s.mer); s.mer += n; s.mu += n; s.ne += 2 * n; G.save(); refresh(); });
  on('dRealm', () => { if (s.realm < 5) { s.realm++; s.mu += 3; s.ne += 3; if (s.realm === 5) s.imdok = true; s.mer = Math.max(s.mer, D.MERID[s.realm]); G.save(); refresh(); } });
  on('dHeal', () => { s.injured = false; G.save(); refresh(); });
  on('dT24', () => { s.turn = 23; s.acts = 0; G.save(); refresh(); });
  on('dInst', () => { UI.instant = $('#dInst').checked; }); on('dAuto', () => { UI.autoParry = $('#dAuto').checked; });
  on('dTpGo', () => { s.loc = $('#dTp').value; if (s.visited.indexOf(s.loc) < 0) s.visited.push(s.loc); G.save(); refresh(); });
}
// ---------- 생명주기 ----------
setInterval(() => { if (G.S && document.visibilityState === 'visible' && $('#main') && !$('#main').classList.contains('hidden')) G.heartbeat(); }, 5000);
let hiddenAt = 0;
document.addEventListener('visibilitychange', async () => {
  if (!G.S) return;
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); G.heartbeat(); }
  else if (hiddenAt && Date.now() - hiddenAt >= 600000 && !G.S.off.resting) { hiddenAt = 0; await outUI(G.processOffline()); refresh(); drain(); }
});
window.addEventListener('pagehide', () => { if (G.S) G.heartbeat(); });
window.addEventListener('error', e => { console.error('murim error', e.message); });
startScreen();
})();
