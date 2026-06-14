// Vercel serverless function: Groq proxy for Internet Detective.
// Holds the GROQ_API_KEY server-side so the extension never ships a secret.
// Returns an Ollama-compatible shape: { response: "<json string>" }.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GROQ_API_KEY." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }
  }

  const prompt = body && body.prompt;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing 'prompt' in request body." });
    return;
  }

  const temperature = typeof body.temperature === "number" ? body.temperature : 0.2;
  const maxTokens = typeof body.maxTokens === "number" ? body.maxTokens : 1200;
  const model = typeof body.model === "string" && body.model ? body.model : DEFAULT_MODEL;

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      })
    });

    if (!groqRes.ok) {
      const detail = await groqRes.text();
      res.status(groqRes.status).json({ error: `Groq error ${groqRes.status}: ${detail.slice(0, 500)}` });
      return;
    }

    const data = await groqRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    res.status(200).json({ response: content, model });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error." });
  }
}
