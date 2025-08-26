
import { GoogleGenAI, Type } from "@google/genai";

// Esta função roda no servidor da Vercel, não no navegador do usuário.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageSrc, foodDescription } = req.body;

    if (!imageSrc) {
      return res.status(400).json({ error: 'Image source is required.' });
    }

    // Inicializa a API aqui, usando a Environment Variable segura do servidor.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageSrc.split(',')[1] } },
          { text: `Analise a comida nesta imagem. Descrição do usuário: "${foodDescription || 'Nenhuma'}". Identifique o prato, estime o peso, e forneça os macros TOTAIS e detalhados por ingrediente. Os nomes dos ingredientes e do prato principal devem estar em português do Brasil. Responda apenas com o JSON formatado.` }
        ]},
        config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: { foodName: { type: Type.STRING }, estimatedWeight: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER },
                  ingredients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER } }, required: ["name", "calories", "protein", "carbs", "fat"] } } },
              required: ["foodName", "estimatedWeight", "calories", "protein", "carbs", "fat", "ingredients"]
          }
        }
    });

    // O resultado da API Gemini é um JSON, então parseamos o texto da resposta.
    const analysisResult = JSON.parse(response.text.trim());

    // Enviamos o resultado de volta para o frontend.
    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Error in API route:', error);
    return res.status(500).json({ error: 'An error occurred while analyzing the image.' });
  }
}
