import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

function brokenCubeSTL(){
 const p=[[-10,-10,-10],[10,-10,-10],[10,10,-10],[-10,10,-10],[-10,-10,10],[10,-10,10],[10,10,10],[-10,10,10]];
 const quads=[[0,3,2,1],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
 const faces=[];for(const [a,b,c,d] of quads){faces.push([a,b,c],[a,c,d])}
 const b=Buffer.alloc(84+50*faces.length);b.write('ExpressArte defective open cube');b.writeUInt32LE(faces.length,80);
 for(let i=0;i<faces.length;i++){let at=84+50*i+12;for(const index of faces[i])for(const v of p[index]){b.writeFloatLE(v,at);at+=4}}
 return b;
}
function edgeCounts(buffer){
 const n=buffer.readUInt32LE(80);
 expect(buffer.byteLength).toBe(84+n*50);
 const counts=new Map();const pt=(i,j)=>[0,1,2].map(k=>buffer.readFloatLE(84+50*i+12+12*j+4*k).toFixed(4)).join(',');
 for(let i=0;i<n;i++){const t=[pt(i,0),pt(i,1),pt(i,2)];for(let j=0;j<3;j++){const k=[t[j],t[(j+1)%3]].sort().join('|');counts.set(k,(counts.get(k)||0)+1)}}
 return {faces:n,open:[...counts.values()].filter(x=>x===1).length,nonmanifold:[...counts.values()].filter(x=>x>2).length};
}

test('motor real Meshseal WASM fecha furo de STL e gera download válido',async({page})=>{
 test.setTimeout(180000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=brokenCubeSTL();expect(edgeCounts(source).open).toBeGreaterThan(0);
 await page.goto('/studio-oficina-3d.html');
 await page.locator('#modelFile').setInputFiles({name:'cubo-com-furo.stl',mimeType:'model/stl',buffer:source});
 await expect(page.locator('#repairNow')).toBeEnabled();
 await page.locator('#repairNow').click();
 await expect(page.locator('#status')).toContainText('Reparo concluído no navegador',{timeout:150000});
 await expect(page.locator('#repairDownload')).toBeEnabled();
 const downloading=page.waitForEvent('download');
 await page.locator('#repairDownload').click();
 const downloaded=await downloading;const data=await readFile(await downloaded.path());
 const diagnosed=edgeCounts(data);expect(diagnosed.faces).toBeGreaterThan(0);expect(diagnosed.open).toBe(0);expect(diagnosed.nonmanifold).toBe(0);
 expect(errors).toEqual([]);
});

test('WASM ausente deve falhar sem liberar STL corrigido',async({page})=>{
 await page.route('**/integrations/meshseal/wasm/meshseal.js',route=>route.abort());
 await page.goto('/studio-oficina-3d.html');
 await page.locator('#demo').click();
 await page.locator('#repairNow').click();
 await expect(page.locator('#status')).toContainText('Falha no reparo WASM',{timeout:20000});
 await expect(page.locator('#repairDownload')).toBeDisabled();
});
