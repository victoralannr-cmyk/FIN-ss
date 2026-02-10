
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
        category: { type: Type.STRING, description: 'Categoria (Ex: Moradia, Lazer, Freelance).' }
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

export const processAICmd = async (message: string, audioBase64?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contents: any[] = [];
  
  if (audioBase64) {
    contents.push({
      inlineData: {
        mimeType: 'audio/webm', // Ajustado para o padrão do navegador
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
        systemInstruction: `Você é o Nexus Core, um sistema operacional de alta performance. 
        Sua única função é gerenciar as finanças e tarefas do usuário.
        Seja curto, grosso e eficiente. 
        Ao receber comandos de valores, use a função add_transaction para registrar.
        Para metas de saldo, use update_balance.
        Para novas obrigações, use add_task.
        Confirme sempre a ação realizada.`,
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
