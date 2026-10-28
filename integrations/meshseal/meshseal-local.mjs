#!/usr/bin/env node
/**
 * Express'Arte local Meshseal bridge.
 * Local-only, explicit Origin allowlist, file and time limits.
 * Requires a separately built Meshseal CLI (MIT).
 */
import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const HOST='127.0.0.1';
const PORT=Number(process.env.MESHSEAL_PORT||8768);
const MAX=40*1024*1024;
const ROOT=resolve(process.cwd());
const CLI=process.env.MESHSEAL_CLI||'meshseal_cli';
const ALLOWED=new Set(['http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:8768','http://localhost:8768']);
let busy=false;
function json(res,status,data,origin){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})});res.end(JSON.stringify(data))}
function allowed(req){const o=req.headers.origin;return o&&ALLOWED.has(o)?o:null}
async function bytes(req){let total=0;const parts=[];for await(const b of req){total+=b.byteLength;if(total>MAX)throw Object.assign(Error('Arquivo excede 40 MB'),{status:413});parts.push(b)}return Buffer.concat(parts)}
function runCLI(input,output){return new Promise((done,reject)=>{let finished=false,log='';const cp=spawn(CLI,[input,output],{shell:false,windowsHide:true,stdio:['ignore','ignore','pipe']});const timer=setTimeout(()=>{cp.kill();if(!finished){finished=true;reject(Error('Reparo excedeu 120 segundos'))}},120000);cp.stderr.on('data',b=>log=(log+b).slice(-2000));cp.on('error',e=>{clearTimeout(timer);if(!finished){finished=true;reject(Error('Motor Meshseal indisponível: '+e.message))}});cp.on('close',code=>{clearTimeout(timer);if(!finished){finished=true;code===0?done():reject(Error('Meshseal encerrou com código '+code+': '+log.slice(-250)))}})})}
const server=http.createServer(async(req,res)=>{
 const origin=allowed(req);
 if(req.method==='GET'&&req.url==='/health')return json(res,200,{ok:true,engine:'meshseal-cli',local:true,limit_mb:40,scope:'localhost'},origin);
 if(req.method==='GET'&&req.url==='/studio-oficina-3d.html'){
   try{const html=await readFile(join(ROOT,'studio-oficina-3d.html'));res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html)}catch{json(res,404,{error:'Abra a ponte dentro da pasta catalogoExpressarte'},origin)}return;
 }
 if(req.method==='OPTIONS'&&req.url==='/repair'){
   if(!origin)return json(res,403,{error:'Origem não autorizada'});
   res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'600','vary':'Origin'});res.end();return;
 }
 if(req.method!=='POST'||req.url!=='/repair')return json(res,404,{error:'Rota inválida'},origin);
 if(!origin)return json(res,403,{error:'Use o Studio em http://127.0.0.1:4173 ou http://localhost:4173'});
 if(req.headers['content-type']!=='application/octet-stream')return json(res,415,{error:'Formato de envio inválido'},origin);
 if(busy)return json(res,429,{error:'Outro reparo já está em andamento'},origin);
 busy=true;let dir=null;
 try{
   const inputData=await bytes(req);
   if(inputData.length<84)throw Object.assign(Error('STL inválido ou vazio'),{status:400});
   // STL is decoded by Meshseal; never execute content as a command.
   dir=await mkdtemp(join(tmpdir(),'expressarte-reparo-'));
   const input=join(dir,'entrada.stl'),output=join(dir,'reparado.stl');
   await writeFile(input,inputData,{flag:'wx'});
   await runCLI(input,output);
   const metadata=await stat(output);
   if(metadata.size<84||metadata.size>MAX*2)throw Error('Saída Meshseal vazia ou excessiva');
   const repaired=await readFile(output);
   res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="expressarte-reparado.stl"','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin'});
   res.end(repaired);
 }catch(e){json(res,e.status||502,{error:e.message},origin)}
 finally{busy=false;if(dir)await rm(dir,{force:true,recursive:true}).catch(()=>{})}
});
server.listen(PORT,HOST,()=>console.log('Meshseal local: http://'+HOST+':'+PORT+'/studio-oficina-3d.html'));
