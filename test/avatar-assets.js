'use strict';
// OCHE Bible 3b asset validation: exact PNGs, canvas dimensions and alpha.
// No external packages: checks the PNG header and the first RGBA scanline.
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const {AVATARS}=require('../lib/avatars');
const dirname=path.join(__dirname,'../public/assets/img/avatars');
function check(file){
 const data=fs.readFileSync(path.join(dirname,file));
 assert.ok(data.byteLength>10000,file+' is suspiciously small');
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a',file+' PNG signature');
 assert.equal(data.toString('ascii',12,16),'IHDR',file+' missing IHDR');
 const w=data.readUInt32BE(16),h=data.readUInt32BE(20);
 assert.equal(w,1024,file+' width');
 assert.equal(h,1536,file+' height');
 assert.equal(data[24],8,file+' expected 8-bit colour');
 assert.equal(data[25],6,file+' must be full-colour RGBA with transparency');
 assert.equal(data[28],0,file+' must not be interlaced');
 let offset=8;const compressed=[];
 while(offset+12<=data.length){
   const n=data.readUInt32BE(offset),type=data.toString('ascii',offset+4,offset+8);
   if(type==='IDAT')compressed.push(data.subarray(offset+8,offset+8+n));
   offset+=12+n;
   if(type==='IEND')break;
 }
 assert.ok(compressed.length>0,file+' missing image data');
 const pixels=zlib.inflateSync(Buffer.concat(compressed));
 const stride=w*4;
 assert.ok(pixels.length>stride);
 const filter=pixels[0],row=Buffer.alloc(stride);
 for(let i=0;i<stride;i++){
  const v=pixels[i+1],left=i>=4?row[i-4]:0;
  row[i]=(v+(filter===1||filter===3?left:filter===4?left:0))&255;
 }
 assert.ok(filter>=0&&filter<=4,file+' invalid filter');
 assert.ok(row[3]<32&&row[stride-1]<32,file+' top corners should be transparent');
}
assert.equal(AVATARS.length,12);
for(const a of AVATARS){check(a.file);console.log('PASS avatar artwork',a.file,'1024x1536 RGBA');}
console.log('OCHE AVATAR ASSETS QA: 12 transparent PNGs passed');
