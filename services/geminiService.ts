
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Declaração das ferramentas que a IA pode usar
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
  },
  {
    name: 'add_task',
    description: 'Adiciona uma nova tarefa na lista de afazeres.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Título da tarefa.' }
      },
      required: ['title']
    }
  }
];

export const classifyCategory = async (description: string, amount: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const promptInstruction = `
    Função exclusiva: classificar gastos por categoria.
    Você NÃO é um assistente de conversa.
    Você NÃO deve aconselhar, explicar, sugerir ou interagir com o usuário.
    Tarefa única: Identificar a categoria de gasto mais provável.
    Categorias permitidas: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Compras pessoais, Assinaturas e serviços, Impostos e taxas, Outros.
    Retorne APENAS o JSON no formato: {"categoria": "NomeDaCategoria"}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Descrição: ${description}, Valor: ${amount}`,
      config: {
        responseMimeType: "application/json",
        systemInstruction: promptInstruction,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categoria: { 
              type: Type.STRING,
              description: 'A categoria classificada.'
            }
          },
          required: ['categoria']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result.categoria || 'Outros';
  } catch (error) {
    console.error("Erro na classificação automática:", error);
    return 'Outros';
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
  
  contents.push({ text: message || "O usuário enviou um áudio. Processe o comando financeiro ou de tarefa contido nele." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: `Você é o Nexus Core. Gerencie finanças e tarefas. 
        Para transações, use add_transaction. 
        IMPORTANTE: Use as categorias exatas: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Compras pessoais, Assinaturas e serviços, Impostos e taxas, Outros.
        Seja extremamente eficiente.`,
        tools: [{ functionDeclarations: controlTools }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Erro Nexus AI:", error);
    return { text: "Erro na sincronização neural. Tente novamente." };
  }
};
