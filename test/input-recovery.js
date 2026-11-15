'use strict';
// Browser-independent real regression tests for interrupted throwing and
// three-sample calibration. Run in Render's Docker build before deployment.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../public/phone.html'),'utf8');
const slice=(start,end)=>{const a=html.indexOf(start),b=html.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'Missing block '+start);return html.slice(a,b)};
let checks=0;function pass(label){checks++;console.log('PASS input:',label)}

// Phase transitions must call the interruption handler before hiding the
// calibration sheet. Previously the UI was hidden before the mode was closed.
let active=true;const steps=[];
const phaseContext=vm.createContext({
  S:{phase:'lobby',players:[{id:'p1',colour:'#eee'}]},
  me:{id:'p1'},avatars:[],awaiting:false,
  Motion:{calibrating:true},Swipe:{calibrating:false},
  resetInputOnInterruption(){steps.push('reset');phaseContext.Motion.calibrating=false;active=false},
  document:{
    querySelectorAll(){return [{classList:{remove(){steps.push('hide');}}}]},
    documentElement:{style:{setProperty(){}}}
  },
  clearAwait(){steps.push('clear-await')},
  route(){steps.push('route')},
  store:{set(){}},
  $(){return {classList:{contains(){return active}}}}
});
vm.runInContext(slice('function onState(m) {','\nfunction clearAwait()'),phaseContext,{timeout:1000});
const state=vm.runInContext('onState',phaseContext);
state({phase:'playing',players:[{id:'p1',colour:'#eee'}],game:{currentId:'p1',turnPhase:'aim'}});
assert.equal(phaseContext.Motion.calibrating,false);
assert.deepEqual(steps,['reset','hide','clear-await','route']);
pass('Round changes exit calibration before concealing the sheet');

// Actual interruption handler must drop both gesture captures and close
// calibration even if its element was already hidden by a browser transition.
let sequence=[];
const interruptionContext=vm.createContext({
  Motion:{calibrating:true,abort(){sequence.push('abort motion')}},
  Swipe:{calibrating:false,cancelGesture(){sequence.push('cancel swipe')}},
  Calib:{close(){sequence.push('close calibration')}},
  padUp(){sequence.push('release grip')},
  $(){return {classList:{contains(){return false}}}}
});
vm.runInContext(slice('function resetInputOnInterruption() {',"document.addEventListener('visibilitychange'"),interruptionContext,{timeout:1000});
const interrupt=vm.runInContext('resetInputOnInterruption',interruptionContext);
interrupt();
assert.deepEqual(sequence,['close calibration','release grip','abort motion','cancel swipe']);
pass('Disconnect/background reliably clears calibration and held darts');

// The calibration engine must only retain the first three valid throws even
// if extra sensor samples arrive during its delayed success banner.
const values=[],ticks=[0,1,2].map(()=>({classList:{toggle(){}}}));
const classes={on:true};
const calib={classList:{contains(c){return c==='on'&&classes.on},add(){classes.on=true},remove(){classes.on=false}},querySelectorAll:()=>ticks};
const calibPad={classList:{remove(){}},hasPointerCapture(){return false}};
const feedback={textContent:''};let scheduled=0,queued=[];
const calibContext=vm.createContext({
  $:id=>id==='calib'?calib:id==='calibPad'?calibPad:id==='calibFeedback'?feedback:({addEventListener(){}}),
  Motion:{calibrating:false,reset() {},grip() {}},
  Swipe:{calibrating:true},control:'swipe',
  store:{set:(k,v)=>values.push([k,v])},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  buzz(){},setTimeout(fn){scheduled++;queued.push(fn);return scheduled},clearTimeout(){},
  document:{querySelectorAll(){return []}},
  performance:{now(){return 1000}}
});
vm.runInContext(slice('const Calib = (() => {',"\n$('calibBtn').addEventListener"),calibContext,{timeout:1000});
const record=vm.runInContext('Calib.record',calibContext);
record(NaN);record(Infinity);record(-1);
assert.equal(values.length,0);
record(1.4);record(2.1);record(2.6);record(24);
assert.equal(values.length,1);
assert.equal(values[0][0],'ideal.swipe');
assert.equal(values[0][1],2.1);
assert.equal(scheduled,1);
pass('Calibration ignores invalid and fourth samples; saves three-throw median');
vm.runInContext('Calib.close()',calibContext);
record(3.5);
assert.equal(values.length,1);
assert.equal(calibContext.Swipe.calibrating,false);
pass('Closing calibration prevents hidden sensor samples recording again');

// A WebSocket being open is not the same as a successful rejoin to a game.
// No throw is accepted before the server sends welcome on that socket.
const gate=vm.createContext({
  linkReady:false,ws:{readyState:1},
  WebSocket:{OPEN:1},
  S:{game:{turnPhase:'aim'}},awaiting:false,
  isMyTurn:()=>true
});
vm.runInContext(slice('function canThrow() {','\nfunction isCaptain()'),gate,{timeout:1000});
const canThrow=vm.runInContext('canThrow',gate);
assert.equal(canThrow(),false);
gate.linkReady=true;assert.equal(canThrow(),true);
gate.ws.readyState=3;assert.equal(canThrow(),false);
pass('Throws remain blocked until rejoin welcome and connected socket');
assert.match(html,/swPointerId !== null \|\| e\.isPrimary === false/);
assert.match(html,/e\.pointerId !== swPointerId/);
assert.match(html,/api\.cancelGesture = cancelGesture/);
assert.match(html,/window\.addEventListener\('pagehide', resetInputOnInterruption\)/);
pass('Swipe calibration captures only its own primary finger and handles pagehide');
console.log('OCHE INPUT RECOVERY QA: '+checks+' checks passed');
