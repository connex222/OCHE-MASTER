'use strict';
// Fast release-gate checks for browser-script syntax, navigation, throw capture,
// and the required recorded caller preloading. No browser dependencies.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const phone=read('public/phone.html');
const tv=read('public/tv.html');
const extract = (html, label) => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).filter(body => body.trim().length > 0);
  assert.equal(scripts.length,1,label+' contains exactly one inline JS program');
  return scripts[0];
};
new vm.Script(extract(phone,'Phone'),{filename:'phone.html'});
new vm.Script(extract(tv,'TV'),{filename:'tv.html'});
console.log('PASS frontend: phone and TV JavaScript parse');
assert.match(phone,/const requestedRoom = scannedRoom === null/);
assert.match(phone,/if \(requestedRoom !== null\)/);
assert.match(phone,/if \(\/\^\[A-Z\]\{4\}\$\/\.test\(requestedRoom\)\) code = requestedRoom/);
assert.match(phone,/function leaveGame\(\)/);
assert.match(phone,/id="backToJoin"/);
assert.match(phone,/id="netNotice"/);
assert.match(phone,/ws\.readyState === WebSocket\.OPEN/);
assert.match(phone,/if \(previousPhase && previousPhase !== m\.phase\)/);
console.log('PASS frontend: QR priority, connection status and screen cleanup');
assert.match(phone,/const endP = local\(e\), pts = drag\.pts/);
assert.match(phone,/pts\.push\(endP\)/);
assert.match(phone,/activePointerId !== null/);
assert.match(phone,/let gripPointerId = null/);
assert.match(phone,/pad\.setPointerCapture\(e\.pointerId\)/);
assert.match(phone,/Math\.max\(16, endP\.t - p0\.t\)/);
assert.match(phone,/closeTimer = setTimeout\(close, 1200\)/);
console.log('PASS frontend: swipe release, pointer capture and calibration');
assert.match(tv,/const callerKeys = \['0', '180', 'gameon', 'bust', 'killer', 'gameshot_leg', 'gameshot_match'\]/);
assert.match(tv,/optional\[key\] = fetchBuf\(key\)/);
assert.match(tv,/Sound\.duckVoice/);
assert.match(tv,/Caller\.cancel/);
console.log('PASS frontend: approved recorded calls preload before games');
const server = read('server.js');
assert.match(server,/ws\.room = null; ws\.role = null; ws\.playerId = null/);
assert.match(server,/player\.online = false;\s*player\.ws = null/);
console.log('OCHE FRONTEND/NAVIGATION QA: 4 checks passed');
