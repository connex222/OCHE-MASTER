'use strict';
// Real restart acceptance: sockets get a 1012 notice and expired rooms do not
// leave phone controllers trapped behind an obsolete four-letter code.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const net=require('node:net');
const path=require('node:path');
const {spawn}=require('node:child_process');
const WebSocket=require('ws');
const root=path.resolve(__dirname,'..');
const phone=fs.readFileSync(path.join(root,'public/phone.html'),'utf8');
const tvSource=fs.readFileSync(path.join(root,'public/tv.html'),'utf8');

assert.match(phone,/m\.code === 'noRoom'/,'phone must handle expired rooms even after a successful prior join');
assert.match(phone,/store\.set\('room', ''\)/,'phone must clear old room credentials');
assert.match(phone,/Scan the new QR code on the TV/,'phone must explain the recovery action');
assert.match(tvSource,/case 'serverRestarting'/,'TV must announce platform restarts');

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function choosePort(){
  const l=net.createServer();
  await new Promise((ok,fail)=>{l.once('error',fail);l.listen(0,'127.0.0.1',ok);});
  const port=l.address().port;
  await new Promise(ok=>l.close(ok));
  return port;
}
function launch(port){
  const child=spawn(process.execPath,['server.js'],{
    cwd:root,env:{...process.env,PORT:String(port),OCHE_SPEED:'40'},stdio:['ignore','pipe','pipe']
  });
  let logs='';
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{logs+=String(chunk);});
  return {child,getLogs:()=>logs};
}
async function ready(port,proc){
  for(let tries=0;tries<90;tries++){
    if(proc.child.exitCode!==null)break;
    try{if((await fetch('http://127.0.0.1:'+port+'/health',{signal:AbortSignal.timeout(450)})).ok)return;}catch{}
    await pause(80);
  }
  throw Error('OCHE failed to start: '+proc.getLogs().slice(-900));
}
async function socket(port){
  const ws=new WebSocket('ws://127.0.0.1:'+port);
  await new Promise((ok,fail)=>{ws.once('open',ok);ws.once('error',fail);});
  return ws;
}
function receive(ws,pred,timeout=4500){
  return new Promise((ok,fail)=>{
    const timer=setTimeout(()=>{ws.off('message',on);fail(Error('Timed out waiting for OCHE protocol event'));},timeout);
    function on(raw){let m;try{m=JSON.parse(raw.toString());}catch{return;}
      if(pred(m)){clearTimeout(timer);ws.off('message',on);ok(m);}
    }
    ws.on('message',on);
  });
}
function sendExpect(ws,message,pred){
  const expected=receive(ws,pred);
  ws.send(JSON.stringify(message));
  return expected;
}
async function stopped(proc,signal='SIGTERM'){
  if(proc.child.exitCode!==null)return;
  const result=new Promise((ok,fail)=>{
    const timer=setTimeout(()=>fail(Error('OCHE shutdown timed out: '+proc.getLogs().slice(-700))),7000);
    proc.child.once('exit',(code)=>{clearTimeout(timer);ok(code);});
  });
  proc.child.kill(signal);
  return result;
}
(async()=>{
  const port=await choosePort();
  const first=launch(port);
  let tv,player,second,oldPhone;
  try{
    await ready(port,first);
    tv=await socket(port);
    const hosted=await sendExpect(tv,{t:'host'},m=>m.t==='hosted');
    player=await socket(port);
    await sendExpect(player,{t:'join',code:hosted.code,playerId:'restart-p1',name:'Restart Player'},m=>m.t==='welcome');
    const observe=ws=>Promise.all([
      receive(ws,m=>m.t==='serverRestarting'),
      new Promise((ok,fail)=>{
        const timer=setTimeout(()=>fail(Error('No restart close frame')),5000);
        ws.once('close',code=>{clearTimeout(timer);ok(code);});
      })
    ]);
    const tvRecovery=observe(tv),phoneRecovery=observe(player);
    const firstExit=stopped(first);
    const [[tvMessage,tvClose],[phoneMessage,phoneClose],code]=await Promise.all([tvRecovery,phoneRecovery,firstExit]);
    assert.equal(tvMessage.t,'serverRestarting');
    assert.equal(phoneMessage.t,'serverRestarting');
    assert.equal(tvClose,1012);
    assert.equal(phoneClose,1012);
    assert.equal(code,0,'graceful OCHE shutdown exited with an error: '+first.getLogs().slice(-900));
    console.log('PASS OCHE restart: TV and phone received 1012 and restart notice before graceful exit');

    second=launch(port);
    await ready(port,second);
    oldPhone=await socket(port);
    const expired=await sendExpect(oldPhone,{t:'join',code:hosted.code,playerId:'restart-p1',name:'Restart Player'},
      m=>m.t==='error'&&m.code==='noRoom');
    assert.match(expired.message,/No game with that code/);
    console.log('PASS OCHE restart: old room rejected; phone client contains explicit new QR recovery');
  }finally{
    for(const ws of [tv,player,oldPhone])if(ws)try{ws.terminate();}catch{}
    if(second?.child.exitCode===null)await stopped(second).catch(()=>second.child.kill('SIGKILL'));
    if(first.child.exitCode===null)await stopped(first).catch(()=>first.child.kill('SIGKILL'));
  }
})().catch(error=>{console.error('OCHE RESTART QA FAILED',error);process.exitCode=1;});
