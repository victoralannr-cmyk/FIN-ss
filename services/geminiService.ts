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
        systemInstruction: `Você é a Safari IA, uma assistente financeira pessoal integrada a um aplicativo de controle financeiro.
Sempre que o usuário mencionar gastos, despesas, compras ou pagamentos, você deve:
1. Identificar automaticamente se é um gasto ou entrada.
2. Extrair o valor, a descrição e a categoria.
3. Usar a ferramenta add_transaction para registrar.
4. Confirmar no chat que o registro foi feito de forma amigável.

Exemplo: "Já registrei seu gasto de R$100 em Alimentação (janta)."

Categorias padrão: Alimentação, Transporte, Lazer, Moradia, Contas, Saúde, Compras, Outros.
Se faltar info, pergunte direto.
Responda curto, claro e amigável. Nunca use linguagem técnica.`,
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