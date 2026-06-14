// Lightweight health/status endpoint for the extension's "Check" button.
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    ok: true,
    service: "internet-detective-groq-proxy",
    hasKey: Boolean(process.env.GROQ_API_KEY),
    hasHunterKey: Boolean(process.env.HUNTER_API_KEY),
    model: "llama-3.3-70b-versatile"
  });
}
