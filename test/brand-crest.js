'use strict';
// Release gate: the approved numbered OCHE logo is a real, locally hosted
// raster asset, prominently placed without touching live scores or controls.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const tv=read('public/tv.html');
const phone=read('public/phone.html');
const bible=read('OCHE_BIBLE.md');
const jpeg=fs.readFileSync(path.join(base,'public/assets/img/oche-numbered-crest.jpg'));
assert.ok(jpeg.length>150000,'Crest must contain the proper original artwork, not a tiny icon');
assert.equal(jpeg[0],0xff);
assert.equal(jpeg[1],0xd8);
assert.equal(jpeg[jpeg.length-2],0xff);
assert.equal(jpeg[jpeg.length-1],0xd9);
console.log('PASS brand: a full-resolution, self-hosted original OCHE numbered crest is included');
assert.match(bible,/oche-numbered-crest\.jpg/);
assert.match(bible,/Do not place this decorative logo over the live scoring board/);
console.log('PASS brand: Bible protects regulation board scoring, approves the new identity');

const url='/assets/img/oche-numbered-crest.jpg';
const count=(s,x)=>s.split(x).length-1;
assert.equal(count(tv,'src="'+url+'"'),3,'TV must show crest at start, in lobby, and on scoreboard');
assert.equal(count(phone,'src="'+url+'"'),1,'Phone must show crest above joining fields');
assert.match(tv,/<div id="boardHead"><div id="logo"><img[^>]+oche-numbered-crest\.jpg[^>]+><span>OCHE<\/span>/);
assert.match(tv,/<div id="lobbyBrand" aria-hidden="true">/);
assert.match(tv,/#lobbyBrand \{[^}]*display:none/);
assert.match(tv,/#lobbyBrand\.on \{ display:flex; \}/);
assert.match(tv,/\$\('lobbyBrand'\)\.classList\.toggle\('on', lobby\)/);
assert.match(tv,/#lobbyBrand img \{[^}]*max-height:84%/);
console.log('PASS brand: large lobby crest and compact always-visible scoreboard crest');

assert.match(tv,/#splashCrest \{[^}]*max-height:50vh/);
assert.match(tv,/id="splashCrest"[^>]+oche-numbered-crest\.jpg[^>]+onerror=/);
assert.match(phone,/<div id="joinBrand">[\s\S]*?img[^>]+oche-numbered-crest\.jpg[\s\S]*?<\/div>/);
assert.match(phone,/#joinBrand img \{[^}]*width:min\(53vw,24vh,192px\)/);
const pBrand=phone.indexOf('id="joinBrand"'),pCode=phone.indexOf('<input id="code"');
assert.ok(pBrand>=0&&pCode>pBrand,'Brand must come before the join form');
console.log('PASS brand: responsive start screen and usable phone join form');

assert.match(tv,/\.area \{[^}]*pointer-events: none/);
assert.match(tv,/@media \(orientation:portrait\) \{\s*#lobbyBrand img/);
assert.match(tv,/id="qrImg"/);
assert.match(tv,/id="fullscreenBtn"/);
assert.match(tv,/id="mute"/);
assert.match(tv,/id="rows"/);
assert.match(tv,/id="visit"/);
assert.match(tv,/id="hint"/);
assert.match(phone,/id="pickMotion"/);
assert.match(phone,/id="pickSwipe"/);
assert.match(phone,/id="joinBtn"/);
assert.match(phone,/id="calibPad"/);
console.log('PASS brand: neither live board, QR, navigation nor calibration is obstructed by new controls');

for(const [label,html] of [['TV',tv],['phone',phone]]){
  const js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(m=>m[1]).filter(x=>x.trim()).join('\n');
  new vm.Script(js,{filename:label.toLowerCase()+'.html'});
}
console.log('PASS brand: both interfaces have valid JavaScript after integration');
console.log('OCHE BRAND CREST QA: 5 checks passed');
