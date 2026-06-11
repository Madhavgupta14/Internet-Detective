import { CheckCircle2, DatabaseZap, PlugZap, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppSettings } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/constants";
import "../shared/index.css";
import { Button, StatusLine } from "../shared/components";
import { sendMessage } from "../shared/runtime";

function Options() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    sendMessage<AppSettings>({ type: "GET_SETTINGS" })
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load settings."));
  }, []);

  async function save() {
    setError("");
    await sendMessage<AppSettings>({ type: "SAVE_SETTINGS", settings });
    setStatus("Settings saved");
  }

  async function checkConnection() {
    setError("");
    setStatus("");
    try {
      const result = await sendMessage<{ available: boolean; models: string[] }>({ type: "CHECK_OLLAMA" });
      setModels(result.models);
      setStatus(result.available ? "Ollama is reachable" : "Ollama is not reachable");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ollama check failed.");
    }
  }

  async function deleteData() {
    setError("");
    await sendMessage<{ deleted: boolean }>({ type: "DELETE_ALL_DATA" });
    setStatus("Local data deleted");
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="border-b border-ink/10 pb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Internet Detective</div>
        <h1 className="mt-2 text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-ink/65">Local model configuration and local data controls.</p>
      </header>

      <div className="py-5">
        {error ? <StatusLine error={error} /> : null}
        {status ? (
          <div className="flex items-center gap-2 text-sm text-moss">
            <CheckCircle2 className="h-4 w-4" />
            <span>{status}</span>
          </div>
        ) : null}
      </div>

      <section className="border-b border-ink/10 pb-6">
        <h2 className="text-sm font-semibold">Ollama</h2>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Endpoint</span>
            <input
              className="h-10 rounded-md border border-ink/15 bg-white px-3"
              onChange={(event) => setSettings({ ...settings, ollamaUrl: event.target.value })}
              value={settings.ollamaUrl}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Model</span>
            <input
              className="h-10 rounded-md border border-ink/15 bg-white px-3"
              onChange={(event) => setSettings({ ...settings, model: event.target.value })}
              value={settings.model}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={settings.enableLlm}
              className="h-4 w-4 accent-signal"
              onChange={(event) => setSettings({ ...settings, enableLlm: event.target.checked })}
              type="checkbox"
            />
            <span>Generate explanations and outreach with local LLM</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button onClick={checkConnection} variant="secondary">
              <PlugZap className="h-4 w-4" />
              Check
            </Button>
          </div>
          {models.length > 0 ? (
            <div className="text-sm text-ink/65">
              Available models: <span className="text-ink">{models.join(", ")}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="py-6">
        <h2 className="text-sm font-semibold">Local Data</h2>
        <p className="mt-2 text-sm leading-6 text-ink/65">Deletes analyses and settings from this browser profile only.</p>
        <div className="mt-4">
          <Button onClick={deleteData} variant="danger">
            <DatabaseZap className="h-4 w-4" />
            Delete Data
          </Button>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);
