#!/usr/bin/env node
/**
 * Express'Arte RK10 ↔ FreeLLMAPI local bridge.
 * Node >= 20. No key in source code. Defaults to loopback only.
 * This is a developer-side service, NOT a public Cloudflare worker.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
const HOST='127.0.0.1',PORT=Number(process.env.RK10_PORT||8767);
const BASE=(process.env.FREELLMAPI_BASE_URL||'http://127.0.0.1:3001/v1').replace(/\/$/,'');
const KEY=process.env.FREELLMAPI_API_KEY||'';
const STORE=path.resolve(process.env.RK10_STORE||'./.rk10-private');
const SESSION_RE=/^[a-zA-Z0-9_-]{1,72}$/;
const MAX_BODY=160000;
const SYSTEM='Você é RK10, coordenador técnico da Express’Arte Studio 3D. Continue a tarefa atual usando o contexto e decisões anteriores. Não invente resultados de execução, implementação, teste, arquivos STL nem capacidades 3D. Responda em português direto. Para ações em código, explique mudanças verificáveis.';
async function load(id){try{return JSON.parse(await readFile(path.join(STORE,id+'.json'),'utf8'))}catch(e){if(e.code==='ENOENT')return {id,history:[],notes:'',updatedAt:null};throw e}}
async function save(s){await mkdir(STORE,{recursive:true,mode:0o700});const target=path.join(STORE,s.id+'.json'),tmp=target+'.'+randomUUID();await writeFile(tmp,JSON.stringify(s,null,2),{mode:0o600});await rename(tmp,target)}
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'http://localhost'});res.end(JSON.stringify(data))}
async function body(req){let bytes=0,chunks=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>MAX_BODY)throw Error('Pedido muito grande');chunks.push(chunk)}return JSON.parse(Buffer.concat(chunks).toString())}
async function ask(s,prompt){const messages=[{role:'system',content:SYSTEM+(s.notes?'\nEstado consolidado: '+s.notes:'')},...s.history.slice(-24),{role:'user',content:prompt}];const response=await fetch(BASE+'/chat/completions',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+KEY},body:JSON.stringify({model:'auto',messages,stream:false}),signal:AbortSignal.timeout(90000)});const raw=await response.text();if(!response.ok)throw Error('FreeLLMAPI HTTP '+response.status+': '+raw.slice(0,250));let data;try{data=JSON.parse(raw)}catch{throw Error('Resposta inválida da API')};const answer=data.choices?.[0]?.message?.content;if(typeof answer!=='string'||!answer.trim())throw Error('Provedor não retornou texto');const served=response.headers.get('x-routed-via')||data.model||'não identificado';s.history.push({role:'user',content:prompt},{role:'assistant',content:answer});s.history=s.history.slice(-30);s.updatedAt=new Date().toISOString();await save(s);return {answer,served_model:served,fallback_attempts:response.headers.get('x-fallback-attempts'),session_id:s.id,history_messages:s.history.length}}
if(!KEY){console.error('Defina FREELLMAPI_API_KEY no ambiente; não coloque a chave no GitHub.');process.exit(1)}
const server=http.createServer(async(req,res)=>{try{
 if(req.method==='GET'&&req.url==='/health')return send(res,200,{ok:true,service:'rk10-local-bridge',freeLLMAPI:BASE,credentials:'environment',scope:'local-only'});
 if(req.method!=='POST'||!['/ask','/context'].includes(req.url))return send(res,404,{error:'Rota não encontrada'});
 const payload=await body(req),id=payload.session_id||'expressarte-studio';if(typeof id!=='string'||!SESSION_RE.test(id))return send(res,400,{error:'session_id inválido'});
 const s=await load(id);
 if(req.url==='/context'){if(typeof payload.notes!=='string'||payload.notes.length>12000)return send(res,400,{error:'notes inválido'});s.notes=payload.notes;s.updatedAt=new Date().toISOString();await save(s);return send(res,200,{ok:true,session_id:id,notes_saved:true})}
 if(typeof payload.prompt!=='string'||!payload.prompt.trim()||payload.prompt.length>12000)return send(res,400,{error:'prompt inválido'});
 return send(res,200,await ask(s,payload.prompt));
 }catch(e){console.error(e.message);return send(res,502,{error:e.message})}});
server.listen(PORT,HOST,()=>console.log('RK10 local bridge: http://'+HOST+':'+PORT+' (loopback apenas)'));
