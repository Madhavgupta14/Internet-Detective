# Privacy

Spectra analyzes visible content on supported LinkedIn profile pages. It does not collect credentials, cookies, private messages, or hidden page data.

## What stays local always

- Deterministic signal extraction and scoring run entirely in the browser.
- Analysis results, settings, and uploaded resumes are stored locally via IndexedDB.
- Resume files are parsed locally in the browser.
- Users can delete all local data from the options page.
- No tracking. No analytics.

## LLM generation (written insight and outreach)

Spectra offers two backends for generating written insight and outreach copy:

- **Hosted cloud (default):** The visible profile text and any context you provide are sent to the Spectra proxy (a Vercel serverless function) which forwards the request to Groq for inference. No data is stored on the server; requests are processed and returned. Use this mode for zero-setup, high-accuracy results.
- **Local Ollama:** All inference happens on the user's own machine. Nothing leaves the device. Use this mode for fully private analysis.

You can switch backends at any time in Settings. The deterministic scores are identical in both modes because they are computed locally.

## Email finder

The email finder generates likely address patterns locally. If you add a Hunter.io API key, name and company domain are sent to Hunter.io to verify addresses. This is optional and off unless you provide a key.
