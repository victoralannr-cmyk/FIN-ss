
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const controlTools: FunctionDeclaration[] = [
  {
    name: 'add_transaction',
    description: 'Registra uma nova transação financeira (receita ou despesa).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER, description: 'O valor da transação.' },
        type: { type: Type.STRING, description: 'O tipo da transação: REVENUE (receita) ou EXPENSE (despesa).' },
        description: { type: Type.STRING, description: 'Breve descrição do que se trata.' },
        category: { type: Type.STRING, description: 'Categoria específica conforme as diretrizes do sistema.' }
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
        systemInstruction: "Você é um assistente minimalista. Retorne APENAS o caractere do emoji, nada mais.",
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
  
  contents.push({ text: message || "O usuário enviou um áudio." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: `Você é Nero, a inteligência central do VWallet. Sua comunicação deve ser eficiente e sofisticada.
        Para transações, use add_transaction. 
        Categorias: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Compras pessoais, Assinaturas e serviços, Impostos e taxas, Outros.`,
        tools: [{ functionDeclarations: controlTools }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    return { text: "Erro na sincronização neural do Nero." };
  }
};
