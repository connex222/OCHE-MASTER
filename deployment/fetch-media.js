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
  'walkon_sting.mp3':'283c2e74-4983-4b87-9d8a-edaed7f1834f.mp3',
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
  'killer.mp3':'3b93f748-1a2c-4799-9f77-661a033b613a.mp3',
  'letsplay.mp3':'a9068ef7-f53b-40e1-a966-780fe8d500c6.mp3',
  'walkon_big_kev.mp3':'61683486-8c45-455a-86f2-ce68f93de160.mp3',
  'walkon_bounce_out_barry.mp3':'049dac90-41d2-467c-8d73-09f4e1c495d3.mp3',
  'walkon_double_trouble.mp3':'27ce5a87-1706-45f0-b6e0-6fa7748b9917.mp3',
  'walkon_the_mullet.mp3':'00dac7b0-a458-4512-aaa4-11dffd1a286f.mp3',
  'walkon_wobbly_wayne.mp3':'5e45d6a7-f84e-4b36-b110-d8232cda4aa7.mp3',
  'walkon_sir_arrows.mp3':'f10c6207-6625-4295-8b43-a427bf2707f1.mp3',
  'walkon_the_gladiator.mp3':'cf6522b8-b53f-4129-b322-e4d1275c3e03.mp3',
  'walkon_nigel_bust.mp3':'bfe63ce4-bc69-4b4b-b761-e3c3cfec15f5.mp3',
  'walkon_the_shark.mp3':'49694a7c-0b9e-485b-814b-39d82237a023.mp3',
  'walkon_bullseye_brenda.mp3':'7b2db7f4-1b7c-4903-9fd3-782e16a80634.mp3',
  'walkon_treble_tap_tina.mp3':'84816537-c8ce-445b-8577-c483ee55b57f.mp3',
  'walkon_dinner_lady.mp3':'bf170e48-0bef-42a9-8377-66a51df1da43.mp3',
  // OCHE number pack 1: Creative Claw ElevenLabs v4, matching the existing walk-on caller.
  '12.mp3':'11c392d1-f71f-40f2-ba36-00505401c066.mp3',
  '18.mp3':'67ce448a-06c2-458f-8db2-28fdff735a9b.mp3',
  '20.mp3':'087b8822-554c-4c8f-bb87-fc3c4574ff07.mp3',
  '24.mp3':'f8a9ed71-4f6e-46e1-bbef-0b68abc389d8.mp3',
  '26.mp3':'6c616a19-89d9-494c-a470-9ff1e0edb687.mp3',
  '32.mp3':'e9cc4dd1-7613-4dd7-a58a-37403ecba32c.mp3',
  '36.mp3':'35d9772d-03ec-4b8c-a85d-d240c19c8f0e.mp3',
  '40.mp3':'83725212-9187-45dd-8370-5bf2887326f4.mp3',
  '45.mp3':'2f573f86-d195-4373-a270-c3d51c93bdcd.mp3',
  '50.mp3':'b99e5ce9-a119-46b6-88c1-5e08b0039098.mp3',
  '57.mp3':'01cda730-b2f6-47b4-8fd5-e66b41ea739a.mp3',
  '60.mp3':'192a94a2-434e-40f8-b33a-2bc650f8e1e8.mp3',
  '80.mp3':'e22be09f-9b3c-4558-9dff-ea96d75bf73b.mp3',
  '81.mp3':'04038276-abf8-4ad6-937e-c988b4a4e825.mp3',
  '85.mp3':'3182dc49-a2b4-4e25-8522-ce60af3c5933.mp3',
  '95.mp3':'7df7303e-cda7-4948-b315-5c7f54876012.mp3',
  '100.mp3':'e30970d5-7936-49a5-b8e6-0e8ae344bf34.mp3',
  '120.mp3':'1488d86b-e354-4945-8425-90eb1178dc6e.mp3',
  '121.mp3':'e8b04b91-02c9-4bf7-b38c-a6bac50ca913.mp3',
  '125.mp3':'4f6d74f1-154e-43ff-b8b9-8f1494de9d08.mp3',
  '140.mp3':'df25429c-8281-4a8e-96b5-0808d24199a3.mp3',
  '150.mp3':'cece8fd2-2e04-475f-82f3-38bf6b1071bd.mp3',
  '160.mp3':'a54f0e5e-7e50-4248-bad7-30a088746c7c.mp3',
  '170.mp3':'fd7e5b38-53f7-4d39-8e83-35ca5718897a.mp3'
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
