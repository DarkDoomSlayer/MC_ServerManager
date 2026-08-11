"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Server as ServerIcon, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateServer() {
  const router = useRouter();
  const [type, setType] = useState<"java" | "bedrock">("java");
  const [engine, setEngine] = useState("PAPER");
  const [name, setName] = useState("");
  const [port, setPort] = useState("25565");
  const [version, setVersion] = useState("1.20.4");
  const [modpackUrl, setModpackUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [javaVersions, setJavaVersions] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/versions/java')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setJavaVersions(data);
          setVersion(data[0]); // Default to latest
        }
      })
      .catch(err => console.error("Failed to load versions:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, engine, modpackUrl, name, port: parseInt(port), version })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to install server');

      router.push('/');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/minecraft_bg.png')] bg-cover bg-center bg-fixed text-white font-sans flex flex-col items-center py-12 relative">
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" />
      <div className="w-full max-w-2xl px-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Lobby
        </Link>

        <div className="bg-neutral-900/70 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-8 shadow-2xl">
          <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Create New Server</h1>
          <p className="text-neutral-400 mb-8 text-sm">Deploy an isolated Minecraft server container.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Server Platform</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setType("java"); setPort("25565"); }}
                  className={`flex-1 py-3.5 rounded-2xl font-semibold transition-all ${type === "java" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30" : "bg-neutral-950/80 text-neutral-400 border border-neutral-800 hover:bg-neutral-800"}`}
                >
                  Java Edition
                </button>
                <button
                  type="button"
                  onClick={() => { setType("bedrock"); setPort("19132"); }}
                  className={`flex-1 py-3.5 rounded-2xl font-semibold transition-all ${type === "bedrock" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30" : "bg-neutral-950/80 text-neutral-400 border border-neutral-800 hover:bg-neutral-800"}`}
                >
                  Bedrock Edition
                </button>
              </div>
            </div>

            {type === "java" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Engine / Loader</label>
                <select
                  value={engine}
                  onChange={e => setEngine(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                >
                  <option value="VANILLA">Vanilla</option>
                  <option value="PAPER">Paper (Plugins)</option>
                  <option value="FORGE">Forge (Mods)</option>
                  <option value="FABRIC">Fabric (Mods)</option>
                  <option value="AUTO_CURSEFORGE">CurseForge Modpack</option>
                </select>
              </div>
            )}

            {engine === "AUTO_CURSEFORGE" && type === "java" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Modpack ZIP URL</label>
                <input
                  required
                  type="url"
                  value={modpackUrl}
                  onChange={e => setModpackUrl(e.target.value)}
                  placeholder="https://mediafilez.forgecdn.net/files/.../modpack.zip"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Server Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Survival SMP"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Version</label>
                {type === 'java' && javaVersions.length > 0 ? (
                  <select
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                  >
                    {javaVersions.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    type="text"
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    placeholder={type === 'java' ? "Loading versions..." : "e.g. 1.21.132.3"}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Port</label>
                <input
                  required
                  type="number"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-950/50 disabled:opacity-50 mt-8"
            >
              {loading ? "Deploying..." : <><Download className="w-5 h-5" /> Deploy Server</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
