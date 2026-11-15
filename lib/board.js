'use strict';
/*
 * Regulation dartboard geometry, in millimetres.
 * Origin = centre of the bullseye. +x is right, +y is UP.
 * These numbers are the single source of truth: the TV and phone draw the
 * board with exactly the same values, so what you see is what scores.
 */

// Numbers clockwise from the top.
const SEGMENTS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Radii to the CENTRE of each wire (WDF/BDO standard board).
const R = {
  BULL: 6.35,        // inner bull (50)
  OUTER_BULL: 15.9,  // outer bull (25)
  TREBLE_IN: 99,
  TREBLE_OUT: 107,
  DOUBLE_IN: 162,
  DOUBLE_OUT: 170,   // edge of the scoring area
  NUMBER_RING: 190,  // where the numbers sit
  SURROUND: 228      // edge of the black surround
};

const WIRE_RADII = [R.BULL, R.OUTER_BULL, R.TREBLE_IN, R.TREBLE_OUT, R.DOUBLE_IN, R.DOUBLE_OUT];

/** Angle in degrees, 0 = straight up, increasing clockwise. */
function angleDeg(x, y) {
  let a = Math.atan2(x, y) * 180 / Math.PI;
  if (a < 0) a += 360;
  return a;
}

function segmentAt(x, y) {
  return SEGMENTS[Math.floor(((angleDeg(x, y) + 9) % 360) / 18)];
}

function makeHit(number, multiplier, label, ring) {
  return { number, multiplier, score: number * multiplier, label, ring };
}

const MISS = Object.freeze({ number: 0, multiplier: 0, score: 0, label: 'MISS', ring: 'miss' });

/** What a dart landing at (x, y) mm scores. */
function scoreAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= R.BULL) return makeHit(25, 2, 'BULL', 'bull');
  if (r <= R.OUTER_BULL) return makeHit(25, 1, '25', 'outerBull');
  if (r > R.DOUBLE_OUT) return { ...MISS };
  const n = segmentAt(x, y);
  if (r >= R.TREBLE_IN && r <= R.TREBLE_OUT) return makeHit(n, 3, 'T' + n, 'treble');
  if (r >= R.DOUBLE_IN) return makeHit(n, 2, 'D' + n, 'double');
  return makeHit(n, 1, String(n), r < R.TREBLE_IN ? 'innerSingle' : 'outerSingle');
}

/** Distance in mm from (x, y) to the nearest wire. Used for bounce-outs. */
function wireDistance(x, y) {
  const r = Math.hypot(x, y);
  let d = Infinity;
  for (const k of WIRE_RADII) d = Math.min(d, Math.abs(r - k));
  if (r > R.OUTER_BULL && r <= R.DOUBLE_OUT + 1) {
    const a = (angleDeg(x, y) + 9) % 18;               // degrees past the last spider wire
    const da = Math.min(a, 18 - a) * Math.PI / 180;
    d = Math.min(d, r * Math.sin(da));
  }
  return d;
}

module.exports = { SEGMENTS, R, WIRE_RADII, MISS, angleDeg, segmentAt, scoreAt, wireDistance };
