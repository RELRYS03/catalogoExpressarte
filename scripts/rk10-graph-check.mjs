#!/usr/bin/env node
// RK10 prerequisite: inspect an actual, freshly generated Graphify graph before code changes.
import {readFileSync,statSync} from 'node:fs';
const source=process.argv[2]||'graphify-out/graph.json';
const changed=process.argv.slice(3);
if(!changed.length){
 console.error('Uso: node scripts/rk10-graph-check.mjs graphify-out/graph.json arquivo1 [arquivo2 ...]');
 process.exit(2);
}
let raw,graph;
try{
 raw=readFileSync(source,'utf8');
 graph=JSON.parse(raw);
 if(!graph||typeof graph!=='object'||Array.isArray(graph))throw Error('Formato invalido');
}catch(e){
 console.error('BLOQUEADO: graphify-out/graph.json inexistente ou invalido. Execute Graphify antes de alterar codigo: '+e.message);
 process.exit(1);
}
const age=Date.now()-statSync(source).mtimeMs;
if(age>24*60*60*1000){console.error('BLOQUEADO: mapa Graphify tem mais de 24 h; regenere-o.');process.exit(1)}
const serialized=raw.toLowerCase().replaceAll('\\','/');
let found=0;
for(const file of changed){
 const normalized=file.toLowerCase().replaceAll('\\','/');
 const basename=normalized.split('/').pop();
 if(serialized.includes(normalized)||serialized.includes(basename)){
   console.log('MAPEADO: '+file);found++;
 } else {
   console.error('SEM COBERTURA: '+file+' - revisar inclusao (ex.: JS embutido em HTML) e dependencias manualmente');
 }
}
if(found!==changed.length){process.exit(1)}
console.log('RK10: grafo presente e atualizado. Esta checagem NAO substitui analise de impacto, QA ou revisao humana.');
