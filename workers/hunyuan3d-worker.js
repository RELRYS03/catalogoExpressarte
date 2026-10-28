// Cloudflare Worker - Hunyuan3D v3 via fal.ai. FAL_KEY must remain a server-side secret.
// Protect this paid endpoint with Cloudflare Access or authenticated gateway before public deployment.
const MODEL="fal-ai/hunyuan3d-v3/image-to-3d";
const QUEUE="https://queue.fal.run/"+MODEL;
const json=(obj,status=200,origin="")=>new Response(JSON.stringify(obj),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...(origin?{"access-control-allow-origin":origin,"vary":"Origin"}:{})}});
export default {async fetch(request,env){
 const origin=request.headers.get("Origin")||"", allowed=env.ALLOWED_ORIGIN||"";
 if(!allowed||origin!==allowed)return json({error:"Origin não permitido."},403);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"POST, GET, OPTIONS","access-control-allow-headers":"Content-Type","access-control-max-age":"600"}});
 if(!env.FAL_KEY)return json({error:"FAL_KEY não configurada no servidor."},503,origin);
 if(!env.RATE_LIMITER)return json({error:"Controle de limite não configurado."},503,origin);const limited=await env.RATE_LIMITER.limit({key:request.headers.get("CF-Connecting-IP")||"anonymous"});if(!limited.success)return json({error:"Limite de geração atingido."},429,origin)
 const url=new URL(request.url),id=url.searchParams.get("id")||"";
 try {
 let path,method=request.method,body;
 if(url.pathname==="/api/3d/jobs"&&method==="POST"){
   const data=await request.json();
   if(typeof data.image!=="string"||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data.image)||data.image.length>7_000_000)return json({error:"Imagem inválida (máximo aproximado de 5 MB)."},400,origin);
   path=QUEUE;body=JSON.stringify({input_image_url:data.image,generate_type:"Geometry",face_count:40000,enable_safety_checker:true});
 } else if((url.pathname==="/api/3d/status"||url.pathname==="/api/3d/result")&&method==="GET"&&/^[a-zA-Z0-9-]{1,100}$/.test(id)){
   path=QUEUE+"/requests/"+encodeURIComponent(id)+(url.pathname.endsWith("/status")?"/status":"");
 } else return json({error:"Rota não encontrada."},404,origin);
 const upstream=await fetch(path,{method:method==="POST"?"POST":"GET",headers:{"Authorization":"Key "+env.FAL_KEY,"Content-Type":"application/json"},...(body?{body}:{})});
 const raw=await upstream.text();let data;try{data=JSON.parse(raw)}catch{data={error:"Resposta inválida do motor 3D."}}
 if(!upstream.ok)return json({error:data.detail||data.error||"Falha na API de geração."},upstream.status,origin);
 if(method==="POST")return json({request_id:data.request_id},202,origin);
 if(url.pathname==="/api/3d/status")return json({status:data.status,queue_position:data.queue_position},200,origin);
 const model=data.model_glb?.url||data.model_urls?.glb?.url;return json({glb:model||null,obj:data.model_urls?.obj?.url||null},200,origin);
 }catch(e){return json({error:"Falha de comunicação com o gerador."},502,origin)}
}};