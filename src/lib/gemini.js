import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isGeminiConfigured = !!(apiKey && apiKey !== 'your_gemini_api_key');

let ai = null;
if (isGeminiConfigured) {
  ai = new GoogleGenAI({ apiKey });
}

/**
 * Analyzes an issue photo using Gemini 2.5 Flash and generates structured report data.
 * @param {string} base64Data - Base64 encoded image data (without data:image/...;base64, prefix)
 * @param {string} mimeType - The MIME type of the image (e.g. image/jpeg, image/png)
 * @param {string} issueType - Selected category of the issue
 * @param {string} locationDetails - Landmarks and specific details
 * @param {string} zone - The municipal ward / sector name
 * @returns {Promise<{isValid: boolean, severity: string, description: string, letterDraft: string}>}
 */
export async function analyzeIssueImage(base64Data, mimeType, issueType, locationDetails, zone) {
  if (!isGeminiConfigured) {
    throw new Error('Gemini API is not configured. Environment key missing.');
  }

  const prompt = `
You are CiviFix AI, a civic monitoring assistant for Thalassery Municipality, Kerala, India.
Analyze the attached image which is reported as a "${issueType}" at "${locationDetails}" in the ward "${zone}".

Please perform the following steps:
1. Verify if the image shows a valid public infrastructure or environmental issue (like road potholes, flooding, garbage, open drainage, broken streetlights). Set isValid to true if it matches a civic issue, or false if it is unrelated (e.g., random indoor photos, people, documents, etc.).
2. Determine the severity level. Use one of these three: "low", "warning", or "critical". For example, deep potholes or heavy waterlogging is critical.
3. Provide a concise, clear description of the observed civic issue (under 2 sentences) in monospace-friendly wording.
4. Draft a formal grievance letter addressed to the appropriate authority in Thalassery (e.g. Municipal Commissioner, PWD Engineer, or Health Inspector). The letter must follow standard Indian official correspondence style, include the reference ID in #CF-XXXX format (generate a random 4-digit number), and state the category and location. Use Celsius for temperatures and metric units (cm, meter) for any dimensions if relevant.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            isValid: { type: 'BOOLEAN' },
            severity: { type: 'STRING', enum: ['low', 'warning', 'critical'] },
            description: { type: 'STRING' },
            letterDraft: { type: 'STRING' }
          },
          required: ['isValid', 'severity', 'description', 'letterDraft']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('No content returned from Gemini');
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Error invoking Gemini Vision API:', error);
    throw error;
  }
}

export { isGeminiConfigured };
