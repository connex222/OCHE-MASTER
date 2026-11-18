'use strict';
/*
 * OCHE server.
 *  - Serves the TV page (/tv), phone controller (/phone) and /assets.
 *  - Runs rooms over WebSockets. The server is the referee: phones send throw
 *    measurements, the server works out where the dart landed and scores it.
 *
 * Run locally:  npm install  then  npm start  then open http://localhost:3000
 * Render:       build "npm install", start "node server.js"
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { scoreAt, MISS } = require('./lib/board');
const { resolveThrow, DIFFICULTY } = require('./lib/physics');
const { MODES, GENERIC, catalog, normaliseConfig, titleFor } = require('./lib/modes');
const { AVATARS, BY_ID, freeAvatars } = require('./lib/avatars');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// Timings (ms). The TV animation is built around these.
const T = {
  FLIGHT: 1150,     // dart in the air + landing reaction
  COLLECT: 2100,    // visit total shown, darts pulled out
  LEG_BREAK: 5000,  // between legs
  BULL_NEXT: 1800,
  BULL_RESULT: 3000,
  LOBBY_DROP: 45000,
  ROOM_IDLE: 15 * 60 * 1000,
  WALKON_INTRO: 1900, // theatrical opener, before players arrive
  WALKON_CARD: 4000  // about four seconds per character, Bible section 3b
};
// Test hook: OCHE_SPEED=20 runs every timer 20x faster.
const SPEED = Math.max(1, Number(process.env.OCHE_SPEED) || 1);
for (const k of ['FLIGHT', 'COLLECT', 'LEG_BREAK', 'BULL_NEXT', 'BULL_RESULT', 'WALKON_INTRO', 'WALKON_CARD']) T[k] = Math.round(T[k] / SPEED);

const MAX_PLAYERS = 8;
const COLOURS = ['#E8443A', '#2F9BFF', '#F5C518', '#3CCB7F', '#B266FF', '#FF8A3D', '#2DD4CF', '#FF5FA2'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CATALOG = catalog();
const GENERIC_OPTIONS = GENERIC.map(o => ({ key: o.key, label: o.label, choices: o.choices, default: o.default }));

/* ------------------------------------------------------------ static files */
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain'
};
const ROUTES = { '/': 'index.html', '/tv': 'tv.html', '/phone': 'phone.html' };

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); }
  catch { res.writeHead(400); return res.end(); }
  if (pathname === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (pathname === '/catalog.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(CATALOG)); }
  const rel = ROUTES[pathname] || pathname.replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

/* ----------------------------------------------------------------- helpers */
const rooms = new Map();

function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join(''); }
  while (rooms.has(c));
  return c;
}
function send(ws, msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg) { send(room.tv, msg); for (const p of room.players) send(p.ws, msg); }
function playerById(room, id) { return room.players.find(p => p.id === id); }
function autoAvatar(room, requested) {
  const pool = freeAvatars(room.players);
  if (!pool.length) return null;
  const chosen = pool.find(a => a.id === requested);
  return (chosen || pool[crypto.randomInt(pool.length)]).id;
}
function cleanName(s, fallback) {
  const n = String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);
  return n || fallback;
}
function later(room, ms, fn) {
  const id = setTimeout(() => { room.timers.delete(id); if (rooms.has(room.code)) fn(); }, ms);
  room.timers.add(id);
}
function clearTimers(room) { for (const id of room.timers) clearTimeout(id); room.timers.clear(); }
function returnRoomToLobby(room) {
  // A return is authoritative: cancel queued dart flights, walk-ons and
  // delayed round transitions before publishing the lobby to all clients.
  clearTimers(room);
  room.game = null;
  room.phase = 'lobby';
  room.players = room.players.filter(p => p.online);
  refreshCaptain(room);
  touch(room);
  pushState(room);
}
function touch(room) { room.lastActive = Date.now(); }

function createRoom() {
  const room = {
    code: newCode(),
    hostKey: crypto.randomBytes(12).toString('hex'),
    tv: null,
    players: [],
    captainId: null,
    phase: 'lobby',
    config: normaliseConfig({}),
    game: null,
    timers: new Set(),
    lastActive: Date.now()
  };
  rooms.set(room.code, room);
  return room;
}

function refreshCaptain(room) {
  const cap = playerById(room, room.captainId);
  if (cap && cap.online) return;
  const next = room.players.find(p => p.online) || room.players[0];
  room.captainId = next ? next.id : null;
}

/* ------------------------------------------------------------ public state */
function activeCount(room) {
  const g = room.game, mode = MODES[room.config.mode];
  if (!g || !g.modeState || !mode.isOut) return g ? g.order.length : 0;
  return g.order.filter((_, i) => !mode.isOut(g.modeState, i)).length;
}

function ctxFor(room, extra) {
  const g = room.game;
  return Object.assign({
    round: g.round,
    n: g.order.length,
    names: g.order.map(id => (playerById(room, id) || {}).name || '?'),
    dartsLeft: 3 - g.darts.length,
    lastInRound: g.turnsThisRound + 1 >= activeCount(room)
  }, extra || {});
}

function publicState(room) {
  const st = {
    t: 'state',
    code: room.code,
    phase: room.phase,
    captainId: room.captainId,
    players: room.players.map(p => ({ id: p.id, name: p.name, colour: p.colour, avatarId: p.avatarId, online: p.online, difficulty: p.difficulty, control: p.control })),
    avatars: AVATARS,
    config: room.config,
    title: titleFor(room.config)
  };
  const g = room.game;
  if (g) {
    const mode = MODES[room.config.mode];
    const ctx = g.modeState ? ctxFor(room) : null;
    let currentId = null;
    if (room.phase === 'bulloff') currentId = g.bull.seat < g.order.length ? g.order[g.bull.seat] : null;
    else if (room.phase === 'playing') currentId = g.order[g.cur];
    let hint = '';
    if (room.phase === 'bulloff') hint = 'Bull-off: closest to the bullseye throws first';
    else if (room.phase === 'playing' && g.modeState) hint = mode.hint(g.modeState, g.cur, ctx);
    st.game = {
      order: g.order,
      cur: g.cur,
      currentId,
      round: g.round,
      leg: g.leg,
      legsToWin: g.legsToWin,
      legsWon: g.legsWon,
      turnPhase: g.turnPhase,
      walkonIndex: g.walkonIndex ?? -1,
      darts: g.darts,
      hint,
      view: g.modeState ? mode.view(g.modeState, ctx) : null,
      stats: g.stats,
      winnerId: g.winnerId,
      legWinnerId: g.legWinnerId,
      draw: g.draw,
      endText: g.endText,
      canUndo: room.phase === 'playing' && g.turnPhase === 'aim' && g.undo.length > 0,
      bull: room.phase === 'bulloff' ? { seat: g.bull.seat, dist: g.bull.dist } : null
    };
  }
  return st;
}

function pushState(room) { broadcast(room, publicState(room)); }

/* ------------------------------------------------------------------ engine */
function newStats(ids) {
  return Object.fromEntries(ids.map(id => [id, { darts: 0, visits: 0, points: 0, best: 0, tons: 0, s180: 0, bulls: 0, doubles: 0 }]));
}

function startGame(room) {
  clearTimers(room);
  const order = room.players.map(p => p.id);
  room.game = {
    order, cur: 0, startSeat: 0, round: 1, turnsThisRound: 0,
    darts: [], turnPhase: 'aim', visitRecorded: false,
    legsToWin: room.config.legs, leg: 1,
    legsWon: Object.fromEntries(order.map(id => [id, 0])),
    modeState: null, undo: [], stats: newStats(order),
    winnerId: null, legWinnerId: null, draw: false, endText: '',
    bull: null, walkonIndex: -1
  };
  // Walk-ons are presentation only; they must finish before an official throw.
  if (room.config.walkons !== false) {
    room.phase = 'walkon';
    room.game.turnPhase = 'walkon';
    pushState(room);
    broadcast(room, { t: 'walkonIntro' });
    later(room, T.WALKON_INTRO, () => nextWalkon(room, 0));
  } else startMatch(room);
}

function nextWalkon(room, index) {
  if (room.phase !== 'walkon' || !room.game) return;
  if (index >= room.game.order.length) return startMatch(room);
  room.game.walkonIndex = index;
  pushState(room);
  broadcast(room, { t: 'walkon', id: room.game.order[index], index, total: room.game.order.length, duration: T.WALKON_CARD });
  later(room, T.WALKON_CARD, () => nextWalkon(room, index + 1));
}

function startMatch(room) {
  if (!room.game) return;
  room.game.walkonIndex = -1;
  // The introduction is over. Re-arm the first official throw, including bull-offs.
  room.game.turnPhase = 'aim';
  broadcast(room, { t: 'gameStart', title: titleFor(room.config) });
  const order = room.game.order;
  if (room.config.bullOff && order.length > 1) {
    room.phase = 'bulloff';
    room.game.bull = { seat: 0, dist: {} };
    pushState(room);
    broadcast(room, { t: 'turn', id: order[0], bulloff: true });
  } else {
    startLeg(room);
  }
}

function startLeg(room) {
  const g = room.game, mode = MODES[room.config.mode];
  g.darts = [];
  g.modeState = mode.create(g.order.length, room.config.options, {});
  g.round = 1;
  g.turnsThisRound = 0;
  g.cur = g.startSeat;
  g.undo = [];
  g.legWinnerId = null;
  room.phase = 'playing';
  beginTurn(room);
}

function beginTurn(room) {
  const g = room.game, mode = MODES[room.config.mode];
  g.darts = [];
  g.turnPhase = 'aim';
  g.visitRecorded = false;
  if (mode.turnStart) mode.turnStart(g.modeState, g.cur, ctxFor(room));
  pushState(room);
  const turnMsg = { t: 'turn', id: g.order[g.cur] };
  if (room.config.mode === 'x01') {
    const left = g.modeState.scores[g.cur];
    if (left <= 170 && g.modeState.opened[g.cur]) turnMsg.require = left;
  }
  broadcast(room, turnMsg);
}

function snapshot(g) {
  return JSON.stringify({ modeState: g.modeState, cur: g.cur, round: g.round, turnsThisRound: g.turnsThisRound, darts: g.darts, stats: g.stats });
}

function physicsFor(player, data) {
  const phys = resolveThrow({ aim: data.aim, power: data.power, stability: data.stability, lateral: data.lateral }, player.difficulty);
  const hit = (!phys.reached || phys.bounceOut) ? { ...MISS } : scoreAt(phys.landing.x, phys.landing.y);
  const dart = {
    label: hit.label, score: hit.score, number: hit.number, multiplier: hit.multiplier,
    x: phys.landing.x, y: phys.landing.y, reached: phys.reached, bounceOut: phys.bounceOut
  };
  const physOut = { aim: phys.aim, landing: phys.landing, flight: phys.flight, feedback: phys.feedback, power: phys.power, reached: phys.reached, bounceOut: phys.bounceOut, input: data.input === 'swipe' ? 'swipe' : 'motion' };
  return { phys: physOut, hit, dart };
}

function handleThrow(room, player, data) {
  const g = room.game;
  if (!g) return;
  if (room.phase === 'bulloff') return bullThrow(room, player, data);
  if (room.phase !== 'playing' || g.turnPhase !== 'aim' || g.order[g.cur] !== player.id) return;
  const mode = MODES[room.config.mode];

  g.undo.push(snapshot(g));
  if (g.undo.length > 30) g.undo.shift();

  const { phys, hit, dart } = physicsFor(player, data);
  const res = mode.throw(g.modeState, g.cur, hit, ctxFor(room, { dartIndex: g.darts.length })) || {};
  dart.bust = !!res.bust;
  g.darts.push(dart);

  const st = g.stats[player.id];
  st.darts++;
  if (hit.number === 25) st.bulls++;
  if (hit.multiplier === 2) st.doubles++;

  g.turnPhase = 'flight';
  touch(room);
  broadcast(room, { t: 'dart', id: player.id, index: g.darts.length - 1, dart, hit, phys, text: res.text || hit.label, bust: !!res.bust, event: res.event || (hit.label === 'BULL' ? 'bull' : null) });
  pushState(room);

  later(room, T.FLIGHT, () => {
    if (res.winner !== undefined) return endLeg(room, res.winner, res.text);
    if (res.turnOver || g.darts.length >= 3) return collect(room, !!res.bust);
    g.turnPhase = 'aim';
    pushState(room);
  });
}

function recordVisit(room, bust) {
  const g = room.game;
  if (g.visitRecorded) return 0;
  g.visitRecorded = true;
  const id = g.order[g.cur];
  const st = g.stats[id];
  // Announce and record points the rules actually credit, not merely the
  // numbers physically hit (e.g. darts before double-in, or Shanghai misses).
  let total = bust ? 0 : g.darts.reduce((a, d) => a + d.score, 0);
  if (!bust && room.config.mode === 'x01') total = g.modeState.turnScored;
  if (!bust && room.config.mode === 'shanghai') {
    total = g.darts.filter(d => d.number === g.round).reduce((a, d) => a + d.score, 0);
  }
  st.visits++;
  st.points += total;
  st.best = Math.max(st.best, total);
  if (total >= 100) st.tons++;
  if (total === 180) st.s180++;
  return total;
}

function collect(room, bust) {
  const g = room.game, mode = MODES[room.config.mode];
  const total = recordVisit(room, bust);
  g.turnPhase = 'collect';
  broadcast(room, { t: 'visit', id: g.order[g.cur], total, bust, call: !!mode.callsVisit });
  pushState(room);
  later(room, T.COLLECT, () => endTurn(room));
}

function endTurn(room) {
  const g = room.game, mode = MODES[room.config.mode];
  const r = mode.turnEnd ? mode.turnEnd(g.modeState, g.cur, ctxFor(room)) : null;
  if (r && r.winner !== undefined) return endLeg(room, r.winner, r.text);
  advanceSeat(room);
  beginTurn(room);
}

function advanceSeat(room) {
  const g = room.game, mode = MODES[room.config.mode];
  const n = g.order.length;
  g.turnsThisRound++;
  if (g.turnsThisRound >= activeCount(room)) { g.round++; g.turnsThisRound = 0; }
  let next = g.cur;
  for (let i = 0; i < n; i++) {
    next = (next + 1) % n;
    if (!(mode.isOut && mode.isOut(g.modeState, next))) break;
  }
  g.cur = next;
}

function endLeg(room, seat, text) {
  const g = room.game;
  recordVisit(room, false);
  g.turnPhase = 'done';
  g.endText = text || '';
  let gameOver = false;
  if (seat === -1) {
    g.draw = true;
    gameOver = true;
  } else {
    const id = g.order[seat];
    g.legsWon[id]++;
    g.legWinnerId = id;
    if (g.legsWon[id] >= g.legsToWin) { g.winnerId = id; gameOver = true; }
  }
  room.phase = gameOver ? 'gameOver' : 'legOver';
  broadcast(room, { t: 'legEnd', winnerId: g.legWinnerId, draw: g.draw, gameOver, text: g.endText });
  pushState(room);
  if (!gameOver) {
    later(room, T.LEG_BREAK, () => {
      g.leg++;
      g.startSeat = (g.startSeat + 1) % g.order.length;
      startLeg(room);
    });
  }
}

function bullThrow(room, player, data) {
  const g = room.game, b = g.bull;
  if (g.turnPhase !== 'aim' || g.order[b.seat] !== player.id) return;
  const { phys, dart } = physicsFor(player, data);
  const ok = phys.reached && !phys.bounceOut;
  const dist = ok ? Math.hypot(phys.landing.x, phys.landing.y) : 9999;
  b.dist[player.id] = Math.round(dist * 10) / 10;
  g.darts = [dart];
  g.turnPhase = 'flight';
  touch(room);
  broadcast(room, { t: 'dart', id: player.id, index: 0, dart, hit: { label: dart.label, score: dart.score }, phys, bulloff: true, text: ok ? Math.round(dist) + ' mm from the bull' : 'Missed the board', event: dart.label === 'BULL' ? 'bull' : null });
  pushState(room);
  later(room, T.BULL_NEXT, () => {
    b.seat++;
    g.darts = [];
    if (b.seat >= g.order.length) {
      g.order = [...g.order].sort((x, y) => b.dist[x] - b.dist[y]);
      g.turnPhase = 'done';
      broadcast(room, { t: 'bullResult', order: g.order, firstId: g.order[0] });
      pushState(room);
      later(room, T.BULL_RESULT, () => startLeg(room));
    } else {
      g.turnPhase = 'aim';
      pushState(room);
      broadcast(room, { t: 'turn', id: g.order[b.seat], bulloff: true });
    }
  });
}

/* ---------------------------------------------------------------- messages */
const HANDLERS = {
  host(ws, m) {
    let room = m.code && rooms.get(String(m.code).toUpperCase());
    if (!room || room.hostKey !== m.hostKey) room = createRoom();
    if (room.tv && room.tv !== ws) { send(room.tv, { t: 'replaced' }); try { room.tv.close(); } catch { /* ignore */ } }
    room.tv = ws;
    ws.room = room; ws.role = 'tv';
    touch(room);
    send(ws, { t: 'hosted', code: room.code, hostKey: room.hostKey });
    pushState(room);
  },

  join(ws, m) {
    const room = rooms.get(String(m.code || '').toUpperCase().trim());
    if (!room) return send(ws, { t: 'error', code: 'noRoom', message: 'No game with that code. Check the code on the TV.' });
    const pid = String(m.playerId || '').slice(0, 40);
    let p = pid && playerById(room, pid);
    if (p) {
      if (p.ws && p.ws !== ws) { send(p.ws, { t: 'replaced' }); try { p.ws.close(); } catch { /* ignore */ } }
      p.ws = ws; p.online = true;
      if (m.name) p.name = cleanName(m.name, p.name);
    } else {
      if (room.phase !== 'lobby') return send(ws, { t: 'error', code: 'inProgress', message: 'A game is in progress. You can join when it finishes.' });
      if (room.players.length >= MAX_PLAYERS) return send(ws, { t: 'error', code: 'full', message: 'This game is full (8 players).' });
      const used = new Set(room.players.map(x => x.colour));
      p = {
        id: pid || crypto.randomUUID(),
        name: cleanName(m.name, 'Player ' + (room.players.length + 1)),
        colour: COLOURS.find(c => !used.has(c)) || COLOURS[0],
        difficulty: DIFFICULTY[m.difficulty] ? m.difficulty : 'normal',
        control: m.control === 'swipe' ? 'swipe' : 'motion',
        avatarId: autoAvatar(room, m.avatarId),
        ws, online: true
      };
      room.players.push(p);
      broadcast(room, { t: 'joined', id: p.id, name: p.name });
    }
    if (p.dropTimer) { clearTimeout(p.dropTimer); p.dropTimer = null; }
    ws.room = room; ws.role = 'phone'; ws.playerId = p.id;
    refreshCaptain(room);
    touch(room);
    send(ws, { t: 'welcome', id: p.id, code: room.code, catalog: CATALOG, generic: GENERIC_OPTIONS, colour: p.colour, avatarId: p.avatarId });
    pushState(room);
  },

  avatar(ws, m, room, player) {
    if (room.phase !== 'lobby') return send(ws, { t: 'error', code: 'avatarLocked', message: 'Characters can be changed in the lobby.' });
    const id = String(m.avatarId || '');
    if (!BY_ID[id]) return send(ws, { t: 'error', code: 'avatarInvalid', message: 'Unknown character.' });
    if (room.players.some(p => p.id !== player.id && p.avatarId === id)) {
      return send(ws, { t: 'error', code: 'avatarTaken', message: 'That character is already taken. Pick another.' });
    }
    player.avatarId = id;
    touch(room);
    pushState(room);
  },

  skipWalkons(ws, m, room, player) {
    if (room.phase !== 'walkon' || room.captainId !== player.id) return;
    clearTimers(room);
    startMatch(room);
  },

  setup(ws, m, room, player) {
    if (room.phase !== 'lobby' || room.captainId !== player.id) return;
    room.config = normaliseConfig(m);
    pushState(room);
  },

  start(ws, m, room, player) {
    if (room.phase !== 'lobby' || room.captainId !== player.id) return;
    const mode = MODES[room.config.mode];
    const n = room.players.length;
    if (n < mode.min || n > mode.max) {
      return send(ws, { t: 'error', code: 'players', message: mode.name + ' needs ' + mode.min + (mode.max > mode.min ? ' to ' + mode.max : '') + ' players.' });
    }
    startGame(room);
  },

  settings(ws, m, room, player) {
    if (m.difficulty && DIFFICULTY[m.difficulty]) player.difficulty = m.difficulty;
    if (m.control === 'swipe' || m.control === 'motion') player.control = m.control;
    if (m.name) player.name = cleanName(m.name, player.name);
    pushState(room);
  },

  aim(ws, m, room, player) {
    const g = room.game;
    if (!g || g.turnPhase !== 'aim') return;
    const current = room.phase === 'bulloff' ? g.order[g.bull.seat] : g.order[g.cur];
    if (current !== player.id) return;
    const x = Number(m.x), y = Number(m.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    send(room.tv, { t: 'aim', id: player.id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, mode: m.mode === 'swipe' ? 'swipe' : 'motion' });
  },

  throw(ws, m, room, player) { handleThrow(room, player, m); },

  undo(ws, m, room, player) {
    const g = room.game;
    if (room.captainId !== player.id || !g || room.phase !== 'playing' || g.turnPhase !== 'aim' || !g.undo.length) return;
    Object.assign(g, JSON.parse(g.undo.pop()));
    g.visitRecorded = false;
    broadcast(room, { t: 'undone' });
    pushState(room);
  },

  skip(ws, m, room, player) {
    const g = room.game;
    if (room.captainId !== player.id || !g || room.phase !== 'playing' || g.turnPhase !== 'aim') return;
    collect(room, false);
  },

  end(ws, m, room, player) {
    if (room.captainId !== player.id || !room.game) return;
    clearTimers(room);
    const g = room.game;
    g.turnPhase = 'done';
    g.endText = 'Game ended by the captain';
    room.phase = 'gameOver';
    broadcast(room, { t: 'legEnd', winnerId: null, draw: false, gameOver: true, text: g.endText });
    pushState(room);
  },

  again(ws, m, room, player) {
    if (room.captainId !== player.id || room.phase !== 'gameOver') return;
    if (m.rematch) return startGame(room);
    clearTimers(room);
    room.game = null;
    room.phase = 'lobby';
    room.players = room.players.filter(p => p.online);
    refreshCaptain(room);
    pushState(room);
  },

  leave(ws, m, room, player) {
    // Leaving must detach the old WebSocket, even mid-match, or it keeps
    // receiving a different room's states after the phone joins elsewhere.
    if (player.dropTimer) { clearTimeout(player.dropTimer); player.dropTimer = null; }
    if (room.phase === 'lobby') {
      room.players = room.players.filter(p => p.id !== player.id);
    } else {
      // Preserve an active game's turn order and rules. The player may reclaim
      // this seat later; the captain can skip an absent player's turn.
      player.online = false;
      player.ws = null;
    }
    ws.room = null; ws.role = null; ws.playerId = null;
    refreshCaptain(room);
    pushState(room);
  }
};

/* --------------------------------------------------------------- websocket */
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    // Handle protected lobby reset before looking up generic phone actions.
    // This message is deliberately not exposed through HANDLERS.
    // TV must prove possession of the private room host key. A phone must
    // be the current captain; guests cannot interrupt somebody else's match.
    if (m.t === 'returnLobby') {
      const room = ws.room;
      if (!room) return;
      if (ws.role === 'tv') {
        if (room.tv !== ws || m.hostKey !== room.hostKey) return;
      } else if (ws.role === 'phone') {
        const player = playerById(room, ws.playerId);
        if (!player || player.id !== room.captainId || !player.online || player.ws !== ws) return;
      } else return;
      if (room.phase !== 'lobby') returnRoomToLobby(room);
      else pushState(room);
      return;
    }
    const fn = HANDLERS[m.t];
    if (!fn) return;
    if (m.t === 'host' || m.t === 'join') return fn(ws, m);
    const room = ws.room;
    if (!room || ws.role !== 'phone') return;
    const player = playerById(room, ws.playerId);
    if (!player) return;
    try { fn(ws, m, room, player); }
    catch (e) { console.error('Handler error', m.t, e); }
  });

  ws.on('close', () => {
    const room = ws.room;
    if (!room) return;
    if (ws.role === 'tv' && room.tv === ws) { room.tv = null; return; }
    if (ws.role === 'phone') {
      const p = playerById(room, ws.playerId);
      if (!p || p.ws !== ws) return;
      p.ws = null; p.online = false;
      if (room.phase === 'lobby') {
        p.dropTimer = setTimeout(() => {
          if (p.online || room.phase !== 'lobby') return;
          room.players = room.players.filter(x => x !== p);
          refreshCaptain(room);
          pushState(room);
        }, T.LOBBY_DROP);
      }
      refreshCaptain(room);
      pushState(room);
    }
  });
});

// Keep connections alive (Render closes idle sockets) and drop dead ones.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* ignore */ }
  }
}, 25000);

// Remove abandoned rooms.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const anyone = (room.tv && room.tv.readyState === 1) || room.players.some(p => p.online);
    if (!anyone && now - room.lastActive > T.ROOM_IDLE) { clearTimers(room); rooms.delete(room.code); }
  }
}, 60000);

server.listen(PORT, () => console.log('OCHE running on port ' + PORT));

module.exports = { server };
