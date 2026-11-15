'use strict';
// OCHE Bible §3b: complete, unskipped walk-ons must hand control to bull-off
// with the official first throw re-armed. Repeated on a rematch.
const assert=require('node:assert/strict');
const WebSocket=require('ws');
process.env.PORT='3995';
process.env.OCHE_SPEED='40';
const {server}=require('../server');
const {AVATARS}=require('../lib/avatars');
const peers=[];
const connect=()=>new Promise((resolve,reject)=>{
  const w=new WebSocket('ws://127.0.0.1:3995');w.q=[];
  w.on('message',d=>{const m=JSON.parse(String(d));w.q.push(m);w.emit('packet',m);});
  w.once('open',()=>{peers.push(w);resolve(w);});
  w.once('error',reject);
});
const wait=(w,from,pred,timeout=6000)=>{
  const found=w.q.slice(from).find(pred);
  if(found)return Promise.resolve(found);
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{w.off('packet',on);reject(new Error('Complete walk-on QA timed out'));},timeout);
    const on=m=>{if(!pred(m))return;clearTimeout(timer);w.off('packet',on);resolve(m);};
    w.on('packet',on);
  });
};
const sendWait=(who,msg,watcher,pred)=>{const before=watcher.q.length;who.send(JSON.stringify(msg));return wait(watcher,before,pred);};
const state=pred=>m=>m.t==='state'&&pred(m);
const pass=t=>console.log('PASS complete walk-ons:',t);
(async()=>{
  if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  const tv=await connect(),p1=await connect(),p2=await connect(),p3=await connect();
  const hosted=await sendWait(tv,{t:'host'},tv,m=>m.t==='hosted');
  for(const [i,p] of [p1,p2,p3].entries()){
    const v=await sendWait(p,{t:'join',code:hosted.code,name:'Guest '+(i+1),playerId:'g'+(i+1),
      avatarId:AVATARS[i].id},p,m=>m.t==='welcome');
    assert.equal(v.avatarId,AVATARS[i].id);
  }
  await sendWait(p1,{t:'setup',mode:'x01',options:{start:301},legs:1,bullOff:true,walkons:true},
    tv,state(m=>m.config.walkons===true&&m.config.bullOff===true));
  const startIndex=tv.q.length;
  const started=await sendWait(p1,{t:'start'},tv,state(m=>m.phase==='walkon'));
  assert.equal(started.game.currentId,null);
  const intro=await wait(tv,startIndex,m=>m.t==='walkonIntro');
  assert.ok(intro);
  // A smartphone trying to throw during the presentation must be ignored.
  p1.send(JSON.stringify({t:'throw',aim:{x:0,y:0},power:1,stability:0}));
  await new Promise(resolve=>setTimeout(resolve,12));
  assert.equal(tv.q.slice(startIndex).filter(m=>m.t==='dart').length,0);
  pass('Players cannot score while introductions are running');
  const ids=['g1','g2','g3'];
  for(let i=0;i<ids.length;i++){
    const a=await wait(tv,startIndex,m=>m.t==='walkon'&&m.index===i);
    assert.equal(a.id,ids[i]);
    assert.equal(a.total,3);
    assert.ok(a.duration>=80 && a.duration<=120,'Each card lasts approximately four seconds at normal speed');
  }
  const observed=tv.q.slice(startIndex).filter(m=>m.t==='walkon');
  assert.deepEqual(observed.map(m=>m.id),ids);
  pass('Every member gets one full-length presentation in the correct order');
  const gameStarted=await wait(tv,startIndex,m=>m.t==='gameStart');
  assert.ok(gameStarted);
  const bull=await wait(tv,startIndex,state(m=>m.phase==='bulloff'&&m.game.turnPhase==='aim'));
  assert.equal(bull.game.currentId,'g1');
  assert.equal(bull.game.walkonIndex,-1);
  pass('Full ceremony ends automatically in a playable bull-off');
  const first=await sendWait(p1,{t:'throw',aim:{x:0,y:0},power:1,stability:0,input:'swipe'},
    tv,m=>m.t==='dart'&&m.id==='g1'&&m.bulloff);
  assert.equal(first.dart.label.startsWith('MISS'),false);
  pass('First official dart is accepted immediately after the ceremony');
  const over=await sendWait(p1,{t:'end'},tv,state(m=>m.phase==='gameOver'));
  assert.equal(over.phase,'gameOver');
  const repeatStart=tv.q.length;
  await sendWait(p1,{t:'again',rematch:true},tv,state(m=>m.phase==='walkon'));
  const again=await wait(tv,repeatStart,m=>m.t==='walkonIntro');
  assert.ok(again);
  await sendWait(p1,{t:'skipWalkons'},tv,state(m=>m.phase==='bulloff'&&m.game.turnPhase==='aim'));
  const repeated=tv.q.slice(repeatStart).filter(m=>m.t==='gameStart');
  assert.equal(repeated.length,1);
  pass('Rematches replay introductions and captain skipping starts the match once');
  console.log('OCHE COMPLETE WALK-ON QA: 5 checks passed');
  for(const w of peers)if(w.readyState===WebSocket.OPEN)w.close();
  server.close();process.exit(0);
})().catch(e=>{console.error('OCHE COMPLETE WALK-ON QA FAILED:',e);
  for(const w of peers)try{w.terminate();}catch{}
  try{server.close();}catch{}
  process.exit(1);
});