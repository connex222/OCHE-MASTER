'use strict';
// OCHE Bible quality matrix. Deterministic rules and presentation checks without network/deploy dependencies.
// Run: node test/bible-regression.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scoreAt } = require('../lib/board');
const { checkout } = require('../lib/checkouts');
const { MODES, catalog, normaliseConfig } = require('../lib/modes');

let cases = 0;
const check = (name, fn) => { fn(); cases++; console.log('PASS', name); };
const hit = (n, m = 1) => ({ number: n, multiplier: m, score: n * m, label: (m === 3 ? 'T' : m === 2 ? 'D' : '') + n });
const miss = { number: 0, multiplier: 0, score: 0, label: 'MISS' };
const ctx = (n, round = 1, lastInRound = false) => ({ n, round, lastInRound, dartsLeft: 3, names: Array.from({length:n},(_,i)=>'Player '+(i+1)) });
const value = l => l === 'BULL' ? 50 : l === '25' ? 25 : l[0] === 'T' ? 3 * Number(l.slice(1)) : l[0] === 'D' ? 2 * Number(l.slice(1)) : Number(l);

check('Seven Bible modes in catalogue', () => assert.deepEqual(catalog().map(c => c.id), ['x01','clock','world','cricket','shanghai','killer','practice']));
check('Mode setup rejects invalid options', () => { const c = normaliseConfig({ mode:'killer',options:{lives:9000},legs:40 }); assert.equal(c.options.lives,3);assert.equal(c.legs,1); });
check('Regulation board has the correct treble, double and bull scores', () => { assert.equal(scoreAt(0,103).score,60);assert.equal(scoreAt(0,166).score,40);assert.equal(scoreAt(0,0).score,50); });

check('Checkout suggestions cover all valid finishes and end legally', () => {
  for (const doubleOut of [true,false]) for (let darts = 1; darts<=3; darts++) for(let score=1;score<=180;score++) {
    const route=checkout(score,darts,doubleOut);
    if(!route) continue;
    assert.ok(route.length<=darts && route.length>=1,score);
    assert.equal(route.reduce((a,l)=>a+value(l),0),score,'sum '+score);
    if(doubleOut) assert.ok(route.at(-1)==='BULL'||route.at(-1)[0]==='D','double-out '+score);
  }
});
check('Impossible three-dart double-out scores are never proposed', () => {
  for(const s of [1,159,162,163,165,166,168,169,171,180]) assert.equal(checkout(s,3,true),null,'bogey '+s);
  assert.deepEqual(checkout(170,3,true),['T20','T20','BULL']);
});
check('X01 double-in does not score until a double lands', () => {
  const m=MODES.x01,s=m.create(1,{start:301,doubleIn:true,doubleOut:true});m.turnStart(s,0);
  m.throw(s,0,hit(20,3),ctx(1));assert.equal(s.scores[0],301);
  m.throw(s,0,hit(20,2),ctx(1));assert.equal(s.scores[0],261);
});
check('X01 bust restores start-of-visit score and opening', () => {
  const m=MODES.x01,s=m.create(1,{start:301,doubleIn:true,doubleOut:true});s.scores[0]=40;s.opened[0]=true;m.turnStart(s,0);
  m.throw(s,0,hit(20),ctx(1));const res=m.throw(s,0,hit(20),ctx(1));
  assert.equal(res.bust,true);assert.equal(s.scores[0],40);assert.equal(s.opened[0],true);assert.equal(s.turnScored,0);
});
check('X01 double-out finishes and straight-out configuration finishes', () => {
  const m=MODES.x01;for (const doubleOut of [true,false]) {
    const s=m.create(1,{start:301,doubleIn:false,doubleOut});s.scores[0]=20;m.turnStart(s,0);
    const r=m.throw(s,0,hit(doubleOut?10:20,doubleOut?2:1),ctx(1));assert.equal(r.winner,0);
  }
});
check('Round the Clock progresses in order and recognises optional bull finish', () => {
  const m=MODES.clock,s=m.create(1,{finishBull:true,skips:false});
  assert.equal(m.hint(s,0).includes('1'),true);
  m.throw(s,0,hit(1),ctx(1));assert.equal(s.target[0],2);
  m.throw(s,0,hit(4),ctx(1));assert.equal(s.target[0],2);
  s.target[0]=20;m.throw(s,0,hit(20),ctx(1));assert.equal(s.target[0],21);
  assert.equal(m.throw(s,0,hit(25,2),ctx(1)).winner,0);
});
check('Round the Clock doubles and trebles only skip when configured', () => {
  const m=MODES.clock,s=m.create(1,{finishBull:false,skips:true});m.throw(s,0,hit(1,3),ctx(1));assert.equal(s.target[0],4);
});
check('Round the World ignores singles and requires doubles', () => {
  const m=MODES.world,s=m.create(1,{finishBull:true});m.throw(s,0,hit(1),ctx(1));assert.equal(s.target[0],1);
  m.throw(s,0,hit(1,2),ctx(1));assert.equal(s.target[0],2);
  s.target[0]=21;assert.equal(m.throw(s,0,hit(25,2),ctx(1)).winner,0);
});
check('Cricket closes a treble and then scores while opponents are open', () => {
  const m=MODES.cricket,s=m.create(3,{rounds:20});m.throw(s,0,hit(20,3),ctx(3));assert.equal(s.marks[0][20],3);
  m.throw(s,0,hit(20,2),ctx(3));assert.equal(s.points[0],40);
  m.throw(s,1,hit(20,3),ctx(3));m.throw(s,2,hit(20,3),ctx(3));
  m.throw(s,0,hit(20,3),ctx(3));assert.equal(s.points[0],40);
});
check('Cricket round limit resolves ties without fabricating a winner', () => {
  const m=MODES.cricket,s=m.create(3,{rounds:15});assert.equal(m.turnEnd(s,2,ctx(3,15,true)).winner,-1);
});
check('Shanghai scores only the round number and wins with single, double, treble', () => {
  const m=MODES.shanghai,s=m.create(2,{rounds:7});m.turnStart(s);
  m.throw(s,0,hit(20,3),ctx(2,1));assert.equal(s.points[0],0);
  m.throw(s,0,hit(1),ctx(2,1));m.throw(s,0,hit(1,2),ctx(2,1));
  assert.equal(m.throw(s,0,hit(1,3),ctx(2,1)).winner,0);
});
check('Killer allocates unique numbers and eliminates rivals with doubles', () => {
  const m=MODES.killer,s=m.create(4,{lives:3}),c=ctx(4);
  assert.equal(new Set(s.numbers).size,4);
  m.throw(s,0,hit(s.numbers[0],2),c);assert.equal(s.killer[0],true);
  for(let i=0;i<3;i++)m.throw(s,0,hit(s.numbers[1],2),c);
  assert.equal(s.lives[1],0);
  assert.equal(m.isOut(s,1),true);
});
check('Killer self-hit costs one life after promotion', () => {
  const m=MODES.killer,s=m.create(2,{lives:3}),c=ctx(2);
  m.throw(s,0,hit(s.numbers[0],2),c);
  m.throw(s,0,hit(s.numbers[0],2),c);assert.equal(s.lives[0],2);
});
check('Free Practice records visit points and three-dart average', () => {
  const m=MODES.practice,s=m.create(1);m.turnStart(s);m.throw(s,0,hit(20,3));m.throw(s,0,miss);m.throw(s,0,hit(20));m.turnEnd(s,0);
  assert.equal(s.points[0],80);assert.equal(s.best[0],80);assert.ok(m.view(s).rows[0].main.startsWith('80'));
});
check('Every mode supports valid player counts with hints, views and first misses', () => {
  for(const [id,m] of Object.entries(MODES)) for(const n of [m.min,Math.min(m.max,3),m.max]){
    const conf=normaliseConfig({mode:id});const s=m.create(n,conf.options);const c=ctx(n);
    if(m.turnStart)m.turnStart(s,0,c);
    const hint=m.hint(s,0,c);assert.equal(typeof hint,'string',id);
    const v=m.view(s,c);assert.equal(v.rows.length,n,id);
    m.throw(s,0,miss,c);assert.equal(m.view(s,c).rows.length,n,id);
  }
});
check('TV/phone entrypoints retain the QR, accessible join, and safe score hints', () => {
  const tv=fs.readFileSync(path.join(__dirname,'../public/tv.html'),'utf8');
  const phone=fs.readFileSync(path.join(__dirname,'../public/phone.html'),'utf8');
  assert.match(tv,/id="qrImg"/);assert.match(tv,/phone\?code=/);
  assert.match(tv,/id="visitScore"/);assert.match(tv,/FINISHING ROUTE/);
  assert.match(phone,/new URLSearchParams\(location.search\).get\('code'\)/);
});
console.log('OCHE BIBLE RULES QA: '+cases+' groups passed.');
