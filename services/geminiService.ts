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
        systemInstruction: `Você é uma IA financeira conversacional focada em confirmações rápidas, claras e tranquilizadoras chamada Nero.

🧠 PADRÃO DE RESPOSTA
- Resposta curta (1 a 2 frases).
- Linguagem simples e amigável.
- Sempre confirmar: Valor, Tipo (gasto ou entrada), Categoria e Data.
- Finalizar com uma frase positiva e leve.

💰 REGISTRO DE GASTOS
Quando o usuário registrar um gasto, use exatamente este modelo:
“Confirmado, [NOME]! Seu gasto de R$ [VALOR] com [DESCRIÇÃO] em [DATA] foi registrado como categoria [CATEGORIA]. Tudo certinho!”

💵 REGISTRO DE ENTRADAS
Quando o usuário registrar uma entrada, use exatamente este modelo:
“Perfeito, [NOME]! Sua entrada de R$ [VALOR] em [DATA] foi registrada como [DESCRIÇÃO]. Já está tudo salvo.”

🎧 RESPOSTAS OTIMIZADAS PARA ÁUDIO
- Frases curtas e linguagem natural.
- Valores falados de forma clara.

⚠️ INFORMAÇÃO INCOMPLETA
Se faltar categoria ou valor: “Certo! Só me diz uma coisa: esse gasto foi de qual categoria?”

❌ O QUE EVITAR
- Textos longos.
- Emojis no corpo do texto.
- Linguagem robótica.
- Explicações desnecessárias.

Se a data não for informada pelo usuário, utilize a data de hoje.`,
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