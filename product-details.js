(() => {
'use strict';
const card=document.querySelector('[data-product-id="religioso-001"]');
if(!card)return;
const originalImage=card.querySelector('.product-main-photo');
const gallery=[...card.querySelectorAll('.photo-thumb')].map(b=>({src:b.dataset.photo,alt:b.dataset.alt||'Bandeja porta rosário'}));
if(!gallery.length)gallery.push({src:originalImage.src,alt:originalImage.alt});
const dialog=document.createElement('dialog');
dialog.className='ea-details-dialog';
dialog.setAttribute('aria-labelledby','eaDetailsTitle');
dialog.innerHTML=`<div class="ea-details-shell">
<button type="button" class="ea-details-close" aria-label="Fechar detalhes">×</button>
<div class="ea-details-visual"><img class="ea-details-image" alt=""><div class="ea-details-thumbnails" aria-label="Outras fotos"></div></div>
<div class="ea-details-content"><span class="ea-details-eyebrow">EXPRESS’ARTE • RELIGIOSOS</span>
<h2 id="eaDetailsTitle">Bandeja Porta Rosário Nossa Senhora Aparecida</h2>
<p class="ea-details-description">Uma peça delicada e cheia de significado para guardar seu rosário e decorar seu cantinho de oração. Ideal também para presentear com fé e carinho.</p>
<p class="ea-details-spec"><strong>Tamanho:</strong> 13 cm (130 mm)</p>
<p class="ea-details-note">Somente a peça impressa. Rosário, correntes e acessórios não inclusos.</p>
<div class="ea-details-price">R$ 30,00</div>
<label class="ea-details-qty-label" for="eaDetailsQty">Quantidade</label><input id="eaDetailsQty" class="ea-details-qty" type="number" min="1" max="999" value="1">
<button type="button" class="ea-details-add">Adicionar ao pedido</button></div></div>`;
document.body.appendChild(dialog);
const main=dialog.querySelector('.ea-details-image');
const thumbs=dialog.querySelector('.ea-details-thumbnails');
function selectPhoto(index){
 const entry=gallery[index];main.src=entry.src;main.alt=entry.alt;
 [...thumbs.children].forEach((b,i)=>{b.classList.toggle('is-active',i===index);b.setAttribute('aria-pressed',String(i===index));});
}
gallery.forEach((photo,i)=>{const b=document.createElement('button');b.type='button';b.className='ea-details-thumb';b.setAttribute('aria-label','Ver foto '+(i+1));const img=document.createElement('img');img.src=photo.src;img.alt='';b.appendChild(img);b.addEventListener('click',()=>selectPhoto(i));thumbs.appendChild(b);});
selectPhoto(0);
let lastFocus=null;
function openDetails(){lastFocus=document.activeElement;dialog.querySelector('.ea-details-qty').value='1';selectPhoto(0);dialog.showModal();}
function closeDetails(){dialog.close();if(lastFocus?.isConnected)lastFocus.focus();}
dialog.querySelector('.ea-details-close').addEventListener('click',closeDetails);
dialog.addEventListener('click',e=>{if(e.target===dialog)closeDetails();});
const button=document.createElement('button');button.type='button';button.className='ea-details-view';button.textContent='Ver detalhes e fotos';
card.querySelector('.product-info').insertBefore(button,card.querySelector('.product-info .quantity-row'));
button.addEventListener('click',openDetails);
originalImage.classList.add('ea-details-clickable');originalImage.tabIndex=0;originalImage.setAttribute('role','button');originalImage.setAttribute('aria-label','Ampliar fotos e ver detalhes da bandeja');
originalImage.addEventListener('click',openDetails);
originalImage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetails();}});
dialog.querySelector('.ea-details-add').addEventListener('click',()=>{
 const qty=Math.max(1,Math.min(999,Math.floor(Number(dialog.querySelector('.ea-details-qty').value)||1)));
 const current=Number(card.querySelector('.qty-value').textContent)||1;
 const plus=card.querySelector('.qty-plus'),minus=card.querySelector('.qty-minus');
 // Reaproveita o fluxo de pedidos existente, sem duplicar cálculos.
 for(let i=current;i<qty;i++)plus.click();
 for(let i=current;i>qty;i--)minus.click();
 card.querySelector('.add-order-button').click();
 closeDetails();
});
})();
