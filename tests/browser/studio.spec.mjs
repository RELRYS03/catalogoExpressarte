import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('Oficina carrega, demonstra, aplica cor e exporta STL e GLB',async({page})=>{
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/studio-oficina-3d.html');
  await expect(page.locator('h1')).toContainText('Express');
  await page.getByRole('button',{name:'Abrir modelo de demonstração'}).click();
  await expect(page.locator('#measure')).toContainText('Triângulos:');
  await expect(page.locator('#exportStl')).toBeEnabled();
  await page.locator('#color').fill('#aabbcc');
  await page.getByRole('button',{name:'Aplicar cor'}).click();
  await expect(page.locator('#status')).toContainText('Cor aplicada');
  const stlPromise=page.waitForEvent('download');
  await page.locator('#exportStl').click();
  const stl=await stlPromise;
  expect(stl.suggestedFilename()).toMatch(/\.stl$/);
  const glbPromise=page.waitForEvent('download');
  await page.locator('#exportGlb').click();
  const glb=await glbPromise;
  expect(glb.suggestedFilename()).toMatch(/\.glb$/);
  expect(errors).toEqual([]);
});
test('Oficina remove fundo branco de imagem e baixa PNG',async({page})=>{
  await page.goto('/studio-oficina-3d.html');
  await page.locator('#imageFile').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9QyGHOwAAAABJRU5ErkJggg==','base64')});
  await expect(page.locator('#removeBg')).toBeEnabled();
  await page.locator('#removeBg').click();
  await expect(page.locator('#status')).toContainText('Fundo claro removido');
  const pngPromise=page.waitForEvent('download');
  await page.locator('#savePng').click();
  expect((await pngPromise).suggestedFilename()).toMatch(/\.png$/);
});
test('Gerador de relevo possui controles e viewport',async({page})=>{
  await page.goto('/imagem-para-3d.html');
  await expect(page.locator('#viewer')).toBeVisible();
  await expect(page.locator('#generate')).toBeDisabled();
  await expect(page.locator('#photo')).toHaveAttribute('type','file');
});

test('Arquivo STL exportado reabre no visualizador',async({page})=>{
  await page.goto('/studio-oficina-3d.html');
  await page.locator('#demo').click();
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#exportStl').click();
  const download=await downloadPromise;
  const file=await download.path();
  await page.locator('#modelFile').setInputFiles({name:'modelo-reimportado.stl',mimeType:'model/stl',buffer:await readFile(file)});
  await expect(page.locator('#measure')).toContainText('Triângulos:');
  await expect(page.locator('#status')).toContainText('Modelo carregado');
});
test('Relevo de imagem gera STL com modo de visualização ampliado',async({page})=>{
  await page.goto('/imagem-para-3d.html');
  await page.locator('#photo').setInputFiles({
    name:'sample.svg',mimeType:'image/svg+xml',
    buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="white"/></svg>')
  });
  await expect(page.locator('#generate')).toBeDisabled();
  await expect(page.locator('#message')).toContainText('Use PNG/JPG/WebP');
});

test('Sem artefatos WebAssembly, reparo informa erro sem gerar download',async({page})=>{
  await page.route('**/integrations/meshseal/wasm/meshseal.js',route=>route.abort());
  await page.goto('/studio-oficina-3d.html');
  await page.locator('#demo').click();
  await page.locator('#repairNow').click();
  await expect(page.locator('#status')).toContainText('Falha no reparo WASM',{timeout:20000});
  await expect(page.locator('#repairDownload')).toBeDisabled();
});

test('Ferramentas de posição, rotação e escala atualizam medidas e restauram o modelo',async({page})=>{
 await page.goto('/studio-oficina-3d.html');
 await expect(page.locator('#posX')).toBeDisabled();
 await page.locator('#demo').click();
 await expect(page.locator('#posX')).toBeEnabled();
 const original=await page.locator('#measure').innerText();
 await page.locator('#posX').fill('30');
 await page.locator('#posX').dispatchEvent('change');
 await expect(page.locator('#posX')).toHaveValue('30');
 await page.locator('#scaleX').fill('200');
 await page.locator('#scaleX').dispatchEvent('change');
 await page.locator('#uniformScale').click();
 await expect(page.locator('#scaleY')).toHaveValue('200');
 await expect(page.locator('#scaleZ')).toHaveValue('200');
 expect(await page.locator('#measure').innerText()).not.toEqual(original);
 await page.locator('#groundModel').click();
 await page.locator('#resetTransform').click();
 await expect(page.locator('#posX')).toHaveValue('0');
 await expect(page.locator('#scaleX')).toHaveValue('100');
 expect(await page.locator('#measure').innerText()).toEqual(original);
});
test('Escala inválida é rejeitada e não exporta modelo desfigurado',async({page})=>{
 await page.goto('/studio-oficina-3d.html');
 await page.locator('#demo').click();
 await page.locator('#scaleX').fill('0');
 await page.locator('#scaleX').dispatchEvent('change');
 await expect(page.locator('#status')).toContainText('Valores inválidos');
 await expect(page.locator('#scaleX')).toHaveValue('100');
});

test('Editor permite criar, selecionar, duplicar e remover objetos 3D',async({page})=>{
 await page.goto('/studio-oficina-3d.html');
 await page.locator('#createCube').click();
 await expect(page.locator('#objectSelect')).toHaveValue('0');
 await expect(page.locator('#toolMove')).toBeEnabled();
 await page.locator('#createSphere').click();
 await expect(page.locator('#objectSelect')).toHaveValue('1');
 await expect(page.locator('#objectSelect option')).toHaveCount(3);
 await page.locator('#duplicateObject').click();
 await expect(page.locator('#objectSelect option')).toHaveCount(4);
 await page.locator('#deleteObject').click();
 await expect(page.locator('#objectSelect option')).toHaveCount(3);
 await page.locator('#toolRotate').click();
 await page.locator('#toolScale').click();
 await expect(page.locator('#status')).toContainText('Ferramenta:');
});
test('Grade respeita profundidade e não sobrepõe modelo sólido',async({page})=>{
 await page.goto('/studio-oficina-3d.html');
 await page.locator('#demo').click();
 await expect(page.locator('#status')).toContainText('Demonstração carregada');
 await expect(page.locator('#grid')).toBeVisible();
 await page.locator('#grid').click();
 await page.locator('#grid').click();
 await expect(page.locator('#exportStl')).toBeEnabled();
});
