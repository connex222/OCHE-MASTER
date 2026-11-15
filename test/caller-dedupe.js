'use strict';
// OCHE caller regression: do not announce one visit twice, let recorded scores
// finish before naming the next player, and silence TV tabs replaced by the host.
// Deterministic, browser-independent and runs in the Render Docker build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../public/tv.html'), 'utf8');
const portion = (from, to) => {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a);
  assert.ok(a >= 0 && b > a, 'Missing source region '+from);
  return html.slice(a, b);
};
const check = (desc, cb) => { cb(); console.log('PASS caller:', desc); };

(async () => {
  // One recorded 100 must not also invoke the browser's second voice.
  const played = [], spoken = [], stopped = [];
  const speech = {
    speaking:false,pending:false, onvoiceschanged:null,
    getVoices:()=>[],
    cancel(){this.speaking=false;this.pending=false},
    speak(u){spoken.push(u.text);this.speaking=true}
  };
  const buffer = {duration:1.5};
  const sound = {
    muted:false,ready:true,
    loadOptional:async p => p === 'caller/missing' ? null : buffer,
    playBuffer(b){assert.equal(b,buffer);played.push('recorded');return {s:{stop(){stopped.push('clip')},onended:null}} },
    playSegment(b,start,end){assert.equal(b,buffer);played.push('segment:'+start+':'+end);return {s:{stop(){stopped.push('segment')},onended:null}}},
    duckVoice(){},unduckVoice(){}
  };
  const callerContext = vm.createContext({
    Sound:sound,window:{speechSynthesis:speech,OCHE_NUMBER_CUES:{'47':['numberpack_40_69',0.1,1.3]}},
    speechSynthesis:speech,SpeechSynthesisUtterance:class {constructor(text){this.text=text}}
  });
  vm.runInContext(portion('const Caller = (() => {','\nconst ONES ='),callerContext,{timeout:1000});
  const caller = vm.runInContext('Caller',callerContext);
  await caller.say('100','one hundred');
  check('Recorded 100 uses one file, never browser voice',()=>{
    assert.deepEqual(played,['recorded']);assert.deepEqual(spoken,[]);assert.equal(caller.isBusy(),true);
  });
  await caller.say('47','forty-seven');
  check('Other recorded scores take only the correct segment',()=>{
    assert.deepEqual(played,['recorded','segment:0.1:1.3']);
    assert.ok(stopped.includes('clip'),'Prior score must stop when replaced');
    assert.deepEqual(spoken,[]);
  });
  await caller.say('missing','No recording available');
  check('Missing recording has one browser fallback, not two',()=>{
    assert.equal(spoken.length,1);assert.equal(spoken[0],'No recording available');
    assert.equal(played.length,2);assert.equal(caller.isBusy(),true);
  });
  caller.cancel();
  check('Caller cancellation stops pending speech and any recorded clip',()=>{
    assert.equal(speech.speaking,false);assert.equal(caller.isBusy(),false);
  });

  // The same visit packet must not cause two announcements. A legitimate
  // later visit from the same player is allowed.
  let clock=1000; const called=[], collected=[];
  const visitContext=vm.createContext({
    performance:{now:()=>clock},
    Sound:{play:(name)=>collected.push(name)},
    Caller:{say:(key,text)=>called.push([key,text])},
    callout:()=>{},words:n=>String(n)
  });
  const visitCode = 'let lastVisit = null, recentVisitAnnouncement = null, recentScoreCall = null;\n'
    +portion('function onVisit(m) {','\nfunction onLegEnd(m) {');
  vm.runInContext(visitCode,visitContext,{timeout:1000});
  const visit=vm.runInContext('onVisit',visitContext);
  const oneHundred={id:'p1',total:100,bust:false,call:true};
  visit(oneHundred);visit(oneHundred);
  check('Rapid replay of the same 100 visit is silent',()=>{
    assert.equal(called.length,1);
    assert.equal(called[0][0],'100');
    assert.equal(collected.filter(n=>n==='darts_collect').length,1);
  });
  clock=6000;visit(oneHundred);
  check('A genuinely later 100 visit is announced normally',()=>assert.equal(called.length,2));

  // Check the actual event handler: two voice types should not both say 100
  // when a player scores 100 and the next player happens to require 100.
  const queueCalls=[],muted=[],canceled=[];
  let eventTime=5000;
  const events=vm.createContext({
    Sound:{play:()=>{},setMuted:(v)=>muted.push(v)},
    Caller:{cancel:()=>canceled.push(true)},
    performance:{now:()=>eventTime},
    player:()=>({name:'Alice'}),words:n=>n===100?'one hundred':'one hundred and twenty',
    clearTimeout:()=>{},
    queueTurnAnnouncement:(id,line,delay)=>queueCalls.push([id,line,delay]),
    document:{body:{innerHTML:''}}
  });
  vm.runInContext('let scheduledTurnCall = null, gameOnVoiceUntil = 0, replaced = false, recentScoreCall = {score:100,at:2000};\n'
    +portion('function onMessage(m) {','\nfunction onState(m) {'),events,{timeout:1000});
  const onMessage=vm.runInContext('onMessage',events);
  onMessage({t:'turn',id:'alice',require:100});
  check('A just-announced 100 is not immediately repeated by the next player prompt',()=>{
    assert.equal(queueCalls.length,1);
    assert.equal(queueCalls[0][1],'Alice, your turn');
  });
  onMessage({t:'turn',id:'alice',require:120});
  check('Unrelated checkout requirements keep their Bible announcement',()=>{
    assert.equal(queueCalls[1][1],'Alice, you require one hundred and twenty');
  });
  onMessage({t:'replaced'});
  check('Old TV tab is immediately silenced when another screen takes over',()=>{
    assert.deepEqual(muted,[true]);assert.equal(canceled.length,1);
  });

  // A queued announcement waits for a score call to finish, or disappears if
  // the player throws during the wait.
  let now=1000,busy=true;let nextTimer=0;
  const timers=new Map(), reminders=[];
  const queueCtx=vm.createContext({
    S:{phase:'playing',game:{currentId:'alice',turnPhase:'aim',darts:[]}},
    Caller:{isBusy:()=>busy,say:(k,text)=>reminders.push([k,text])},
    performance:{now:()=>now},
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},
    clearTimeout:id=>{timers.delete(id)}
  });
  vm.runInContext('let scheduledTurnCall = null;\n'
    +portion('function queueTurnAnnouncement(', '\nlet host = null;'),queueCtx,{timeout:1000});
  const schedule=vm.runInContext('queueTurnAnnouncement',queueCtx);
  const fireNext=()=>{
    const [id,timer]=timers.entries().next().value;
    timers.delete(id);now+=timer.ms;timer.fn();
  };
  schedule('alice','Alice, you require one hundred',350);
  fireNext();assert.equal(reminders.length,0);assert.equal(timers.size,1);
  busy=false;fireNext();
  check('Turn reminders wait for recorded score to finish',()=>{
    assert.equal(reminders.length,1);assert.equal(reminders[0][1],'Alice, you require one hundred');
  });
  schedule('alice','Alice, your turn',350);
  queueCtx.S.game.darts.push({score:20});
  fireNext();
  check('A reminder never speaks after a dart has been thrown',()=>{
    assert.equal(reminders.length,1);
  });

  console.log('OCHE CALLER DUPLICATION QA: 11 checks passed');
})().catch(e=>{console.error('OCHE CALLER DUPLICATION QA FAILED',e);process.exitCode=1});
