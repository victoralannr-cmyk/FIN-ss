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
        category: { type: Type.STRING, description: 'Categoria: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Compras, Assinaturas, Impostos, Outros.' }
      },
      required: ['amount', 'type', 'description']
    }
  }
];

export const suggestEmoji = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sugira apenas UM emoji para: "${text}"`,
      config: {
        systemInstruction: "Retorne apenas o caractere do emoji.",
      }
    });
    return response.text?.trim() || '🎯';
  } catch {
    return '🎯';
  }
};

export const processAICmd = async (message: string, audioBase64?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const contents: any[] = [];
  
  if (audioBase64) contents.push({ inlineData: { mimeType: 'audio/webm', data: audioBase64 } });
  if (message) contents.push({ text: message });
  else if (audioBase64) contents.push({ text: "Processar comando de áudio." });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: `Você é Nero, IA financeira avançada da GESTORA DONTE.

1️⃣ COMPORTAMENTO
- Responda de forma simples, humana e direta.
- Adapte o tom (formal/casual) ao usuário.
- Seja proativo: peça informações faltantes com perguntas curtas.

2️⃣ INTENT DETECTION
- Identifique se o usuário está registrando gasto, entrada, perguntando ou conversando.

3️⃣ REGISTRO AUTOMÁTICO
- Use 'add_transaction' para gastos/entradas.
- Extraia: Valor, Tipo (REVENUE/EXPENSE), Categoria e Descrição.
- Confirme: "✅ [Tipo] de R$ [Valor] registrado em [Categoria]."

4️⃣ INTELIGÊNCIA FINANCEIRA
- Ofereça insights curtos se relevante.
- Leia valores naturalmente: "R$ 1.250" -> "mil duzentos e cinquenta reais".

5️⃣ REGRAS DE OURO
- Nunca responda apenas "ok".
- Priorize frases curtas e fluidez.
- Sucesso = clareza, rapidez e utilidade.`,
        tools: [{ functionDeclarations: controlTools }]
      }
    });

    return {
      text: response.text,
      functionCalls: response.functionCalls
    };
  } catch (error) {
    console.error(error);
    return { text: "Sincronização neural instável. Tente novamente." };
  }
};