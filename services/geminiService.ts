
import { GoogleGenAI, Type } from "@google/genai";

export const getSmartInsights = async (userData: any) => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY não configurada no ambiente.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o seguinte perfil de usuário de um app de performance pessoal e forneça 3 insights curtos e impactantes em português.
      Dados:
      - Saldo: R$ ${userData.balance}
      - Tarefas Concluídas: ${userData.tasksCompleted}
      - Streaks de Hábitos: ${userData.habitStreaks}
      - XP Total: ${userData.xp}
      - Gastos em Lazer: R$ ${userData.leisureSpending}
      
      Gere insights interpretativos que cruzem finanças com comportamento.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text.trim()) : [];
  } catch (error) {
    console.error("Erro ao buscar insights:", error);
    return [
      "Sua disciplina financeira está diretamente ligada ao seu foco matinal.",
      "Reduzir pequenos gastos em dias de baixa produtividade pode salvar seu mês.",
      "Você está a 3 dias de atingir um novo patamar de consistência."
    ];
  }
};
