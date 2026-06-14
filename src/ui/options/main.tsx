import { CheckCircle2, Cloud, DatabaseZap, Mail, MonitorSmartphone, PlugZap, Save, User } from "lucide-react";
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
      const target = settings.backend === "hosted" ? "Analysis service" : "Ollama";
      setStatus(result.available ? `${target} is reachable` : `${target} is not reachable`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection check failed.");
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
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Spectra</div>
        <h1 className="mt-2 text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-ink/65">Choose how analysis runs, personalise outreach, and manage local data.</p>
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
        <h2 className="text-sm font-semibold">Analysis engine</h2>
        <p className="mt-1 text-xs leading-5 text-ink/55">Hosted cloud is fastest and most accurate with no setup. Local Ollama keeps everything fully private on your machine.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className={`flex items-center gap-2 rounded-md border px-3 py-3 text-left text-sm transition ${
              settings.backend === "hosted" ? "border-signal bg-signal/5" : "border-ink/15 bg-white hover:border-signal/40"
            }`}
            onClick={() => setSettings({ ...settings, backend: "hosted" })}
            type="button"
          >
            <Cloud className="h-4 w-4 shrink-0 text-signal" />
            <span>
              <span className="block font-medium">Hosted cloud</span>
              <span className="block text-xs text-ink/55">Llama 3.3 70B · no setup</span>
            </span>
          </button>
          <button
            className={`flex items-center gap-2 rounded-md border px-3 py-3 text-left text-sm transition ${
              settings.backend === "ollama" ? "border-signal bg-signal/5" : "border-ink/15 bg-white hover:border-signal/40"
            }`}
            onClick={() => setSettings({ ...settings, backend: "ollama" })}
            type="button"
          >
            <MonitorSmartphone className="h-4 w-4 shrink-0 text-signal" />
            <span>
              <span className="block font-medium">Local Ollama</span>
              <span className="block text-xs text-ink/55">Fully private · needs install</span>
            </span>
          </button>
        </div>

        <div className="mt-4 grid gap-4">
          {settings.backend === "hosted" ? (
            <label className="grid gap-2 text-sm">
              <span className="font-medium">API endpoint</span>
              <input
                className="h-10 rounded-md border border-ink/15 bg-white px-3 font-mono text-xs"
                onChange={(event) => setSettings({ ...settings, apiEndpoint: event.target.value })}
                placeholder="https://your-deployment.vercel.app"
                value={settings.apiEndpoint}
              />
              <span className="text-xs text-ink/45">The hosted analysis service. Leave as default unless you self-host.</span>
            </label>
          ) : (
            <>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Ollama endpoint</span>
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
            </>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              checked={settings.enableLlm}
              className="h-4 w-4 accent-signal"
              onChange={(event) => setSettings({ ...settings, enableLlm: event.target.checked })}
              type="checkbox"
            />
            <span>Generate written explanations and outreach copy</span>
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
              {settings.backend === "hosted" ? "Model" : "Available models"}: <span className="text-ink">{models.join(", ")}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-b border-ink/10 py-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <User className="h-4 w-4 text-signal" />
          Your identity
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink/55">Used to personalise outreach copy. Stored locally only.</p>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Your name</span>
            <input
              className="h-10 rounded-md border border-ink/15 bg-white px-3"
              onChange={(event) => setSettings({ ...settings, senderName: event.target.value })}
              placeholder="e.g. Madhav"
              value={settings.senderName ?? ""}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Your role / company</span>
            <input
              className="h-10 rounded-md border border-ink/15 bg-white px-3"
              onChange={(event) => setSettings({ ...settings, senderRole: event.target.value })}
              placeholder="e.g. Founder at Acme"
              value={settings.senderRole ?? ""}
            />
          </label>
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </section>

      <section className="border-b border-ink/10 py-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4 text-signal" />
          Email finder
        </h2>
        <p className="mt-1 text-xs leading-5 text-ink/55">
          Optional Hunter.io API key to verify email addresses. Without it, pattern-based guesses are generated for free.{" "}
          <a className="text-signal underline" href="https://hunter.io/api-keys" rel="noreferrer" target="_blank">
            Get a free key →
          </a>
        </p>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Hunter.io API key</span>
            <input
              className="h-10 rounded-md border border-ink/15 bg-white px-3 font-mono text-xs"
              onChange={(event) => setSettings({ ...settings, hunterApiKey: event.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              type="password"
              value={settings.hunterApiKey ?? ""}
            />
          </label>
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Save
          </Button>
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
