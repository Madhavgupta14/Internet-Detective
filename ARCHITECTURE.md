# Architecture

Internet Detective uses a structured intelligence pipeline instead of direct page summarization.

```text
Content script
  -> normalized LinkedIn profile JSON
  -> signal extraction engine
  -> scoring engine
  -> local Ollama explanation
  -> side panel dashboard
  -> IndexedDB
```

## Extension Surfaces

- `src/content`: LinkedIn page detection and visible DOM extraction.
- `src/background`: message routing, analysis orchestration, and Ollama calls.
- `src/intelligence`: deterministic signals, scores, and prompts.
- `src/storage`: local IndexedDB persistence.
- `src/ui/popup`: launcher and quick score summary.
- `src/ui/sidepanel`: main intelligence dashboard.
- `src/ui/options`: local model settings and data controls.

## Privacy Boundary

The only network calls are to the local Ollama endpoint configured by the user. Page data is not sent to hosted APIs.
