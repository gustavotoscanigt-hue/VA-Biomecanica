
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeSurfVideo = async (videoBase64: string, mimeType: string): Promise<AnalysisResult> => {
  // Inicialização obrigatória dentro da função conforme diretrizes
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Upgrade para Pro para análise biomecânica de alta complexidade
  const modelName = 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          text: `You are a professional WSL (World Surf League) Head Coach and Biomechanics Expert. 
          Analyze this surf footage in detail. 
          1. Evaluate overall performance (0-10).
          2. Provide a technical summary of the wave.
          3. Rate posture metrics: shoulders, chest, hips, rotation, and knee flex (all 0-10).
          4. Generate 10 data points of flow and power telemetry.
          5. Detect all maneuvers performed.
          6. Suggest 3 elite-level drills to correct flaws.
          
          Return the data STRICTLY as JSON.`,
        },
        {
          inlineData: {
            data: videoBase64,
            mimeType: mimeType,
          },
        },
      ],
    },
    config: {
      // Ativação do modo de raciocínio para análise de vídeo
      thinkingConfig: { thinkingBudget: 16000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          posture: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                value: { type: Type.NUMBER },
                fullMark: { type: Type.NUMBER },
              },
              required: ["subject", "value", "fullMark"],
            },
          },
          telemetry: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                flow: { type: Type.NUMBER },
                power: { type: Type.NUMBER },
              },
              required: ["time", "flow", "power"],
            },
          },
          maneuvers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                name: { type: Type.STRING },
                execution: { type: Type.NUMBER },
              },
              required: ["time", "name", "execution"],
            },
          },
          drills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                focus: { type: Type.STRING },
              },
              required: ["title", "description", "focus"],
            },
          },
        },
        required: ["score", "summary", "posture", "telemetry", "maneuvers", "drills"],
      },
    },
  });

  if (!response.text) {
    throw new Error("A IA não retornou conteúdo. O vídeo pode ter sido bloqueado ou é muito curto.");
  }

  try {
    return JSON.parse(response.text) as AnalysisResult;
  } catch (e) {
    console.error("Erro ao parsear JSON da IA:", response.text);
    throw new Error("A resposta da IA não está no formato esperado.");
  }
};
