// api/generate.js
// Secure server-side proxy for Gemini API calls
// Runs on Vercel or Netlify (Node.js environment)

const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
  // --- 1. Handle CORS & Preflight ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Preflight request → return 200 with no body
    return res.status(200).end();
  }

  // --- 2. Only allow POST requests ---
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // --- 3. Securely read API key from environment ---
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    // --- 4. Initialize the Gemini client ---
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // --- 5. Parse incoming payload ---
    const { systemInstruction, userQuery } = req.body || {};
    if (!userQuery) {
      return res.status(400).json({ error: 'Missing userQuery' });
    }

    // --- 6. Generate content using Gemini ---
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: userQuery }] }
      ],
      systemInstruction: {
        parts: [{ text: systemInstruction || "You are a helpful assistant." }]
      }
    });

    // --- 7. Extract the text output ---
    const text = result?.response?.text() || "No response received.";

    // --- 8. Return clean text ---
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(text);

  } catch (error) {
    console.error("❌ Error in /api/generate:", error);
    return res.status(500).json({
      error: "Error processing your request",
      details: error.message
    });
  }
}
