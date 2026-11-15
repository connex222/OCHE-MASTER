'use strict';
/*
 * Game modes. Each mode is a small rules module the engine (server.js) drives.
 *
 *   create(n, options, ctx)          -> fresh state for n seats
 *   turnStart(state, seat, ctx)      -> optional, called before each visit
 *   throw(state, seat, hit, ctx)     -> { text, bust, turnOver, winner, event }
 *   turnEnd(state, seat, ctx)        -> optional, may return { winner, text }
 *   isOut(state, seat)               -> optional, skip eliminated players
 *   view(state, ctx)                 -> what the TV and phones display
 *   hint(state, seat, ctx)           -> one line of advice for the thrower
 *
 * winner: seat index, or -1 for a draw.
 * ctx: { round, lastInRound, dartsLeft, dartIndex, names, n }
 * hit: { number, multiplier, score, label, ring }  (number 25 = bull)
 */

const crypto = require('crypto');
const { checkout } = require('./checkouts');

const YESNO = [{ v: true, l: 'Yes' }, { v: false, l: 'No' }];
const opt = (key, label, choices, def) => ({ key, label, choices, default: def });
const fill = (n, v) => Array.from({ length: n }, () => (typeof v === 'function' ? v() : v));
const avg3 = (pts, darts) => (darts ? (pts / darts * 3).toFixed(1) : '0.0');
const targetName = n => (n === 25 ? 'Bull' : String(n));

/** Seat with the highest value, or -1 if tied at the top. */
function bestSeat(values, tiebreak) {
  let best = -Infinity, seats = [];
  values.forEach((v, i) => {
    if (v > best) { best = v; seats = [i]; } else if (v === best) seats.push(i);
  });
  if (seats.length === 1) return seats[0];
  if (tiebreak) {
    const tb = seats.map(i => tiebreak[i]);
    const top = Math.max(...tb);
    const winners = seats.filter(i => tiebreak[i] === top);
    if (winners.length === 1) return winners[0];
  }
  return -1;
}

const MODES = {};

/* ------------------------------------------------------------------ X01 */
MODES.x01 = {
  id: 'x01',
  name: '501 / 301',
  min: 1, max: 8,
  callsVisit: true,
  rules: 'Count down to exactly zero. Finish on a double or the bullseye. Go below zero, or leave 1, and you bust: the whole visit scores nothing.',
  options: [
    opt('start', 'Starting score', [{ v: 501, l: '501' }, { v: 301, l: '301' }, { v: 701, l: '701' }], 501),
    opt('doubleIn', 'Double to start', YESNO, false),
    opt('doubleOut', 'Double to finish', YESNO, true)
  ],
  title: o => String(o.start) + (o.doubleIn ? ' double in' : ''),
  create(n, o) {
    return {
      start: o.start, doubleIn: o.doubleIn, doubleOut: o.doubleOut,
      scores: fill(n, o.start), opened: fill(n, !o.doubleIn),
      darts: fill(n, 0), points: fill(n, 0),
      turnStart: 0, turnStartOpened: true, turnScored: 0
    };
  },
  turnStart(s, p) {
    s.turnStart = s.scores[p];
    s.turnStartOpened = s.opened[p];
    s.turnScored = 0;
  },
  throw(s, p, h) {
    s.darts[p]++;
    if (!s.opened[p]) {
      if (h.multiplier === 2) s.opened[p] = true;
      else return { text: h.score ? 'Need a double to start' : 'Miss' };
    }
    const left = s.scores[p] - h.score;
    const bust = left < 0 || (s.doubleOut && left === 1) || (left === 0 && s.doubleOut && h.multiplier !== 2);
    if (bust) {
      s.points[p] -= s.turnScored;
      s.scores[p] = s.turnStart;
      s.opened[p] = s.turnStartOpened;
      s.turnScored = 0;
      return { bust: true, turnOver: true, text: 'Bust', event: 'bust' };
    }
    s.scores[p] = left;
    s.turnScored += h.score;
    s.points[p] += h.score;
    if (left === 0) return { winner: p, text: 'Game shot', event: 'gameshot' };
    return { text: h.score ? String(h.score) : 'No score' };
  },
  view(s) {
    return {
      type: 'standard',
      rows: s.scores.map((sc, i) => ({ main: String(sc), sub: 'Avg ' + avg3(s.points[i], s.darts[i]) })),
      scores: s.scores.slice()
    };
  },
  hint(s, p, ctx) {
    if (!s.opened[p]) return 'Hit any double to start scoring';
    const co = checkout(s.scores[p], ctx.dartsLeft, s.doubleOut);
    if (co) return 'Checkout: ' + co.join('  ');
    if (s.scores[p] <= (s.doubleOut ? 170 : 180)) return s.scores[p] + ' left. No finish with ' + ctx.dartsLeft + (ctx.dartsLeft === 1 ? ' dart' : ' darts') + ', set it up';
    return s.scores[p] + ' left. Aim for treble 20';
  }
};

/* --------------------------------------------------------- Round the Clock */
MODES.clock = {
  id: 'clock',
  name: 'Round the Clock',
  min: 1, max: 8,
  rules: 'Hit 1, then 2, then 3, all the way to 20. Any part of the number counts. First to finish wins.',
  options: [
    opt('finishBull', 'Finish on the bull', YESNO, true),
    opt('skips', 'Doubles and trebles skip ahead', YESNO, false)
  ],
  create(n, o) {
    return { target: fill(n, 1), finishBull: o.finishBull, skips: o.skips, darts: fill(n, 0) };
  },
  want(s, p) { return s.target[p] <= 20 ? s.target[p] : 25; },
  throw(s, p, h) {
    s.darts[p]++;
    const want = this.want(s, p);
    if (h.number !== want || h.multiplier === 0) return { text: 'Missed ' + targetName(want) };
    if (want === 25) return { winner: p, text: 'Round the clock done', event: 'gameshot' };
    s.target[p] += s.skips ? h.multiplier : 1;
    if (s.target[p] > 20) {
      if (!s.finishBull) return { winner: p, text: 'Round the clock done', event: 'gameshot' };
      s.target[p] = 21;
    }
    return { text: 'Next: ' + targetName(this.want(s, p)) };
  },
  view(s) {
    return {
      type: 'standard',
      rows: s.target.map((t, i) => ({ main: targetName(t <= 20 ? t : 25), sub: (t - 1) + ' done  ' + s.darts[i] + ' darts' }))
    };
  },
  hint(s, p) {
    const w = this.want(s, p);
    return w === 25 ? 'Aim for the bull to finish' : 'Aim for ' + w + (s.skips ? '. Doubles and trebles skip ahead' : '');
  }
};

/* --------------------------------------------------------- Round the World */
MODES.world = {
  id: 'world',
  name: 'Round the World',
  min: 1, max: 8,
  rules: 'The doubles challenge. Hit double 1, then double 2, all the way round to double 20. Only the outer double ring counts.',
  options: [opt('finishBull', 'Finish on the bullseye', YESNO, true)],
  create(n, o) { return { target: fill(n, 1), finishBull: o.finishBull, darts: fill(n, 0), hits: fill(n, 0) }; },
  throw(s, p, h) {
    s.darts[p]++;
    const t = s.target[p];
    const want = t <= 20 ? t : 25;
    if (h.number !== want || h.multiplier !== 2) return { text: want === 25 ? 'Missed the bullseye' : 'Missed double ' + want };
    s.hits[p]++;
    if (want === 25) return { winner: p, text: 'Round the world done', event: 'gameshot' };
    s.target[p]++;
    if (s.target[p] > 20 && !s.finishBull) return { winner: p, text: 'Round the world done', event: 'gameshot' };
    return { text: s.target[p] <= 20 ? 'Next: double ' + s.target[p] : 'Next: bullseye' };
  },
  view(s) {
    return {
      type: 'standard',
      rows: s.target.map((t, i) => ({
        main: t <= 20 ? 'D' + t : 'BULL',
        sub: s.darts[i] ? Math.round(s.hits[i] / s.darts[i] * 100) + '% doubles' : 'No darts yet'
      }))
    };
  },
  hint(s, p) {
    const t = s.target[p];
    return t <= 20 ? 'Aim for double ' + t + ', the thin outer ring' : 'Aim for the bullseye to finish';
  }
};

/* ------------------------------------------------------------------ Cricket */
const CRICKET = [20, 19, 18, 17, 16, 15, 25];
MODES.cricket = {
  id: 'cricket',
  name: 'Cricket',
  min: 1, max: 8,
  rules: 'Use 15 to 20 and the bull. Three marks close a number (a double is two, a treble is three). Once closed, extra hits score points until everyone has closed it. Close everything with the most points to win.',
  options: [opt('rounds', 'Round limit', [{ v: 15, l: '15' }, { v: 20, l: '20' }, { v: 30, l: '30' }], 20)],
  create(n, o) {
    return { marks: fill(n, () => Object.fromEntries(CRICKET.map(k => [k, 0]))), points: fill(n, 0), rounds: o.rounds, darts: fill(n, 0) };
  },
  closedAll(s, p) { return CRICKET.every(k => s.marks[p][k] >= 3); },
  totalMarks(s, p) { return CRICKET.reduce((a, k) => a + Math.min(3, s.marks[p][k]), 0); },
  throw(s, p, h) {
    s.darts[p]++;
    if (!CRICKET.includes(h.number) || h.multiplier === 0) return { text: 'No score' };
    const n = s.marks.length, num = h.number;
    const before = s.marks[p][num];
    const toMark = Math.min(Math.max(0, 3 - before), h.multiplier);
    s.marks[p][num] += toMark;
    const extra = h.multiplier - toMark;
    let text = targetName(num) + (toMark ? ' x' + toMark : '');
    if (s.marks[p][num] >= 3 && before < 3) text = targetName(num) + ' closed';
    if (extra > 0) {
      const othersOpen = [...Array(n).keys()].some(o => o !== p && s.marks[o][num] < 3);
      if (othersOpen) { s.points[p] += extra * num; text += '  +' + extra * num; }
    }
    if (this.closedAll(s, p)) {
      const others = s.points.filter((_, i) => i !== p);
      if (!others.length || s.points[p] >= Math.max(...others)) return { winner: p, text: 'All closed', event: 'gameshot' };
    }
    return { text };
  },
  turnEnd(s, p, ctx) {
    if (ctx.round >= s.rounds && ctx.lastInRound) {
      const w = bestSeat(s.points, s.marks.map((_, i) => this.totalMarks(s, i)));
      return { winner: w, text: 'Round limit reached' };
    }
    return null;
  },
  view(s) {
    return {
      type: 'cricket',
      nums: CRICKET,
      marks: s.marks.map(m => CRICKET.map(k => Math.min(3, m[k]))),
      rows: s.points.map((pt, i) => ({ main: String(pt), sub: this.totalMarks(s, i) + ' of 21 marks' }))
    };
  },
  hint(s, p, ctx) {
    const open = CRICKET.filter(k => s.marks[p][k] < 3).map(targetName);
    const left = s.rounds - ctx.round;
    return (open.length ? 'Still to close: ' + open.join(', ') : 'All closed, score points') + (left <= 3 ? '  (' + (left + 1) + ' rounds left)' : '');
  }
};

/* ----------------------------------------------------------------- Shanghai */
MODES.shanghai = {
  id: 'shanghai',
  name: 'Shanghai',
  min: 1, max: 8,
  callsVisit: true,
  rules: 'Round 1 aim for 1s, round 2 aim for 2s, and so on. Only the round number scores. Hit its single, double and treble in one visit for a Shanghai: instant win.',
  options: [opt('rounds', 'Rounds', [{ v: 7, l: '7' }, { v: 10, l: '10' }, { v: 20, l: '20' }], 7)],
  title: o => 'Shanghai (' + o.rounds + ')',
  create(n, o) { return { rounds: o.rounds, points: fill(n, 0), visit: { 1: 0, 2: 0, 3: 0 }, darts: fill(n, 0) }; },
  turnStart(s) { s.visit = { 1: 0, 2: 0, 3: 0 }; },
  throw(s, p, h, ctx) {
    s.darts[p]++;
    const t = ctx.round;
    if (h.number !== t || h.multiplier === 0) return { text: 'No score' };
    s.points[p] += h.score;
    s.visit[h.multiplier] = 1;
    if (s.visit[1] && s.visit[2] && s.visit[3]) return { winner: p, text: 'Shanghai', event: 'shanghai' };
    return { text: '+' + h.score };
  },
  turnEnd(s, p, ctx) {
    if (ctx.round >= s.rounds && ctx.lastInRound) return { winner: bestSeat(s.points), text: 'Final round complete' };
    return null;
  },
  view(s) { return { type: 'standard', rows: s.points.map((pt, i) => ({ main: String(pt), sub: s.darts[i] + ' darts' })) }; },
  hint(s, p, ctx) {
    return 'Round ' + ctx.round + ' of ' + s.rounds + ': only ' + ctx.round + 's score. Single, double and treble wins outright';
  }
};

/* ------------------------------------------------------------------- Killer */
MODES.killer = {
  id: 'killer',
  name: 'Killer',
  min: 2, max: 8,
  rules: 'Everyone gets a secret number. Hit your own double to become a Killer. Killers knock lives off rivals by hitting their doubles. Hit your own double as a Killer and you lose a life. Last one standing wins.',
  options: [opt('lives', 'Lives', [{ v: 3, l: '3' }, { v: 5, l: '5' }], 3)],
  create(n, o) {
    const pool = Array.from({ length: 20 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { numbers: pool.slice(0, n), lives: fill(n, o.lives), killer: fill(n, false), darts: fill(n, 0) };
  },
  isOut(s, p) { return s.lives[p] <= 0; },
  throw(s, p, h, ctx) {
    s.darts[p]++;
    if (h.multiplier !== 2 || h.number === 25) return { text: 'No score' };
    const owner = s.numbers.indexOf(h.number);
    if (owner < 0 || s.lives[owner] <= 0) return { text: 'D' + h.number + ' belongs to nobody' };
    let res;
    if (owner === p) {
      if (!s.killer[p]) { s.killer[p] = true; res = { text: 'Killer', event: 'killer' }; }
      else { s.lives[p]--; res = { text: 'Own goal: life lost' }; }
    } else if (!s.killer[p]) {
      return { text: 'That is ' + ctx.names[owner] + "'s double. Become a Killer first" };
    } else {
      s.lives[owner]--;
      res = { text: ctx.names[owner] + (s.lives[owner] <= 0 ? ' is out' : ' loses a life'), event: 'kill' };
    }
    const alive = s.lives.map((l, i) => (l > 0 ? i : -1)).filter(i => i >= 0);
    if (alive.length === 1) return { winner: alive[0], text: ctx.names[alive[0]] + ' survives', event: 'gameshot' };
    if (alive.length === 0) return { winner: -1, text: 'Nobody left standing' };
    if (s.lives[p] <= 0) res.turnOver = true;
    return res;
  },
  view(s) {
    return {
      type: 'standard',
      rows: s.numbers.map((num, i) => ({
        main: 'D' + num,
        sub: s.lives[i] <= 0 ? 'Out' : '\u2665'.repeat(s.lives[i]) + (s.killer[i] ? '  Killer' : '')
      }))
    };
  },
  hint(s, p) {
    return s.killer[p] ? 'You are a Killer. Hit a rival\'s double. Avoid D' + s.numbers[p] : 'Hit double ' + s.numbers[p] + ' to become a Killer';
  }
};

/* ---------------------------------------------------------------- Practice */
MODES.practice = {
  id: 'practice',
  name: 'Free Practice',
  min: 1, max: 8,
  callsVisit: true,
  rules: 'No rules, no winner. Throw freely, warm up, and watch your three-dart average. The captain ends the session.',
  options: [],
  create(n) { return { points: fill(n, 0), darts: fill(n, 0), best: fill(n, 0), visit: 0 }; },
  turnStart(s) { s.visit = 0; },
  throw(s, p, h) { s.darts[p]++; s.points[p] += h.score; s.visit += h.score; return { text: h.score ? String(h.score) : 'Miss' }; },
  turnEnd(s, p) { s.best[p] = Math.max(s.best[p], s.visit); return null; },
  view(s) {
    return { type: 'standard', rows: s.points.map((pt, i) => ({ main: avg3(pt, s.darts[i]), sub: 'Best visit ' + s.best[i] + '  ' + s.darts[i] + ' darts' })) };
  },
  hint() { return 'Throw freely. Aim anywhere you like' ; }
};

/* -------------------------------------------------------- catalogue & config */
const GENERIC = [
  opt('legs', 'Match length', [{ v: 1, l: 'Single game' }, { v: 2, l: 'Best of 3' }, { v: 3, l: 'Best of 5' }], 1),
  opt('bullOff', 'Bull-off to decide who starts', YESNO, true),
  opt('walkons', 'Player walk-ons', YESNO, true)
];

function catalog() {
  return Object.values(MODES).map(m => ({
    id: m.id, name: m.name, rules: m.rules, min: m.min, max: m.max,
    options: m.options.map(o => ({ key: o.key, label: o.label, choices: o.choices, default: o.default }))
  }));
}

function pick(def, value) {
  const hit = def.choices.find(c => c.v === value);
  return hit ? hit.v : def.default;
}

/** Validate a setup request into a safe config. */
function normaliseConfig(input = {}) {
  const mode = MODES[input.mode] ? input.mode : 'x01';
  const options = {};
  for (const o of MODES[mode].options) options[o.key] = pick(o, input.options ? input.options[o.key] : undefined);
  return { mode, options, legs: pick(GENERIC[0], input.legs), bullOff: pick(GENERIC[1], input.bullOff), walkons: pick(GENERIC[2], input.walkons) };
}

function titleFor(config) {
  const m = MODES[config.mode];
  return m.title ? m.title(config.options) : m.name;
}

module.exports = { MODES, GENERIC, catalog, normaliseConfig, titleFor };
