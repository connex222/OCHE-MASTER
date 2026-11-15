'use strict';
/*
 * Throw physics.
 *
 * The phone never decides where a dart lands. It sends four measurements:
 *   aim        {x, y} mm  - where the crosshair was when the throw began
 *   power      ratio      - 1.0 = your ideal throw (calibrated per player)
 *   stability  0..1       - 0 = rock steady, 1 = very shaky
 *   lateral    mm         - sideways push from a swept or angled throw
 *
 * The server turns those into a landing point. Real ballistics from phone
 * sensors feel random, so this is a tuned "feel" model:
 *   - power error moves the dart up or down (soft drops, hard sails high)
 *   - steadiness and power error widen a Gaussian scatter
 *   - landings very close to a wire may bounce out
 */

const crypto = require('crypto');
const { wireDistance, R } = require('./board');

const DIFFICULTY = {
  easy:   { label: 'Easy',   sigma: 0.55, powerEffect: 0.45, bounce: 0.08 },
  normal: { label: 'Normal', sigma: 1.00, powerEffect: 1.00, bounce: 0.20 },
  pro:    { label: 'Pro',    sigma: 1.30, powerEffect: 1.25, bounce: 0.28 }
};

// Tuning constants (all in mm unless stated).
const TUNE = {
  baseSigma: 9,          // scatter of a perfect, steady throw
  stabilitySigma: 28,    // extra scatter at stability = 1
  powerSigma: 12,        // extra scatter per unit of power error
  perfectBand: 0.06,     // power within ±6% of ideal counts as perfect
  powerDrop: 85,         // vertical error at 100% power error
  powerCurve: 1.2,       // >1 = small errors forgiven, big errors punished
  minReach: 0.3,         // below this power the dart falls short
  wireZone: 1.0,         // landings within this of a wire can bounce out
  aimLimit: 260,
  lateralLimit: 60
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

function rand() { return crypto.randomInt(0, 0x7fffffff) / 0x7fffffff; }
function gauss() {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function feedbackFor(power, stability) {
  if (power < TUNE.minReach) return 'Far too soft';
  if (power < 1 - 0.25) return 'Too soft';
  if (power > 1 + 0.25) return 'Too hard';
  if (stability > 0.6) return 'Shaky release';
  if (Math.abs(power - 1) <= TUNE.perfectBand) return 'Perfect power';
  return power < 1 ? 'A touch soft' : 'A touch hard';
}

/**
 * @param {object} input  {aim:{x,y}, power, stability, lateral}
 * @param {string} difficulty  easy | normal | pro
 */
function resolveThrow(input = {}, difficulty = 'normal') {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const aim = {
    x: clamp(num(input.aim && input.aim.x, 0), -TUNE.aimLimit, TUNE.aimLimit),
    y: clamp(num(input.aim && input.aim.y, 0), -TUNE.aimLimit, TUNE.aimLimit)
  };
  const power = clamp(num(input.power, 1), 0, 2.5);
  const stability = clamp(num(input.stability, 0.3), 0, 1);
  const lateral = clamp(num(input.lateral, 0), -TUNE.lateralLimit, TUNE.lateralLimit);

  const flight = {
    duration: Math.round(clamp(560 / Math.sqrt(clamp(power, 0.5, 1.8)), 380, 780)),
    arc: Math.round(clamp(80 * (1.25 - power), 10, 110)),
    wobble: Number(stability.toFixed(2))
  };

  // Fell short of the board.
  if (power < TUNE.minReach) {
    return {
      aim, power, stability, flight, reached: false, bounceOut: false,
      landing: { x: aim.x * 0.6, y: -R.SURROUND - 80 },
      feedback: feedbackFor(power, stability)
    };
  }

  const err = power - 1;
  const eff = Math.max(0, Math.abs(err) - TUNE.perfectBand);
  const dy = Math.sign(err) * TUNE.powerDrop * Math.pow(eff, TUNE.powerCurve) * d.powerEffect;
  const sigma = (TUNE.baseSigma + stability * TUNE.stabilitySigma + eff * TUNE.powerSigma) * d.sigma;

  const landing = {
    x: aim.x + gauss() * sigma + lateral,
    y: aim.y + gauss() * sigma + dy
  };
  landing.x = Number(landing.x.toFixed(2));
  landing.y = Number(landing.y.toFixed(2));

  const onBoard = Math.hypot(landing.x, landing.y) <= R.DOUBLE_OUT;
  const bounceOut = onBoard && wireDistance(landing.x, landing.y) < TUNE.wireZone && rand() < d.bounce;

  return {
    aim, power, stability, flight, reached: true, bounceOut, landing,
    feedback: bounceOut ? 'Bounced off the wire' : feedbackFor(power, stability)
  };
}

module.exports = { resolveThrow, DIFFICULTY, TUNE };
