import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const controlTools: FunctionDeclaration[] = [
  {
    name: 'add_transaction',
    description: 'Registra uma nova transação financeira (receita ou despesa).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'O valor numérico da transação.' },
        type: { type: Type.STRING, description: 'O tipo da transação: REVENUE (entrada) ou EXPENSE (gasto).' },
        description: { type: Type.STRING, description: 'Breve descrição do que se trata.' },
        category: { type: Type.STRING, description: 'Categoria sugerida baseada no contexto.' }
      },
      required: ['amount', 'type', 'description']
    }
  }
];

export const suggestEmoji = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira apenas UM emoji para: "${text}"`,
      config: {
        systemInstruction: "Retorne apenas o caractere do emoji.",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text?.trim() || '🎯';
  } catch {
    return '🎯';
  }
};

export const processAICmd = async (message: string, audioBase64?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const contents: any[] = [];
  
  if (audioBase64) contents.push({ inlineData: { mimeType: 'audio/webm', data: audioBase64 } });
  if (message) contents.push({ text: message });
  else if (audioBase64) contents.push({ text: "Processar comando de áudio." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: `Você é o Nero, o assistente de elite da Fante IA. 
Sua missão é ser eficiente, motivador e interativo. 
REGRAS DE OURO:
1. Ao registrar algo, SEMPRE confirme verbalmente o valor e o que foi feito.
Ex: "Perfeito! Já registrei sua entrada de R$ 1.200. Seu balanço foi atualizado."
2. Se o usuário apenas conversar, responda de forma curta e inteligente.
3. Use a ferramenta add_transaction IMEDIATAMENTE quando identificar um gasto ou ganho.
4. Mantenha um tom profissional, porém amigável.`,
        tools: [{ functionDeclarations: controlTools }],
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error(error);
    return { text: "Desculpe, tive um problema na conexão neural. Pode repetir?" };
  }
};