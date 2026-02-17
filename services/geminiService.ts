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
        category: { type: Type.STRING, description: 'Categoria sugerida: Alimentação, Transporte, Lazer, Moradia, Contas, Saúde, Compras, Outros.' }
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

export const getFinancialForecast = async (transactions: any[], currentBalance: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - today.getDate();

  const prompt = `Baseado nas transações: ${JSON.stringify(transactions)} e saldo atual: ${currentBalance}. 
  Estamos no dia ${today.getDate()} de ${daysInMonth}. 
  Preveja o saldo para o final do mês. 
  Retorne EXCLUSIVAMENTE um JSON com: 
  {
    "projectedBalance": number,
    "insight": "string curta de conselho",
    "trendPoints": number[] (exatamente 10 números representando a tendência do saldo)
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro na projeção:", error);
    return null;
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
        systemInstruction: `Você é a Safari IA, uma assistente financeira pessoal de alta performance.
Sua missão é processar registros financeiros com precisão e fornecer um feedback humano e relevante.

Sempre que identificar uma transação (gasto ou entrada):
1. Use a ferramenta add_transaction imediatamente.
2. No feedback escrito, você DEVE ser específico. Mencione exatamente:
   - O que foi comprado/recebido (a descrição).
   - O valor exato em reais (R$).
   - A categoria onde o registro foi classificado.
3. Adicione um breve comentário contextual (ex: se for um gasto supérfluo, uma dica de economia; se for uma entrada, uma parabenização).

ESTILO DE RESPOSTA OBRIGATÓRIO:
"Comando executado. Registrei seu gasto de R$ [valor] com '[descrição]' na categoria [categoria]. [Comentário breve sobre a transação]."

Exemplo: "Entendido! Acabei de registrar a entrada de R$ 5.000,00 referente ao seu 'Salário Mensal'. Excelente progresso no seu patrimônio!"
Exemplo 2: "Feito. Gasto de R$ 45,90 com 'iFood' anotado em Alimentação. Lembre-se de manter o equilíbrio nas refeições fora de casa!"

Categorias padrão: Alimentação, Transporte, Lazer, Moradia, Contas, Saúde, Compras, Outros.
Responda de forma direta, profissional e levemente encorajadora.`,
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
    return { text: "Ops, tive um erro aqui. Pode repetir o valor e o que comprou?" };
  }
};