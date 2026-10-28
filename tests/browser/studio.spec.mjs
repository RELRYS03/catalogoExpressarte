import {test,expect} from '@playwright/test';
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
  await page.locator('#modelFile').setInputFiles(file);
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

test('Reparador Meshseal integrado tem interface e falha segura sem ponte',async({page})=>{
  await page.goto('/studio-oficina-3d.html');
  await expect(page.locator('#repairNow')).toBeDisabled();
  await page.locator('#demo').click();
  await expect(page.locator('#repairNow')).toBeEnabled();
  await page.route('http://127.0.0.1:8768/repair',route=>route.abort('failed'));
  await page.locator('#repairNow').click();
  await expect(page.locator('#status')).toContainText('Não foi possível reparar');
  await expect(page.locator('#repairNow')).toBeEnabled();
  await expect(page.locator('#repairDownload')).toBeDisabled();
});
