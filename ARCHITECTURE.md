# Architecture

Spectra uses a structured intelligence pipeline instead of direct page summarization.

```text
Content script
  -> normalized LinkedIn profile JSON
  -> signal extraction engine        (local)
  -> scoring engine                  (local)
  -> LLM insight + outreach          (hosted Groq proxy OR local Ollama)
  -> side panel dashboard
  -> IndexedDB
```

## Extension Surfaces

- `src/content`: LinkedIn page detection and visible DOM extraction.
- `src/background`: message routing, analysis orchestration, LLM client (hosted + Ollama), email finder.
- `src/intelligence`: deterministic signals, scores, and prompts.
- `src/storage`: local IndexedDB persistence.
- `src/ui/popup`: launcher and quick score summary.
- `src/ui/sidepanel`: main intelligence dashboard, outreach builder, email finder.
- `src/ui/options`: backend selection, identity, email finder key, and data controls.
- `server`: Vercel serverless Groq proxy (`api/analyze.js`, `api/health.js`).

## LLM Backends

- **Hosted (default):** `background` → `https://internet-detective-proxy.vercel.app/api/analyze` → Groq (Llama 3.3 70B). The `GROQ_API_KEY` is held server-side in the Vercel function and never ships in the extension.
- **Local Ollama:** `background` → `http://localhost:11434/api/generate` → local model. Nothing leaves the machine.

## Privacy Boundary

Deterministic scoring is always local. In hosted mode, visible profile text is sent to the Spectra proxy for LLM generation; in Ollama mode, all inference is local. See `PRIVACY.md`.
