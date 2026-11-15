export const technicalModes = {
  studio: {
    label: 'Studio 3D',
    quickPrompt: 'Como você pode me ajudar com o Blender?',
    systemPrompt: 'ÁREA ATUAL: STUDIO 3D. Ajude com planejamento, Blender, geometria, malhas, STL/3MF, medidas, encaixes e modelagem. Você não tem acesso direto ao computador, Blender ou arquivos e não deve afirmar que executou ações.',
    fallback(message) {
      if (/\b(blender|malha|stl|3mf|modelo|modelagem|furo|rosca|encaixe)\b/i.test(message)) {
        return 'Posso ajudar a planejar modelagem, medidas, malhas, furos, roscas e encaixes. Ainda não estou conectado ao Blender nem consigo alterar arquivos diretamente por esta conversa. Diga o objetivo da peça, as medidas e o formato do arquivo para eu orientar o próximo passo com segurança.';
      }
      return 'No módulo Studio 3D, posso organizar o trabalho de modelagem e ajudar a diagnosticar problemas a partir das informações que você fornecer. A conexão direta com Blender e a edição de arquivos ainda serão implementadas; não vou afirmar que executei uma operação que não fiz.';
    }
  },
  fabricacao: {
    label: 'Fabricação',
    quickPrompt: 'Quais dados você precisa para calcular uma impressão?',
    systemPrompt: 'ÁREA ATUAL: FABRICAÇÃO. Ajude com preparação, materiais, custos e diagnóstico de impressão. Não invente medidas, consumos, tempos ou configurações específicas. Peça os dados que faltam e diferencie estimativas de fatos.',
    fallback(message) {
      if (/\b(custo|custos|preço|preco|lucro|filamento|gramas|gramagem|tempo|petg|pla|impressão|impressao|bambu)\b/i.test(message)) {
        return 'Para calcular fabricação sem inventar números, preciso dos dados disponíveis: material, gramas usadas, preço do quilo, tempo de impressão, custo de embalagem e margem para falhas. Para recomendar configurações, preciso também saber o material e a função da peça. Ainda não estou conectado à impressora nem ao fatiador.';
      }
      return 'No módulo Fabricação, vou ajudar com consumo de material, tempo, custo, acabamento e preparação de impressão. Para um cálculo confiável, envie os dados reais da peça. A conexão automática com impressora e fatiador ainda não está ativa.';
    }
  }
};
