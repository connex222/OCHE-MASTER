'use strict';
// OCHE Bible 3b: avatars are chosen on phones, unique, persistent and narrated
// in a skippable pre-match walk-on. A real WebSocket smoke suite.
const assert = require('node:assert/strict');
const {AVATARS} = require('../lib/avatars');
const WebSocket = require('ws');
process.env.PORT='3996';
process.env.OCHE_SPEED='40';
const {server} = require('../server');
const sockets=[];
function open(){
 return new Promise((resolve,reject)=>{
  const w=new WebSocket('ws://127.0.0.1:3996');w.q=[];
  w.on('message',d=>{const m=JSON.parse(String(d));w.q.push(m);w.emit('packet',m);});
  w.once('open',()=>{sockets.push(w);resolve(w)});w.once('error',reject);
 });
}
function wait(w,i,fn,ms=7000){
 const old=w.q.slice(i).find(fn); if(old)return Promise.resolve(old);
 return new Promise((resolve,reject)=>{
  const t=setTimeout(()=>{w.off('packet',cb);reject(new Error('Avatar test timed out'))},ms);
  const cb=m=>{if(!fn(m))return;clearTimeout(t);w.off('packet',cb);resolve(m);};w.on('packet',cb);
 });
}
function cmd(sender,message,watcher,fn){const before=watcher.q.length;sender.send(JSON.stringify(message));return wait(watcher,before,fn)}
const st=predicate=>m=>m.t==='state'&&predicate(m);
let passed=0;function pass(label){console.log('PASS avatars:',label);passed++}
(async()=>{
 if(!server.listening)await new Promise(r=>server.once('listening',r));
 assert.equal(AVATARS.length,12);
 assert.equal(new Set(AVATARS.map(a=>a.id)).size,12);
 assert.equal(new Set(AVATARS.map(a=>a.file)).size,12);
 assert.ok(AVATARS.every(a=>a.file.endsWith('.png')&&a.voiceKey.startsWith('walkon_')));
 pass('Twelve distinct named Bible characters and exact asset paths');
 const tv=await open(),a=await open(),b=await open(),c=await open();
 const host=await cmd(tv,{t:'host'},tv,m=>m.t==='hosted');
 const code=host.code;
 const aw=await cmd(a,{t:'join',code,name:'Shaun',playerId:'avA',control:'swipe'},a,m=>m.t==='welcome');
 const bw=await cmd(b,{t:'join',code,name:'Sue',playerId:'avB',control:'motion'},b,m=>m.t==='welcome');
 const cw=await cmd(c,{t:'join',code,name:'Pat',playerId:'avC',control:'swipe'},c,m=>m.t==='welcome');
 const initial=await wait(tv,0,st(s=>s.players.length===3));
 assert.equal(initial.avatars.length,12);
 const taken=new Set([aw.avatarId,bw.avatarId,cw.avatarId]);
 assert.equal(taken.size,3,'Autopicks must never collide');
 pass('Unchosen players receive distinct available avatars');
 const bErr=await cmd(b,{t:'avatar',avatarId:aw.avatarId},b,m=>m.t==='error'&&m.code==='avatarTaken');
 assert.match(bErr.message,/already taken/i);
 const still=tv.q.filter(m=>m.t==='state').at(-1);
 assert.equal(still.players.find(p=>p.id==='avB').avatarId,bw.avatarId);
 pass('Second player cannot steal an occupied avatar');
 const target=AVATARS.find(x=>!taken.has(x.id));
 const newState=await cmd(a,{t:'avatar',avatarId:target.id},tv,st(s=>s.players.find(p=>p.id==='avA')?.avatarId===target.id));
 assert.equal(new Set(newState.players.map(p=>p.avatarId)).size,3);
 pass('Avatar selection is server-authoritative and broadcast to everyone');
 const reclaim=await cmd(b,{t:'avatar',avatarId:aw.avatarId},tv,st(s=>s.players.find(p=>p.id==='avB')?.avatarId===aw.avatarId));
 assert.equal(reclaim.players.find(p=>p.id==='avB').avatarId,aw.avatarId);
 pass('A released character becomes available immediately');
 await cmd(a,{t:'setup',mode:'x01',options:{start:301},legs:1,bullOff:false,walkons:true},
  tv,st(s=>s.config.walkons===true&&s.config.bullOff===false));
 const intro=await cmd(a,{t:'start'},tv,st(s=>s.phase==='walkon'));
 assert.equal(intro.game.turnPhase,'walkon');
 const show=await wait(tv,0,m=>m.t==='walkonIntro');
 assert.ok(show);
 pass('Match is paused for the opening announcement and walk-on');
 const errFrom=tv.q.filter(m=>m.t==='walkon').length;
 b.send(JSON.stringify({t:'skipWalkons'}));
 await new Promise(r=>setTimeout(r,30));
 assert.equal(tv.q.filter(m=>m.t==='gameStart').length,0,'Non-captain may not skip');
 const first=await wait(tv,0,m=>m.t==='walkon'&&m.index===0);
 assert.equal(first.id,'avA');
 pass('Player walk-ons use the established player order');
 const started=await cmd(a,{t:'skipWalkons'},tv,st(s=>s.phase==='playing'));
 assert.equal(started.game.order.length,3);
 pass('Captain can skip the ceremony and begin the real match');
 await cmd(a,{t:'end'},tv,st(s=>s.phase==='gameOver'));
 await cmd(a,{t:'again',rematch:false},tv,st(s=>s.phase==='lobby'));
 await cmd(a,{t:'setup',mode:'x01',options:{start:301},legs:1,bullOff:false,walkons:false},
  tv,st(s=>s.config.walkons===false));
 const noWalkon=await cmd(a,{t:'start'},tv,st(s=>s.phase==='playing'));
 assert.equal(noWalkon.config.walkons,false);
 assert.equal(noWalkon.game.order.length,3);
 pass('Captain can disable walk-ons for rapid rematches');
 const wrong=await cmd(b,{t:'avatar',avatarId:target.id},b,m=>m.t==='error'&&m.code==='avatarLocked');
 assert.match(wrong.message,/lobby/i);
 pass('Avatars cannot change after the match begins');
 console.log('OCHE AVATAR & WALK-ON QA:',passed,'checks passed');
 for(const w of sockets)if(w.readyState===1)w.close();
 server.close();process.exit(0);
})().catch(e=>{console.error('OCHE AVATAR & WALK-ON QA FAILED',e);for(const w of sockets)try{w.terminate()}catch{}try{server.close()}catch{}process.exit(1)});
