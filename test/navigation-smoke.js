'use strict';
// Games-night navigation regression: leaving, moving rooms and reclaiming seats.
// Uses real WebSockets and the unchanged game rules. Runs in Render's Docker build.
const assert = require('node:assert/strict');
const WS = require('ws');
process.env.PORT = '3997';
process.env.OCHE_SPEED = '40';
const {server} = require('../server');
const all = [];
const connect = () => new Promise((resolve, reject) => {
  const ws = new WS('ws://127.0.0.1:3997');
  ws.q = [];
  ws.on('message', data => { const m = JSON.parse(String(data)); ws.q.push(m); ws.emit('packet', m); });
  ws.once('open', () => { all.push(ws); resolve(ws); });
  ws.once('error', reject);
});
const waitFrom = (ws, n, pred, ms=4000) => {
  const already = ws.q.slice(n).find(pred);
  if (already) return Promise.resolve(already);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.off('packet', on); reject(new Error('OCHE navigation test timed out')); }, ms);
    const on = m => { if (!pred(m)) return; clearTimeout(timer); ws.off('packet', on); resolve(m); };
    ws.on('packet', on);
  });
};
const sendWait = (sender, msg, watcher, pred) => {
  const n=watcher.q.length; sender.send(JSON.stringify(msg)); return waitFrom(watcher,n,pred);
};
const state = (code, test) => m => m.t === 'state' && m.code === code && test(m);
(async () => {
  if (!server.listening) await new Promise(resolve => server.once('listening',resolve));
  const tvA=await connect(), tvB=await connect();
  const hostedA=await sendWait(tvA,{t:'host'},tvA,m=>m.t==='hosted');
  const a=hostedA.code, hostKey=hostedA.hostKey;
  const b=(await sendWait(tvB,{t:'host'},tvB,m=>m.t==='hosted')).code;
  assert.notEqual(a,b);
  const p1=await connect(), p2=await connect(), p3=await connect();
  for(const [p,id] of [[p1,'p1'],[p2,'p2'],[p3,'p3']])
    await sendWait(p,{t:'join',code:a,playerId:id,name:id},p,m=>m.t==='welcome');
  const gotA=await waitFrom(tvA,0,state(a,m=>m.players.length===3));
  assert.equal(gotA.captainId,'p1');

  const leaveALobby=await sendWait(p1,{t:'leave'},tvA,state(a,m=>m.players.length===2 && m.captainId==='p2'));
  assert.equal(leaveALobby.players.some(p=>p.id==='p1'),false);
  await sendWait(p1,{t:'join',code:b,playerId:'p1',name:'p1'},p1,m=>m.t==='welcome'&&m.code===b);
  console.log('PASS navigation: lobby departure removes seat and joining another room works');

  // Default OCHE matches include a bull-off; turn it off explicitly for this navigation test.
  await sendWait(p2,{t:'setup',mode:'x01',options:{start:301},legs:1,bullOff:false},
    tvA,state(a,m=>m.phase==='lobby'&&m.config.mode==='x01'&&m.config.bullOff===false));
  const started=await sendWait(p2,{t:'start'},tvA,state(a,m=>m.phase==='playing'&&m.game.turnPhase==='aim'));
  assert.equal(started.game.order.length,2);
  const left=await sendWait(p2,{t:'leave'},tvA,state(a,m=>m.phase==='playing' && m.players.some(p=>p.id==='p2'&&!p.online)));
  assert.equal(left.captainId,'p3');
  assert.equal(left.game.order.length,2,'A mid-match departure must not rewrite turn order');
  console.log('PASS navigation: mid-match departure preserves match and transfers captain');

  // After leaving A, this same socket must not be authorised to throw in A.
  const count=tvA.q.filter(m=>m.t==='dart').length;
  p2.send(JSON.stringify({t:'throw',aim:{x:0,y:103},power:1,stability:0}));
  await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(tvA.q.filter(m=>m.t==='dart').length,count);
  await sendWait(p2,{t:'join',code:b,playerId:'p2',name:'p2'},p2,m=>m.t==='welcome' && m.code===b);
  const inB=await waitFrom(tvB,0,state(b,m=>m.players.length===2));
  assert.ok(inB.players.some(p=>p.id==='p2'));
  console.log('PASS navigation: an old socket cannot score for its previous room');

  const p2Index=p2.q.length;
  await sendWait(p3,{t:'skip'},tvA,m=>m.t==='visit'&&m.id==='p2');
  await new Promise(resolve=>setTimeout(resolve,60));
  assert.equal(p2.q.slice(p2Index).filter(m=>m.t==='state'&&m.code===a).length,0,'Old-room updates leaked to another room');
  console.log('PASS navigation: changing rooms stops cross-room state broadcasts');

  await sendWait(p2,{t:'leave'},tvB,state(b,m=>m.players.length===1));
  const restoredFrom=tvA.q.length;
  await sendWait(p2,{t:'join',code:a,playerId:'p2',name:'p2'},p2,m=>m.t==='welcome'&&m.code===a);
  const again=await waitFrom(tvA,restoredFrom,state(a,m=>m.phase==='playing' && m.players.some(p=>p.id==='p2'&&p.online)));
  assert.equal(again.players.length,2);
  assert.equal(again.game.order.length,2);
  console.log('PASS navigation: a player can reclaim an offline seat during a match');

  // Only the captain or the TV with its private host key may reset the room.
  let startCount=tvA.q.length;
  p2.send(JSON.stringify({t:'returnLobby'})); // p2 is not captain.
  await new Promise(resolve=>setTimeout(resolve,65));
  assert.equal(tvA.q.slice(startCount).filter(m=>m.t==='state'&&m.phase==='lobby').length,0,
    'Guest phone was allowed to interrupt the match');
  startCount=tvA.q.length;
  tvA.send(JSON.stringify({t:'returnLobby',hostKey:'wrong-key'}));
  await new Promise(resolve=>setTimeout(resolve,65));
  assert.equal(tvA.q.slice(startCount).filter(m=>m.t==='state'&&m.phase==='lobby').length,0,
    'TV return-to-lobby accepted an invalid host key');
  const back=await sendWait(p3,{t:'returnLobby'},tvA,state(a,m=>m.phase==='lobby'&&!m.game));
  assert.equal(back.players.length,2,'Captained lobby return removed connected players');
  console.log('PASS navigation: only captain can return all connected players to lobby');
  await sendWait(p3,{t:'start'},tvA,state(a,m=>m.phase==='playing'));
  const backByTV=await sendWait(tvA,{t:'returnLobby',hostKey},tvA,state(a,m=>m.phase==='lobby'&&!m.game));
  assert.equal(backByTV.players.length,2,'TV return-to-lobby did not preserve connected players');
  console.log('PASS navigation: authorised TV Back to Lobby resets match without dropping players');
  console.log('OCHE NAVIGATION WEBSOCKET QA: 7 checks passed');
  for(const ws of all) if(ws.readyState===WS.OPEN) ws.close();
  server.close();process.exit(0);
})().catch(e=>{console.error('OCHE NAVIGATION QA FAILED',e);for(const ws of all)try{ws.terminate();}catch{} try{server.close()}catch{}process.exit(1)});
