'use strict';
// Production gate: all 181 OCHE darts score calls are recorded, and grouped
// recordings are played using validated per-score cues, never arbitrary slices.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');
const media = read('deployment/fetch-media.js');
const tv = read('public/tv.html');
const context = { window: {} };
vm.runInNewContext(read('public/assets/js/number-cues.js'), context, {timeout:1000});
const cues = context.window.OCHE_NUMBER_CUES;
assert.ok(cues && typeof cues === 'object');

const callerStart = media.indexOf('const caller = {');
const callerEnd = media.indexOf('\n};', callerStart);
assert.ok(callerStart >= 0 && callerEnd > callerStart);
const caller = media.slice(callerStart, callerEnd);
const direct = new Set([...caller.matchAll(/^\s*'(\d+)\.mp3':\s*'[a-f\d-]+\.mp3'/gm)].map(m => Number(m[1])));
const packs = new Map([...caller.matchAll(/^\s*'(numberpack_\d+_\d+)\.mp3':\s*'[a-f\d-]+\.mp3'/gm)]
  .map(m=>[m[1],m[2]]));
assert.equal(direct.size,38,'0, 180, first 24 studio recordings, and 12 new individual recordings');
assert.equal(packs.size,6);
assert.equal(Object.keys(cues).length,143);

const durationCap = {
  numberpack_14_39:24.3,
  numberpack_40_69:33.5,
  numberpack_70_99:33.6,
  numberpack_100_129:46.1,
  numberpack_130_159:59.4,
  numberpack_160_179:37.4
};
for(let n=0;n<=180;n++){
  const directFile=direct.has(n), cue=cues[n];
  assert.ok(directFile||cue,'Missing professional score recording '+n);
  assert.ok(!(directFile&&cue),'Duplicate professional score recording '+n);
  if(!cue)continue;
  assert.ok(Array.isArray(cue) && cue.length===3,n);
  const [pack,start,end]=cue;
  assert.ok(packs.has(pack),'Missing CDN recording '+pack);
  assert.ok(Number.isFinite(start)&&start>=0,n);
  assert.ok(Number.isFinite(end)&&end-start>0.12,n);
  assert.ok(end<=durationCap[pack],n+' time exceeds the verified spoken asset duration');
}
console.log('PASS numbers: all 181 scores have distinct recorded calls');

const snippets=[
  /src="\/assets\/js\/number-cues\.js"/,
  /window\.OCHE_NUMBER_CUES/,
  /Sound\.playSegment\(clip,\s*cue\[1\],\s*cue\[2\]\)/,
  /const sourceKey = cue \? cue\[0\] : key/,
  /void warmNumberCalls\(\)/,
  /if \(activeClip\)/,
  /else speak\(text, id\)/
];
for(const regex of snippets)assert.match(tv,regex);
console.log('PASS numbers: sound engine uses validated reel offsets, studio files and safe fallback');

const script=[...tv.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).filter(s=>s.trim()).join('\n');
new vm.Script(script,{filename:'tv.html'});
console.log('PASS numbers: TV sound script parses');
console.log('OCHE FULL RECORDED NUMBER LIBRARY QA: 3 checks passed');
