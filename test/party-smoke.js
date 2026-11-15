'use strict';
// OCHE party-night smoke suite: actual WebSockets, no GitHub Actions usage.
// Covers eight joins, reconnects, capacity, captain permissions, and the first
// real throw in every Bible game mode. Run: node test/party-smoke.js
const assert = require('node:assert/strict');
const WebSocket = require('ws');

process.env.PORT = '3998';
process.env.OCHE_SPEED = '40';
const { server } = require('../server');
const addr = 'ws://127.0.0.1:3998';
const peers = [];
let checks = 0;
const checked = (name) => { checks++; console.log('PASS party:', name); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  const ws = new WebSocket(addr);
  ws.q = [];
  ws.on('message', bytes => {
    const m = JSON.parse(String(bytes));
    ws.q.push(m);
    ws.emit('packet', m);
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  peers.push(ws);
  return ws;
}
function waitFrom(ws, start, pred, ms = 6000) {
  const found = ws.q.slice(start).find(pred);
  if (found) return Promise.resolve(found);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.off('packet', handler); reject(new Error('OCHE party smoke timed out')); }, ms);
    function handler(m) {
      if (!pred(m)) return;
      clearTimeout(timer);
      ws.off('packet', handler);
      resolve(m);
    }
    ws.on('packet', handler);
  });
}
function sendAndWait(sender, message, watcher, pred, ms = 6000) {
  const from = watcher.q.length;
  sender.send(JSON.stringify(message));
  return waitFrom(watcher, from, pred, ms);
}
function statePhase(phase) { return m => m.t === 'state' && m.phase === phase; }

(async () => {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  let tv = await connect();
  const hosted = await sendAndWait(tv, { t: 'host' }, tv, m => m.t === 'hosted');
  const room = hosted.code;
  assert.match(room, /^[A-Z]{4}$/);
  const seats = new Map();

  for (let i = 0; i < 8; i++) {
    const ws = await connect();
    const playerId = 'party' + (i + 1);
    const mark = tv.q.length;
    await sendAndWait(ws, { t: 'join', code: room, playerId, name: 'Player ' + (i + 1), control: i % 2 ? 'swipe' : 'motion' },
      ws, m => m.t === 'welcome');
    await waitFrom(tv, mark, m => m.t === 'state' && m.players.length === i + 1);
    seats.set(playerId, ws);
  }
  const joined = tv.q.filter(statePhase('lobby')).at(-1);
  assert.equal(joined.players.length, 8);
  assert.equal(new Set(joined.players.map(p => p.id)).size, 8);
  assert.equal(new Set(joined.players.map(p => p.colour)).size, 8);
  assert.equal(joined.captainId, 'party1');
  assert.ok(!('hostKey' in joined), 'Secret host key must not appear in public state');
  checked('Eight unique joined players, one captain, no leaked TV host key');

  const ninth = await connect();
  const reject = await sendAndWait(ninth, { t: 'join', code: room, playerId: 'ninth', name: 'Ninth' },
    ninth, m => m.t === 'error');
  assert.equal(reject.code, 'full');
  checked('Ninth phone is rejected politely');

  const old = seats.get('party4');
  const offlineFrom = tv.q.length;
  old.close();
  await waitFrom(tv, offlineFrom, m => m.t === 'state' && m.players.length === 8 &&
    m.players.some(p => p.id === 'party4' && !p.online));
  const restored = await connect();
  const restoreFrom = tv.q.length;
  await sendAndWait(restored, { t: 'join', code: room, playerId: 'party4', name: 'Player 4' },
    restored, m => m.t === 'welcome');
  await waitFrom(tv, restoreFrom, m => m.t === 'state' && m.players.length === 8 &&
    m.players.some(p => p.id === 'party4' && p.online));
  seats.set('party4', restored);
  checked('Disconnected phone reclaims the same seat without duplication');

  const newerTv = await connect();
  const newHost = await sendAndWait(newerTv, { t: 'host', code: room, hostKey: hosted.hostKey }, newerTv, m => m.t === 'hosted');
  assert.equal(newHost.code, room);
  tv = newerTv;
  const resumedState = await waitFrom(tv, 0, statePhase('lobby'));
  assert.equal(resumedState.players.length, 8);
  checked('TV reconnect recovers room and player list');

  const captain = seats.get('party1');
  const modes = ['x01','clock','world','cricket','shanghai','killer','practice'];
  for (const mode of modes) {
    const configured = await sendAndWait(captain,
      { t: 'setup', mode, legs: 1, bullOff: false },
      tv, m => m.t === 'state' && m.phase === 'lobby' && m.config.mode === mode);
    assert.equal(configured.players.length, 8);
    const started = await sendAndWait(captain, { t: 'start' },
      tv, m => m.t === 'state' && m.phase === 'playing' && m.config.mode === mode &&
        m.game && m.game.turnPhase === 'aim');
    assert.equal(started.game.view.rows.length, 8, mode + ' must render eight players');
    assert.equal(started.game.order.length, 8);
    const current = started.game.currentId;
    const sender = seats.get(current);
    assert.ok(sender, 'Current player must be connected');
    // An unauthorised player cannot score or change the turn.
    const other = seats.get(current === 'party1' ? 'party2' : 'party1');
    const priorDarts = tv.q.filter(m => m.t === 'dart').length;
    other.send(JSON.stringify({ t: 'throw', aim: { x: 0, y: 103 }, power: 1, stability: 0 }));
    await pause(55);
    assert.equal(tv.q.filter(m => m.t === 'dart').length, priorDarts, mode + ' accepted a wrong-player throw');

    const thrown = await sendAndWait(sender,
      { t: 'throw', aim: { x: 0, y: 103 }, power: 1, stability: 0.05, lateral: 0, input: 'swipe' },
      tv, m => m.t === 'dart' && m.id === current);
    assert.ok(thrown.dart && typeof thrown.dart.score === 'number');
    const ended = await sendAndWait(captain, { t: 'end' }, tv, statePhase('gameOver'));
    assert.equal(ended.phase, 'gameOver');
    assert.equal(ended.game.endText, 'Game ended by the captain');
    await sendAndWait(captain, { t: 'again', rematch: false }, tv, statePhase('lobby'));
    checked(mode + ': start, authoritative throw, captain end, lobby reset');
  }
  console.log('OCHE PARTY WEBSOCKET QA:', checks, 'checks passed');
  for (const ws of peers) if (ws.readyState === WebSocket.OPEN) ws.close();
  server.close();
  process.exit(0);
})().catch(err => {
  console.error('OCHE PARTY WEBSOCKET QA FAILED:', err);
  for (const ws of peers) try { ws.terminate(); } catch { /* ignore */ }
  try { server.close(); } catch { /* ignore */ }
  process.exit(1);
});
