/* CONFIGURAÇÃO DA LOJA
   Contatos comerciais fornecidos pelo proprietário.
*/
window.EXPRESSARTE_CONFIG = {
  whatsappNumber: "5585991113799",
  storeName: "Express'Arte – Personalizados 3D",
  instagramUrl: "https://www.instagram.com/expressarte_personalizados3d/?hl=en",
  draftMode: true,
  // Endpoint HTTPS opcional para a IA real. Nunca coloque chaves de API neste arquivo.
  expressinhoEndpoint: "",
  // Origem pública da API Cloudflare usada pelo catálogo e pelo importador.
  catalogApiEndpoint: "https://expressarte-import-api.relrys17.workers.dev",
  promotionThemes: {
    default: 'Padrão',
    carnaval: 'Carnaval',
    pascoa: 'Páscoa',
    maes: 'Dia das Mães',
    junina: 'Festa Junina',
    pais: 'Dia dos Pais',
    criancas: 'Dia das Crianças',
    aparecida: 'Nossa Senhora Aparecida',
    natal: 'Natal',
    reveillon: 'Réveillon'
  },
  promotionDiscount(regularCents, offerCents) {
    if (!Number.isSafeInteger(regularCents) || !Number.isSafeInteger(offerCents) ||
        offerCents <= 0 || offerCents >= regularCents) return '';
    const discount = (regularCents - offerCents) / regularCents * 100;
    if (discount < 0.1) return '<0,1%';
    if (discount > 99.9) return '>99,9%';
    return discount.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
  },
  builtInProducts: [
    { id: 'academia-001', name: 'Pote Anilha 28KG / 64LB', category: 'Academia', price: 34.90, priceLabel: 'preço provisório', draft: true, cover: 'assets/products/pote-anilha-28kg-64lb-01.webp' },
    { id: 'religioso-001', name: 'Bandeja Porta Rosário Nossa Senhora Aparecida 130mm', category: 'Religiosos', price: 30.00, priceLabel: 'preço atual', draft: true, cover: 'assets/products/bandeja-porta-rosario-01.webp' }
  ]
};
