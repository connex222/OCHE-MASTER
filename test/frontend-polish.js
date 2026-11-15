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
assert.match(tv,/const callerKeys = \['0', '180', 'gameon', 'bust', 'killer', 'gameshot_leg', 'gameshot_match', 'letsplay'/);
assert.match(tv,/walkon_dinner_lady/);
assert.match(tv,/optional\[key\] = fetchBuf\(key\)/);
assert.match(tv,/Sound\.duckVoice/);
assert.match(tv,/Caller\.cancel/);
console.log('PASS frontend: approved recorded calls preload before games');
const server = read('server.js');
assert.match(server,/ws\.room = null; ws\.role = null; ws\.playerId = null/);
assert.match(server,/player\.online = false;\s*player\.ws = null/);
const avatars = require('../lib/avatars').AVATARS;
assert.equal(avatars.length,12);
assert.equal(new Set(avatars.map(a=>a.file)).size,12);
for(const a of avatars)assert.match(a.file,/^avatar_\d\d_[a-z_]+\.png$/);
assert.match(phone,/id="avatarPicked"/);
assert.match(phone,/id="avatarGrid"/);
assert.match(phone,/data-avatar/);
assert.match(phone,/id="walkonSkip"/);
assert.match(phone,/skipWalkons/);
assert.match(tv,/id="walkonOverlay"/);
assert.match(tv,/class="winnerFigure"/);
assert.match(tv,/portrait\(p, 'rowAvatar'\)/);
assert.match(tv,/walkon_sting/);
console.log('PASS frontend: twelve character assets, picker, walk-ons and winner art');
// Render the avatar picker in a simulated DOM: repeat state messages must
// preserve the decoded character images and the player's open picker.
const aStart=phone.indexOf('let renderedAvatarSelection =');
const aEnd=phone.indexOf("$('avatarGrid').addEventListener(",aStart);
assert.ok(aStart>0&&aEnd>aStart,'Avatar gallery render functions are present');
const slots=Object.fromEntries(['avatarPicked','avatarGrid'].map(id=>[id,{
  writes:0,_html:'',
  get innerHTML(){return this._html;},
  set innerHTML(value){this._html=value;this.writes++;}
}]));
const fakeAvatars=['a','b','c','d'].map(id=>({
  id,name:'Character '+id,nickname:'Nickname '+id,file:'avatar_'+id+'.png',tagline:'Pub player'
}));
const avatarContext=vm.createContext({
  avatars:fakeAvatars,S:{players:[
    {id:'p1',avatarId:'a',colour:'#D4A73A'},
    {id:'p2',avatarId:'b',colour:'#127A3E'}
  ]},me:{id:'p1'},$:(id)=>slots[id],esc:s=>String(s)
});
vm.runInContext(phone.slice(aStart,aEnd),avatarContext,{timeout:1000});
const renderGallery=()=>vm.runInContext('renderAvatars()',avatarContext,{timeout:1000});
renderGallery();
assert.equal(slots.avatarGrid.writes,1);
assert.equal(slots.avatarPicked.writes,1);
renderGallery();renderGallery();
assert.equal(slots.avatarGrid.writes,1,'Redundant state updates should not recreate thumbnails');
assert.equal(slots.avatarPicked.writes,1,'Redundant state updates should not recreate selected portrait');
avatarContext.S.players[1].avatarId='c';
renderGallery();
assert.equal(slots.avatarGrid.writes,2,'Another player choosing a character updates availability');
assert.equal(slots.avatarPicked.writes,1,'Other players should not replace my selected portrait');
avatarContext.S.players[0].avatarId='d';
renderGallery();
assert.equal(slots.avatarGrid.writes,3);
assert.equal(slots.avatarPicked.writes,2);
console.log('PASS frontend: avatar gallery resists repeated redraws but responds to selection changes');
assert.match(tv,/gameOnVoiceUntil = performance\.now\(\) \+ 1600/);
assert.match(tv,/clearTimeout\(scheduledTurnCall\)/);
assert.match(tv,/S\.game\.currentId !== id/);
assert.match(tv,/queueTurnAnnouncement\(m\.id, announcement, delay\)/);
assert.match(tv,/Caller\.cancel\(\);\s*\$\('walkonOverlay'\)/);
console.log('PASS frontend: caller starts "Game on" first and discards stale turn calls');

const studioScores = [12, 18, 20, 24, 26, 32, 36, 40, 45, 50, 57, 60, 80, 81, 85, 95, 100, 120, 121, 125, 140, 150, 160, 170];
const mediaManifest = read('deployment/fetch-media.js');
for (const n of studioScores) {
  assert.match(mediaManifest, new RegExp("'"+n+"\\.mp3':'[0-9a-f-]+\\.mp3'"), 'Recorded caller clip '+n+' must be in Render manifest');
}
assert.match(tv, /const studioScores = \[1, 2, 3, 4/);
assert.match(tv, /const studioPacks = \[\.\.\.new Set/);
assert.match(tv, /src="\/assets\/js\/number-cues\.js"/);
assert.match(tv, /void warmNumberCalls\(\)/);
assert.match(tv, /Caller\.say\(String\(t\), words\(t\)\)/);
console.log('PASS frontend: 24 matching recorded score calls ship with lazy fallback and background warm-up');
console.log('OCHE FRONTEND/NAVIGATION QA: 8 checks passed');
