
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeSurfVideo = async (videoBase64: string, mimeType: string): Promise<AnalysisResult> => {
  // Capturamos a chave no momento da execução para garantir que não esteja vazia
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Por favor, certifique-se de selecionar uma chave no menu lateral ou ao clicar em carregar.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Usando Gemini 3 Flash para garantir velocidade e evitar timeouts
  const modelName = 'gemini-3-flash-preview';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            text: `Professional Surf Coach Analysis Prompt:
            Analyze the provided video for biomechanical performance.
            - Provide an overall score (0.0 to 10.0).
            - Generate 5 posture metrics (shoulders, knees, etc) on a scale of 0-10.
            - Create a flow/power telemetry timeline (10 points).
            - List detected maneuvers.
            - Suggest 3 training drills.
            Return ONLY JSON.`,
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
        thinkingConfig: { thinkingBudget: 0 },
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

    const text = response.text;
    if (!text) throw new Error("A IA não retornou resposta textual.");
    return JSON.parse(text) as AnalysisResult;
  } catch (err: any) {
    if (err.message?.includes('API_KEY_INVALID')) {
      throw new Error("Sua chave de API parece inválida ou não tem permissão para este modelo.");
    }
    throw err;
  }
};
