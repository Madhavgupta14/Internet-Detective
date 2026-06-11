# Internet Detective

Internet Detective is a privacy-first Chrome extension that transforms public website information into structured intelligence. The MVP focuses on LinkedIn profiles and runs reasoning locally through Ollama.

## MVP

- Chrome Extension Manifest V3
- React, TypeScript, Tailwind CSS
- LinkedIn profile extraction from visible page content
- Deterministic signal extraction and scoring
- Local Ollama integration for insight explanations and outreach
- Local IndexedDB persistence
- No OpenAI, Anthropic, analytics, tracking, or cloud storage

## Local Development

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

Package the extension for distribution:

```bash
npm run package
```

The packaged ZIP is written to:

```text
release/internet-detective-extension.zip
```

Load the built extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select the `dist` folder.

## Ollama

Default endpoint:

```text
http://localhost:11434
```

Default model:

```text
qwen3:0.6b
```

The extension still shows deterministic scores if Ollama is unavailable. Local LLM generation is used only for explanations and outreach copy.

Each user who wants AI-generated explanations and outreach must run Ollama locally and pull the configured model:

```bash
ollama pull qwen3:0.6b
```

### Allow the Chrome extension origin

If Ollama returns `HTTP 403` from the extension, Ollama is blocking the deployed Chrome extension origin. Configure `OLLAMA_ORIGINS` with the installed extension ID, then restart Ollama.

Find the extension ID in `chrome://extensions`, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/configure-ollama-origins.ps1 -ExtensionId YOUR_EXTENSION_ID
```

The script sets:

```text
chrome-extension://YOUR_EXTENSION_ID,http://localhost:*,http://127.0.0.1:*
```

Without a local model, Internet Detective falls back to deterministic scoring and a local outreach template.
