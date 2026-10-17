import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
async function walk(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await walk(root);let links=0,htmls=0;
for(const file of files){
 const text=await fs.readFile(file,'utf8');
 assert(!/(?:\/Users\/|\/Volumes\/|\/private\/|sk-[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{20,})/.test(text),'Private path or credential pattern: '+file);
 if(!file.endsWith('.html'))continue;htmls++;
 for(const match of text.matchAll(/\b(?:href|src)="([^"]*)"/g)){
  const url=new URL(match[1].replaceAll('&amp;','&'),'https://example.test/cooking60/'+path.relative(root,file));
  if(url.origin!=='https://example.test')continue;
  assert(url.pathname.startsWith('/cooking60/'),'Link escapes Pages subpath: '+match[1]);
  let target=path.join(root,decodeURIComponent(url.pathname.slice('/cooking60/'.length)));
  if((await fs.stat(target).catch(()=>null))?.isDirectory())target=path.join(target,'index.html');
  assert((await fs.stat(target).catch(()=>null))?.isFile(),'Broken link in '+file+': '+match[1]);links++;
  if(url.hash){const targetText=await fs.readFile(target,'utf8');assert(targetText.includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),'Missing anchor '+match[1]);}
 }
}
assert.equal(htmls,68);assert(files.some(f=>f.endsWith('/.nojekyll')));
console.log('Public build audit: '+htmls+' HTML pages, '+links+' internal links, no private paths or known credential patterns.');
