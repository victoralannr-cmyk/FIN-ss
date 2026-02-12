import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const controlTools: FunctionDeclaration[] = [
  {
    name: 'add_transaction',
    description: 'Registra uma nova transação financeira (receita ou despesa).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'O valor numérico da transação.' },
        type: { type: Type.STRING, description: 'O tipo da transação: REVENUE (receita/entrada) ou EXPENSE (despesa/gasto).' },
        description: { type: Type.STRING, description: 'Breve descrição do que se trata.' },
        category: { type: Type.STRING, description: 'Categoria específica: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Compras pessoais, Assinaturas e serviços, Impostos e taxas, Outros.' }
      },
      required: ['amount', 'type', 'description']
    }
  },
  {
    name: 'update_balance',
    description: 'Atualiza o saldo total da conta diretamente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'O novo valor total do saldo.' }
      },
      required: ['amount']
    }
  }
];

export const suggestEmoji = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira apenas UM emoji que represente melhor este texto: "${text}"`,
      config: {
        systemInstruction: "Você é um assistente minimalista da GESTORA DONTE. Retorne APENAS o caractere do emoji, nada mais.",
      }
    });
    return response.text?.trim() || '🎯';
  } catch (error) {
    return '🎯';
  }
};

export const processAICmd = async (message: string, audioBase64?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents: any[] = [];
  
  if (audioBase64) {
    contents.push({
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64
      }
    });
  }
  
  if (message) {
    contents.push({ text: message });
  } else if (audioBase64) {
    contents.push({ text: "O usuário enviou um comando de voz. Processe-o." });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: `Você é Nero, a inteligência central avançada da GESTORA DONTE. Sua missão é ser um assistente financeiro de elite, humano, sofisticado e proativo.

DIRETRIZES DE COMPORTAMENTO:
1. DETECÇÃO DE INTENÇÃO: Identifique se o usuário quer registrar um gasto, uma entrada, fazer uma pergunta ou apenas conversar.
2. REGISTRO AUTOMÁTICO: Use a ferramenta 'add_transaction' sempre que detectar valores financeiros. Extraia: valor, tipo (REVENUE/EXPENSE), descrição e categoria.
3. CATEGORIAS: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Compras pessoais, Assinaturas e serviços, Impostos e taxas, Outros.
4. PROATIVIDADE: Se faltar informação (como categoria), pergunte de forma curta e elegante.
5. RESPOSTA: Confirme registros brevemente: "✅ Gasto de R$ [valor] registrado em [categoria]."
6. TOM: Sofisticado, direto e útil. Nunca responda apenas "ok".
7. VOZ: Pense na leitura em voz alta. Use frases fluidas e naturais.

Exemplo de ação: Usuário diz "Gastei 50 reais no almoço" -> Chame 'add_transaction' com type=EXPENSE, amount=50, category=Alimentação e responda confirmando.`,
        tools: [{ functionDeclarations: controlTools }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Erro Nero:", error);
    return { text: "Erro na sincronização neural do Nero. Por favor, tente novamente." };
  }
};