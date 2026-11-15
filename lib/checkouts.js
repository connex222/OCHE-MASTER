'use strict';
/*
 * Checkout suggestions for X01.
 * Fewest darts first, then the doubles darts players prefer (D20, D16, D18...).
 */

function dart(n, m) {
  let label;
  if (n === 25) label = m === 2 ? 'BULL' : '25';
  else label = (m === 3 ? 'T' : m === 2 ? 'D' : '') + n;
  return { n, m, v: n * m, label };
}

const DOUBLE_PREF = [20, 16, 18, 12, 10, 8, 14, 19, 17, 15, 13, 11, 9, 6, 4, 7, 5, 3, 2, 1, 25];
const FINAL_DOUBLES = DOUBLE_PREF.map(n => dart(n, 2));

// Order in which setup darts are tried (most natural first).
const SETUP = [];
for (let n = 20; n >= 1; n--) SETUP.push(dart(n, 3));
SETUP.push(dart(25, 1), dart(25, 2));
for (let n = 20; n >= 1; n--) SETUP.push(dart(n, 1));
for (let n = 20; n >= 1; n--) SETUP.push(dart(n, 2));

function setups(rest, k) {
  if (k === 0) return rest === 0 ? [] : null;
  if (rest <= 0) return null;
  for (const a of SETUP) {
    if (a.v > rest) continue;
    const r = setups(rest - a.v, k - 1);
    if (r) return [a, ...r];
  }
  return null;
}

const cache = new Map();

/**
 * @returns {string[]|null} e.g. ['T20','T20','BULL'] or null if no finish.
 */
function checkout(score, dartsLeft = 3, doubleOut = true) {
  if (!Number.isInteger(score) || score <= 0 || dartsLeft <= 0) return null;
  if (score > (doubleOut ? 170 : 180)) return null;
  const key = score + ':' + dartsLeft + ':' + doubleOut;
  if (cache.has(key)) return cache.get(key);
  const finals = doubleOut ? FINAL_DOUBLES : SETUP;
  let found = null;
  outer:
  for (let k = 1; k <= dartsLeft; k++) {
    for (const f of finals) {
      const rest = score - f.v;
      if (rest < 0) continue;
      const s = setups(rest, k - 1);
      if (s) { found = [...s, f].map(d => d.label); break outer; }
    }
  }
  cache.set(key, found);
  return found;
}

module.exports = { checkout };
