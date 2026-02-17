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
  else if (audioBase64) contents.push({ text: "Processar comando de áudio de transação financeira." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: `Você é a Safari IA, uma assistente financeira de elite.
Sua principal função é ajudar o usuário a gerenciar gastos e ganhos com agilidade e inteligência.

DIRETRIZES DE RESPOSTA (OBRIGATÓRIO):
1. Quando o usuário informar um gasto ou ganho, você DEVE SEMPRE usar a ferramenta 'add_transaction'.
2. Além de usar a ferramenta, você deve OBRIGATORIAMENTE gerar uma resposta de texto personalizada.
3. NUNCA responda apenas com a chamada de função. O texto deve confirmar os detalhes.
4. Na sua resposta, mencione explicitamente:
   - O Valor (em R$)
   - O que é (Descrição)
   - A Categoria escolhida
5. Use um tom encorajador e profissional.

EXEMPLO DE RESPOSTA ESPERADA:
"Tudo pronto! Registrei seu gasto de R$ 50,00 com 'Cinema' na categoria Lazer. Divirta-se, você merece esse descanso!"
"Entendido. Adicionei sua receita de R$ 3.500,00 como 'Salário' em Outros. Excelente! Seu saldo agradece."

Se o usuário apenas der um "oi", responda amigavelmente se apresentando como Safari IA e pergunte como pode ajudar nas finanças hoje.`,
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
    return { text: "Perdão, tive um problema ao processar esse registro. Pode repetir o valor e o item?" };
  }
};