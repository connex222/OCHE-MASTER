'use strict';
// Unit checks + a full simulated game over real WebSockets.
// Run: npm test
const assert = require('assert');
const { scoreAt, wireDistance } = require('../lib/board');
const { checkout } = require('../lib/checkouts');
const { resolveThrow } = require('../lib/physics');
const { MODES, normaliseConfig } = require('../lib/modes');

// --- board
assert.deepStrictEqual(scoreAt(0, 0).label, 'BULL');
assert.strictEqual(scoreAt(0, 10).label, '25');
assert.strictEqual(scoreAt(0, 103).label, 'T20');
assert.strictEqual(scoreAt(0, 166).label, 'D20');
assert.strictEqual(scoreAt(0, 50).label, '20');
assert.strictEqual(scoreAt(0, -103).label, 'T3');
assert.strictEqual(scoreAt(103, 0).label, 'T6');
assert.strictEqual(scoreAt(-103, 0).label, 'T11');
assert.strictEqual(scoreAt(0, 175).label, 'MISS');
assert.ok(wireDistance(0, 99) < 0.01);
// --- checkouts
assert.deepStrictEqual(checkout(170), ['T20', 'T20', 'BULL']);
assert.deepStrictEqual(checkout(40), ['D20']);
assert.deepStrictEqual(checkout(100, 2), ['T20', 'D20']);
assert.strictEqual(checkout(169), null);
assert.strictEqual(checkout(159), null);
assert.strictEqual(checkout(100, 1), null);
for (let s = 2; s <= 170; s++) {
  const c = checkout(s);
  if (!c) continue;
  const val = l => l === 'BULL' ? 50 : l === '25' ? 25 : l[0] === 'T' ? 3 * +l.slice(1) : l[0] === 'D' ? 2 * +l.slice(1) : +l;
  assert.strictEqual(c.reduce((a, l) => a + val(l), 0), s, 'checkout sum ' + s);
  const last = c[c.length - 1];
  assert.ok(last === 'BULL' || last[0] === 'D', 'ends on double ' + s);
}
// --- physics distribution sanity
let near = 0;
for (let i = 0; i < 2000; i++) {
  const r = resolveThrow({ aim: { x: 0, y: 103 }, power: 1, stability: 0.1 }, 'normal');
  if (Math.hypot(r.landing.x, r.landing.y - 103) < 25) near++;
}
console.log('Perfect throws within 25mm of aim:', (near / 20).toFixed(1) + '%');
assert.ok(near > 1200);
const soft = resolveThrow({ aim: { x: 0, y: 0 }, power: 0.1 }, 'normal');
assert.strictEqual(soft.reached, false);
// --- x01 bust
{
  const m = MODES.x01; const o = normaliseConfig({ mode: 'x01', options: { start: 301 } }).options;
  const s = m.create(1, o); s.scores[0] = 32; m.turnStart(s, 0);
  let r = m.throw(s, 0, scoreAt(0, 50), {}); // 20 -> 12
  assert.strictEqual(s.scores[0], 12);
  r = m.throw(s, 0, scoreAt(0, 103), {}); // T20 bust
  assert.ok(r.bust); assert.strictEqual(s.scores[0], 32);
  m.turnStart(s, 0); r = m.throw(s, 0, { number: 16, multiplier: 2, score: 32, label: 'D16' }, {});
  assert.strictEqual(r.winner, 0);
}
// --- cricket points
{
  const m = MODES.cricket; const s = m.create(2, { rounds: 20 });
  m.throw(s, 0, { number: 20, multiplier: 3, score: 60 }, {});
  const r = m.throw(s, 0, { number: 20, multiplier: 3, score: 60 }, {});
  assert.strictEqual(s.points[0], 60); assert.ok(r.text.includes('+60'));
}
// --- killer
{
  const m = MODES.killer; const s = m.create(2, { lives: 1 }); const names = ['A', 'B'];
  m.throw(s, 0, { number: s.numbers[0], multiplier: 2 }, { names });
  assert.ok(s.killer[0]);
  const r = m.throw(s, 0, { number: s.numbers[1], multiplier: 2 }, { names });
  assert.strictEqual(r.winner, 0);
}
console.log('Unit checks passed');

// --- full game over WebSockets
process.env.PORT = 3999; process.env.OCHE_SPEED = 40;
const { server } = require('../server');
const WebSocket = require('ws');
const url = 'ws://localhost:3999';
const open = () => new Promise(res => { const w = new WebSocket(url); w.on('open', () => res(w)); });
const msgs = w => { w.q = []; w.on('message', d => { const m = JSON.parse(d); w.q.push(m); w.last = m.t === 'state' ? m : w.last; w.emit('m', m); }); };
const waitFor = (w, pred, ms = 8000) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('timeout')), ms);
  const h = m => { if (pred(m)) { clearTimeout(t); w.off('m', h); res(m); } };
  w.on('m', h);
});
(async () => {
  const tv = await open(); msgs(tv);
  tv.send(JSON.stringify({ t: 'host' }));
  const hosted = await waitFor(tv, m => m.t === 'hosted');
  const a = await open(); msgs(a); const b = await open(); msgs(b);
  a.send(JSON.stringify({ t: 'join', code: hosted.code, name: 'Shaun', playerId: 'pa' }));
  await waitFor(a, m => m.t === 'welcome');
  b.send(JSON.stringify({ t: 'join', code: hosted.code, name: 'Sue', playerId: 'pb' }));
  await waitFor(b, m => m.t === 'welcome');
  a.send(JSON.stringify({ t: 'setup', mode: 'x01', options: { start: 301 }, legs: 1, bullOff: true }));
  a.send(JSON.stringify({ t: 'start' }));
  let throws = 0, done = false;
  const players = { pa: a, pb: b };
  tv.on('m', m => {
    if (m.t !== 'state' || !m.game || m.game.turnPhase !== 'aim' || !m.game.currentId) return;
    const ws = players[m.game.currentId];
    let aim = { x: 0, y: 103 };
    const h = m.game.hint || '';
    const co = h.startsWith('Checkout:') ? h.slice(10).trim().split(/\s+/)[0] : null;
    if (m.phase === 'bulloff') aim = { x: 0, y: 0 };
    else if (co) {
      const SEG = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
      if (co === 'BULL' || co === '25') aim = { x: 0, y: 0 };
      else {
        const n = +co.replace(/[TD]/, ''); const r = co[0] === 'T' ? 103 : co[0] === 'D' ? 166 : 130;
        const ang = SEG.indexOf(n) * 18 * Math.PI / 180; aim = { x: r * Math.sin(ang), y: r * Math.cos(ang) };
      }
    }
    throws++;
    setTimeout(() => ws.send(JSON.stringify({ t: 'throw', aim, power: 1, stability: 0.05, lateral: 0, input: 'motion' })), 2);
  });
  const end = await waitFor(tv, m => m.t === 'legEnd' && m.gameOver, 60000);
  const st = tv.last;
  console.log('Game over after', throws, 'throws. Winner:', st.players.find(p => p.id === end.winnerId).name, '|', JSON.stringify(st.game.stats));
  assert.ok(end.winnerId);
  // rematch + undo check
  a.send(JSON.stringify({ t: 'again', rematch: false }));
  await waitFor(tv, m => m.t === 'state' && m.phase === 'lobby');
  a.send(JSON.stringify({ t: 'setup', mode: 'killer', legs: 1, bullOff: false }));
  a.send(JSON.stringify({ t: 'start' }));
  await waitFor(tv, m => m.t === 'state' && m.phase === 'playing' && m.game.turnPhase === 'aim');
  const first = tv.last.game.currentId;
  players[first].send(JSON.stringify({ t: 'throw', aim: { x: 0, y: 50 }, power: 1, stability: 0 }));
  await waitFor(tv, m => m.t === 'state' && m.game.turnPhase === 'aim' && m.game.darts.length === 1);
  a.send(JSON.stringify({ t: 'undo' }));
  await waitFor(tv, m => m.t === 'state' && m.game.darts.length === 0);
  console.log('Undo works. Killer view:', JSON.stringify(tv.last.game.view.rows));
  console.log('ALL TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
