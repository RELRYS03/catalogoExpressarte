// Run: node --test workers/hunyuan3d-worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const src=await readFile(new URL('./hunyuan3d-worker.js',import.meta.url),'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))).default;
const origin='https://studio.example.com';
const env={FAL_KEY:'secret-for-test',ALLOWED_ORIGIN:origin,RATE_LIMITER:{limit:async()=>({success:true})}};
const request=(path,method='GET',body)=>new Request('https://studio.example.com'+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const fakeImage='data:image/png;base64,'+Buffer.from('test').toString('base64');
test('rejects unauthorized Origin before contacting provider',async()=>{const r=await worker.fetch(new Request('https://studio.example.com/api/3d/jobs',{method:'POST'}),env);assert.equal(r.status,403)});
test('rejects missing rate limiter for billed endpoint',async()=>{const r=await worker.fetch(request('/api/3d/jobs','POST',{image:fakeImage}),{FAL_KEY:'x',ALLOWED_ORIGIN:origin});assert.equal(r.status,503)});
test('rejects bad image data without contacting provider',async()=>{const r=await worker.fetch(request('/api/3d/jobs','POST',{image:'http://localhost/secret'}),env);assert.equal(r.status,400)});
test('submits validated image and normalizes queue response',async()=>{
 const old=globalThis.fetch;let target;try{globalThis.fetch=async(input,options)=>{target={input,options};return new Response(JSON.stringify({request_id:'abc-123'}),{status:200})};
 const r=await worker.fetch(request('/api/3d/jobs','POST',{image:fakeImage}),env);assert.equal(r.status,202);assert.deepEqual(await r.json(),{request_id:'abc-123'});assert.equal(target.options.headers.Authorization,'Key secret-for-test');assert.equal(JSON.parse(target.options.body).generate_type,'Geometry')
 }finally{globalThis.fetch=old}
});
test('returns GLB/OBJ from provider schema',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>new Response(JSON.stringify({model_glb:{url:'https://cdn.example/model.glb'},model_urls:{obj:{url:'https://cdn.example/model.obj'}}}));const r=await worker.fetch(request('/api/3d/result?id=abc-123'),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{glb:'https://cdn.example/model.glb',obj:'https://cdn.example/model.obj'})}finally{globalThis.fetch=old}});
