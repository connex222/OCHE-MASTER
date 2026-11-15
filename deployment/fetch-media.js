/* OCHE deployment-only media acquisition. Does not alter game source code.
 * The asset URLs are the approved Creative Claw outputs documented in the media manifest.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public/assets');
const cdn = 'https://cdn.creativeclaw.co/u/f3e7a3b1/audio/';
const sfx = {
  'throw_whoosh.mp3':'11c2c0dc-9979-438e-b252-31f82823d7c3.mp3',
  'impact_board_1.mp3':'4e86fa3e-cbe0-4990-a001-87fb8acd6acf.mp3',
  'impact_board_2.mp3':'057c62b3-1c31-42e6-8d2a-2c8dcb9e19d5.mp3',
  'impact_board_3.mp3':'dbf585c9-aa68-475a-bc92-291648c36a8c.mp3',
  'impact_wire.mp3':'6458638a-81d3-4a9a-8fcf-8a778b771520.mp3',
  'impact_wall.mp3':'f0796e6c-dfcb-4e39-9e90-0d8bdf3874cf.mp3',
  'dart_fall.mp3':'4d83a0c8-4357-440b-8640-44284c327ae1.mp3',
  'darts_collect.mp3':'89d4a11e-3df2-43f5-adae-003afcd40e10.mp3',
  'bull_sting.mp3':'a5f2ee82-76ff-46b2-8794-8c75d2aea2d6.mp3',
  'crowd_cheer.mp3':'5bd4e396-f860-43fa-b42a-af3c82910f9a.mp3',
  'crowd_roar.mp3':'29172eb1-9305-4d62-8317-669f86e79abc.mp3',
  'crowd_groan.mp3':'ba28617b-34d2-437d-9bdd-48eb2e44d729.mp3',
  'crowd_applause.mp3':'3a0c5b8d-2ee0-4a43-8639-0a4bcfdd5f50.mp3',
  'ui_join.mp3':'18e043aa-f1f4-4aca-829f-691c102d06f8.mp3',
  'ui_turn.mp3':'aef3134f-393e-4bb9-96ed-3163d1062e87.mp3',
  'sting_win.mp3':'9ab46721-a45d-4eed-8f37-bb7a12f0fba0.mp3',
  'ambience_pub.mp3':'d39feb0e-057f-4bbe-9bdd-8155b5ef8f31.mp3',
  'music_lobby.mp3':'f6c467b9-b7be-4b66-a690-5c95e63aec1d.mp3'
};
const caller = {
  '180.mp3':'3ac9433c-e570-4777-83be-a837e445c085.mp3',
  'gameon.mp3':'f4e890b0-1429-44ed-990b-9912a7bc3d33.mp3',
  'gameshot_leg.mp3':'190b3750-4393-4caa-a49e-cd7f11badfc4.mp3',
  'gameshot_match.mp3':'d21f9edb-8ff1-4a0b-bfc2-1aaa954c5709.mp3',
  '0.mp3':'85c2ea07-5a28-4172-aaeb-48e1f96b1f21.mp3',
  'bust.mp3':'fdfeaa8b-8687-40c7-93f5-991d8059e827.mp3',
  'killer.mp3':'3b93f748-1a2c-4799-9f77-661a033b613a.mp3'
};
async function get(url, tries=3, headers={}) {
  for (let n=0;n<tries;n++) {
    try {
      const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),30000);
      let resp;
      try { resp=await fetch(url,{headers, signal:ctl.signal, redirect:'follow'}); } finally {clearTimeout(timer)}
      if(!resp.ok) throw new Error('HTTP '+resp.status+' for '+url);
      return {data:Buffer.from(await resp.arrayBuffer()),headers:resp.headers};
    } catch(err) {if (n===tries-1)throw err; await new Promise(r=>setTimeout(r,800*(n+1)));}
  }
}
async function saveAsset(dest,url,magic) {
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(fs.existsSync(dest)) {
    const b=fs.readFileSync(dest);
    if(b.length>500 && (!magic || b.subarray(0,4).toString()===magic)) return;
  }
  const {data}=await get(url);
  if (data.length<500) throw new Error('Asset too small: '+dest);
  if (magic && data.subarray(0,4).toString()!==magic) throw new Error('Bad format '+dest);
  fs.writeFileSync(dest+'.tmp',data);fs.renameSync(dest+'.tmp',dest);
  console.log('Saved',path.relative(root,dest),data.length,'bytes');
}
async function font(family,weight,file) {
  const css='https://fonts.googleapis.com/css2?family='+encodeURIComponent(family)+':wght@'+weight+'&display=swap';
  const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36';
  const {data}=await get(css,3,{'User-Agent':ua});
  const blocks=String(data).match(/@font-face\s*\{[^}]+\}/gs)||[];
  const latin=blocks.find(b=>b.includes('U+0000-00FF'))||blocks.at(-1);
  if(!latin)throw new Error('Font CSS missing: '+family);
  const match=latin.match(/url\((https:\/\/[^)]+)\)/);
  if(!match)throw new Error('Font URL missing: '+family);
  await saveAsset(path.join(root,'fonts',file),match[1],'wOF2');
}
async function main(){
  const entries=[...Object.entries(sfx).map(([k,v])=>['sfx/'+k,cdn+v]),
                 ...Object.entries(caller).map(([k,v])=>['sfx/caller/'+k,cdn+v])];
  // Keep workload modest to avoid rate limits and fail hard rather than shipping placeholder media.
  for(let i=0;i<entries.length;i+=4)await Promise.all(entries.slice(i,i+4).map(([k,u])=>saveAsset(path.join(root,k),u)));
  await font('Oswald',700,'display.woff2');
  await font('Cabin Sketch',400,'chalk.woff2');
  console.log('OCHE production media present:',entries.length,'audio clips, 2 fonts');
}
main().catch(e=>{console.error(e);process.exitCode=1});
