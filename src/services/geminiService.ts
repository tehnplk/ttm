import { GoogleGenAI, Type } from "@google/genai";
import { SERVICES } from "../constants";

// Ideally, this is server-side, but for this demo SPA, we do it client-side.
// WARNING: API_KEY must be in process.env.API_KEY
const apiKey = process.env.API_KEY || ''; 

export const getServiceRecommendation = async (userSymptom: string): Promise<{ recommendedServiceId: string; reasoning: string } | null> => {
  if (!apiKey) {
    console.warn("No API Key provided for Gemini.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct a list of services for the prompt
    const serviceList = SERVICES.map(s => `- ID: ${s.id}, Name: ${s.name}, Description: ${s.description}`).join('\n');

    const prompt = `
      User Symptom: "${userSymptom}"
      
      Available Services:
      ${serviceList}

      Based on the user's symptom, recommend the single best service ID from the list above.
      Provide a short, friendly reasoning in Thai language (max 2 sentences).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedServiceId: { type: Type.STRING },
            reasoning: { type: Type.STRING },
          },
          required: ["recommendedServiceId", "reasoning"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return null;
    
    return JSON.parse(resultText);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};
