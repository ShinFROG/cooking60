import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=path.resolve('dist');
async function walk(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await walk(root);let links=0,htmls=0;
for(const file of files){
 const text=await fs.readFile(file,'utf8');
 assert(!/(?:\/Users\/|\/Volumes\/|\/private\/|sk-[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,})/.test(text),'Private path or credential pattern: '+file);
 if(!file.endsWith('.html'))continue;htmls++;
 const references=[...text.matchAll(/\b(?:href|src)="([^"]*)"/g)].map(match=>match[1]);
 for(const match of text.matchAll(/\bsrcset="([^"]*)"/g))for(const candidate of match[1].split(','))references.push(candidate.trim().split(/\s+/)[0]);
 for(const reference of references){
  const url=new URL(reference.replaceAll('&amp;','&'),'https://example.test/cooking60/'+path.relative(root,file));
  if(url.origin!=='https://example.test')continue;
  assert(url.pathname.startsWith('/cooking60/'),'Link escapes Pages subpath: '+reference);
  let target=path.join(root,decodeURIComponent(url.pathname.slice('/cooking60/'.length)));
  if((await fs.stat(target).catch(()=>null))?.isDirectory())target=path.join(target,'index.html');
  assert((await fs.stat(target).catch(()=>null))?.isFile(),'Broken link in '+file+': '+reference);links++;
  if(url.hash){const targetText=await fs.readFile(target,'utf8');assert(targetText.includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),'Missing anchor '+reference);}
 }
}
assert.equal(htmls,68);assert(files.some(f=>f.endsWith('/.nojekyll')));
const imageDir=path.join(root,'assets/recipes');
const manifest=JSON.parse(await fs.readFile(path.join(imageDir,'manifest.json'),'utf8'));
const recipes=JSON.parse(await fs.readFile(path.join(root,'assets/data.json'),'utf8')).recipes;
assert.deepEqual(manifest.images.map(image=>image.recipeId).sort(),recipes.map(recipe=>recipe.id).sort(),'Every recipe has one generated-image record.');
const hashes=new Set();let imageBytes=0;
for(const image of manifest.images){
 assert(image.prompt&&image.visualReview,'Image prompt and review are required: '+image.recipeId);
 assert.equal(image.files.length,2);
 for(const [index,width,height,suffix] of [[0,960,640,''],[1,480,320,'-480']]){
  const item=image.files[index];
  assert.equal(item.file,image.recipeId+suffix+'.webp');
  assert.equal(item.width,width);assert.equal(item.height,height);
  const bytes=await fs.readFile(path.join(imageDir,item.file));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.length,item.bytes);assert.ok(bytes.length<240000,'Keep image payload small: '+item.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,'Image matches reviewed output: '+item.file);
  assert.ok(!hashes.has(item.sha256),'Each dish needs its own image: '+item.file);hashes.add(item.sha256);imageBytes+=bytes.length;
 }
}
console.log('Public build audit: '+htmls+' HTML pages, '+links+' internal links, '+hashes.size+' image files ('+imageBytes+' bytes), no private paths or known credential patterns.');
