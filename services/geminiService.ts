
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

// Função para obter o cliente AI garantindo que a chave esteja presente
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não configurada no ambiente.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeSurfVideo = async (videoBase64: string, mimeType: string): Promise<AnalysisResult> => {
  const ai = getAIClient();
  const model = 'gemini-3-flash-preview';

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          text: `You are a professional WSL Head Coach. Analyze this surf clip for professional biomechanics. 
          Identify the overall score (0-10), analyze posture (shoulders, chest, rotation), flow/power telemetry (10 points over time), 
          detect maneuvers, and provide 3 specific drills to improve. 
          The output MUST be in valid JSON.`,
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
    throw new Error("Empty response from AI");
  }

  return JSON.parse(response.text) as AnalysisResult;
};
