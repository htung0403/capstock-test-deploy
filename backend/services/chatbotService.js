/*
  File: services/chatbotService.js
  Feature: AUTO MODEL FALLBACK for Gemini API
*/

require("dotenv").config();
const fetch = require("node-fetch");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error("Missing GEMINI_API_KEY");

// List of models to try in order (fallback sequence)
const MODEL_LIST = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-pro-vision"
];

// Auto language detection
function detectLanguage(text) {
  const vi = /[àáạảãâầấậẩẫăằắặẳẵđèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i;
  const ja = /[\u3040-\u30FF]/;
  const zh = /[\u4E00-\u9FFF]/;
  const ko = /[\uAC00-\uD7AF]/;

  if (vi.test(text)) return "vi";
  if (ja.test(text)) return "ja";
  if (zh.test(text)) return "zh";
  if (ko.test(text)) return "ko";
  return "en";
}

const SYSTEM_PROMPT = `
You are CapStock AI assistant.
Always answer in the user’s language.
Be helpful and accurate.
`;

// TRY CALLING EACH MODEL UNTIL ONE WORKS
async function tryModel(modelName, finalPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: finalPrompt }]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      // If model not found → skip & return null to test next model
      if (data.error?.status === "NOT_FOUND") {
        console.log(`❌ Model not available: ${modelName}`);
        return null;
      }

      console.log(`⚠️ Model error (${modelName}):`, data);
      return null;
    }

    console.log(`✅ Model used: ${modelName}`);

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI returned empty response."
    );
  } catch (err) {
    console.log(`⚠️ Request failed for ${modelName}:`, err);
    return null;
  }
}

exports.sendMessage = async (message, context = "") => {
  try {
    const lang = detectLanguage(message);

    const langMap = {
      vi: "Hãy trả lời bằng tiếng Việt.",
      en: "Please reply in English.",
      ja: "日本語で答えてください。",
      zh: "请用中文回答。",
      ko: "한국어로 대답해주세요."
    };

    const finalPrompt = `
${SYSTEM_PROMPT}
${langMap[lang]}

${context ? "Context:\n" + context : ""}

User: ${message}
AI:
    `.trim();

    // Try each model one by one
    for (const model of MODEL_LIST) {
      const result = await tryModel(model, finalPrompt);
      if (result) return result; // success → return
    }

    // If all models failed:
    return "⚠️ All AI models are currently unavailable. Please try again later.";
  } catch (err) {
    console.error("Chatbot fatal error:", err);
    throw new Error("Failed to fetch AI response.");
  }
};
