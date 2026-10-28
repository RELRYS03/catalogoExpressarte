import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const pages=['imagem-para-3d.html','visualizador-3d.html','studio-oficina-3d.html','imagem-para-3d-ia.html'];
const folder=await mkdtemp(join(tmpdir(),'expressarte-check-'));
try{
for(const p of pages){
 const html=await readFile(p,'utf8');
 assert.match(html,/<html[^>]*lang="pt-BR"/i,p+' precisa lang pt-BR');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const seen=new Set();for(const id of ids){assert(!seen.has(id),p+' ID duplicado: '+id);seen.add(id)}
 let n=0;
 for(const [,kind,script] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
   if(kind.includes('type="importmap"')){JSON.parse(script);continue}
   if(kind.includes('src='))continue;
   if(!script.trim())continue;
   const f=join(folder,p+'-'+n+++(kind.includes('module')?'.mjs':'.cjs'));
   await writeFile(f,script);
   execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
   for(const [,id] of script.matchAll(/\$\('([^']+)'\)/g)){assert(seen.has(id),p+' referência para ID ausente: '+id)}
 }
 console.log('PASS '+p+' - scripts e IDs verificados');
}
execFileSync(process.execPath,['--check','integrations/freellmapi/rk10-bridge.mjs'],{stdio:'pipe'});
console.log('PASS ponte RK10 - sintaxe Node');
}finally{await rm(folder,{recursive:true,force:true})}
