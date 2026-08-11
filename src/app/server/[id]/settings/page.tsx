"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Folder, HardDrive, Sliders, Users, Globe, ArrowLeft, Upload, Trash2, Shield, UserMinus, Map, ExternalLink } from "lucide-react";
import RotatingBackground from "../../../components/RotatingBackground";

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
}

interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
}

export default function ServerSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"files" | "backups" | "config" | "players" | "map" | "tunnel">("files");
  const [server, setServer] = useState<any>(null);

  // Files state
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("mods");
  const [uploading, setUploading] = useState(false);

  // Backups state
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Config state
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  // Players state
  const [playerData, setPlayerData] = useState<{ online: number; max: number; players: any[] }>({ online: 0, max: 20, players: [] });

  // Tunnel state
  const [tunnelInfo, setTunnelInfo] = useState<{ status: string; claimUrl: string | null; logs: string }>({ status: 'stopped', claimUrl: null, logs: '' });
  const [tunnelLoading, setTunnelLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/servers/${id}`)
      .then(res => res.json())
      .then(data => setServer(data));

    loadFiles("mods");
    loadBackups();
    loadProperties();
    loadPlayers();
    loadTunnel();
  }, [id]);

  // ---------------- FILES HANDLERS ----------------
  const loadFiles = async (pathStr: string) => {
    try {
      const res = await fetch(`/api/servers/${id}/files?path=${encodeURIComponent(pathStr)}`);
      const data = await res.json();
      setFiles(data);
      setCurrentPath(pathStr);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    formData.append("path", currentPath);

    try {
      await fetch(`/api/servers/${id}/files/upload`, { method: "POST", body: formData });
      loadFiles(currentPath);
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;
    await fetch(`/api/servers/${id}/files/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: `${currentPath}/${fileName}` })
    });
    loadFiles(currentPath);
  };

  const handleToggleFile = async (fileName: string) => {
    const isDisabled = fileName.endsWith(".disabled");
    const newName = isDisabled ? fileName.replace(".disabled", "") : `${fileName}.disabled`;
    await fetch(`/api/servers/${id}/files/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath: `${currentPath}/${fileName}`, newPath: `${currentPath}/${newName}` })
    });
    loadFiles(currentPath);
  };

  // ---------------- BACKUPS HANDLERS ----------------
  const loadBackups = async () => {
    try {
      const res = await fetch(`/api/servers/${id}/backups`);
      const data = await res.json();
      setBackups(data);
    } catch (e) {}
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      await fetch(`/api/servers/${id}/backups/create`, { method: "POST" });
      loadBackups();
    } catch (e) {}
    setCreatingBackup(false);
  };

  const handleDeleteBackup = async (fileName: string) => {
    if (!confirm(`Delete backup ${fileName}?`)) return;
    await fetch(`/api/servers/${id}/backups/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName })
    });
    loadBackups();
  };

  // ---------------- CONFIG HANDLERS ----------------
  const loadProperties = async () => {
    try {
      const res = await fetch(`/api/servers/${id}/config/properties`);
      const data = await res.json();
      setProperties(data);
    } catch (e) {}
  };

  const handleSaveProperties = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage("");
    try {
      await fetch(`/api/servers/${id}/config/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties })
      });
      setConfigMessage("Settings saved successfully!");
    } catch (e) {
      setConfigMessage("Failed to save settings.");
    }
    setSavingConfig(false);
  };

  // ---------------- PLAYERS HANDLERS ----------------
  const loadPlayers = async () => {
    try {
      const res = await fetch(`/api/servers/${id}/players`);
      const data = await res.json();
      setPlayerData(data);
    } catch (e) {}
  };

  const handlePlayerAction = async (action: string, playerName: string) => {
    await fetch(`/api/servers/${id}/players/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, playerName })
    });
    setTimeout(loadPlayers, 1000);
  };

  // ---------------- TUNNEL HANDLERS ----------------
  const loadTunnel = async () => {
    try {
      const res = await fetch(`/api/tunnel/status`);
      const data = await res.json();
      setTunnelInfo(data);
    } catch (e) {}
  };

  const handleToggleTunnel = async () => {
    setTunnelLoading(true);
    const endpoint = tunnelInfo.status === 'running' ? '/api/tunnel/stop' : '/api/tunnel/start';
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setTunnelInfo(data);
    } catch (e) {}
    setTunnelLoading(false);
  };

  if (!server) return <div className="min-h-screen bg-neutral-950 text-white p-10 flex items-center justify-center">Loading...</div>;

  const mapUrl = `http://localhost:${server.mapPort || 8123}`;

  return (
    <div className="min-h-screen text-neutral-100 font-sans p-8 relative overflow-x-hidden">
      <RotatingBackground />

      <div className="max-w-5xl mx-auto relative z-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <img src="/grass_block.png" alt="Grass block" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-3xl font-extrabold font-pixel text-white tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{server.name} Management</h1>
                <p className="text-xs text-neutral-400 capitalize font-mono">{server.type} • Port {server.port}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-neutral-800/80 mb-8 overflow-x-auto pb-2 font-pixel">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-xs transition-colors ${activeTab === "files" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-neutral-900/80 text-neutral-400 hover:text-white backdrop-blur-md"}`}
          >
            <Folder className="w-4 h-4" /> Mods & Files
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-xs transition-colors ${activeTab === "map" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-neutral-900/80 text-neutral-400 hover:text-white backdrop-blur-md"}`}
          >
            <Map className="w-4 h-4" /> Live Map (Dynmap)
          </button>
          <button
            onClick={() => setActiveTab("backups")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-xs transition-colors ${activeTab === "backups" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-neutral-900/80 text-neutral-400 hover:text-white backdrop-blur-md"}`}
          >
            <HardDrive className="w-4 h-4" /> Backups
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-xs transition-colors ${activeTab === "config" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-neutral-900/80 text-neutral-400 hover:text-white backdrop-blur-md"}`}
          >
            <Sliders className="w-4 h-4" /> Server Properties
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-xs transition-colors ${activeTab === "players" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-neutral-900/80 text-neutral-400 hover:text-white backdrop-blur-md"}`}
          >
            <Users className="w-4 h-4" /> Players ({playerData.online})
          </button>
          <button
            onClick={() => setActiveTab("tunnel")}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium text-xs transition-colors ${activeTab === "tunnel" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/50" : "bg-neutral-900/80 text-neutral-400 hover:text-white backdrop-blur-md"}`}
          >
            <Globe className="w-4 h-4" /> Remote Tunnel
          </button>
        </div>

        {/* Tab: Live Map */}
        {activeTab === "map" && (
          <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white font-pixel flex items-center gap-2">
                  <Map className="w-5 h-5 text-indigo-400" /> REAL-TIME LIVE MAP (DYNMAP / BLUEMAP)
                </h3>
                <p className="text-xs text-neutral-400 font-pixel">See player positions and world terrain in real time.</p>
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-pixel font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
              >
                Open in Full Window <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="w-full h-[600px] rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950 relative">
              <iframe
                src={mapUrl}
                className="w-full h-full border-none"
                title="Dynmap Live Map"
              />
            </div>
          </div>
        )}

        {/* Tab 1: Mods & Files */}
        {activeTab === "files" && (
          <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/80 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
              <div className="flex gap-3">
                {["", "mods", "plugins"].map((folder) => (
                  <button
                    key={folder}
                    onClick={() => loadFiles(folder)}
                    className={`px-4 py-2 rounded-xl text-xs font-pixel capitalize ${currentPath === folder ? 'bg-indigo-600 text-white' : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-700'}`}
                  >
                    {folder || "Root"}
                  </button>
                ))}
              </div>
              <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-pixel font-semibold flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload File"}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
            <div className="divide-y divide-neutral-800">
              {files.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 font-pixel">Folder is empty.</div>
              ) : (
                files.map((f) => (
                  <div key={f.name} className="p-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors">
                    <span className={`font-medium text-sm ${f.name.endsWith('.disabled') ? 'text-neutral-500 line-through' : 'text-neutral-200'}`}>
                      {f.isDirectory ? "📁" : "📄"} {f.name}
                    </span>
                    {!f.isDirectory && (
                      <div className="flex gap-2 font-pixel">
                        {(f.name.endsWith('.jar') || f.name.endsWith('.disabled')) && (
                          <button
                            onClick={() => handleToggleFile(f.name)}
                            className={`px-3 py-1 rounded-lg text-xs ${f.name.endsWith('.disabled') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
                          >
                            {f.name.endsWith('.disabled') ? "Enable" : "Disable"}
                          </button>
                        )}
                        <button onClick={() => handleDeleteFile(f.name)} className="p-1 text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Backups */}
        {activeTab === "backups" && (
          <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-pixel text-white">WORLD & SERVER BACKUPS</h3>
                <p className="text-xs text-neutral-400 font-pixel">Create compressed .zip archives of your server data.</p>
              </div>
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-pixel transition-colors disabled:opacity-50"
              >
                {creatingBackup ? "Compressing..." : "Create Backup (.zip)"}
              </button>
            </div>
            <div className="space-y-3">
              {backups.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 font-pixel">No backups found.</div>
              ) : (
                backups.map((b) => (
                  <div key={b.name} className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex justify-between items-center">
                    <div>
                      <h4 className="font-mono text-xs font-semibold">{b.name}</h4>
                      <p className="text-xs text-neutral-500 font-mono">{(b.size / (1024 * 1024)).toFixed(2)} MB • {new Date(b.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDeleteBackup(b.name)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Config Editor */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveProperties} className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold font-pixel text-white">SERVER.PROPERTIES EDITOR</h3>
                <p className="text-xs text-neutral-400 font-pixel">Modify Minecraft server settings.</p>
              </div>
              <button type="submit" disabled={savingConfig} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel rounded-xl text-xs transition-colors">
                {savingConfig ? "Saving..." : "Save Properties"}
              </button>
            </div>
            {configMessage && <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-pixel">{configMessage}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              {["gamemode", "difficulty", "max-players", "pvp", "allow-flight", "online-mode", "motd"].map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-pixel text-neutral-400 uppercase">{key}</label>
                  <input
                    type="text"
                    value={properties[key] || ""}
                    onChange={(e) => setProperties({ ...properties, [key]: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              ))}
            </div>
          </form>
        )}

        {/* Tab 4: Players */}
        {activeTab === "players" && (
          <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-pixel text-white">CONNECTED PLAYERS</h3>
                <p className="text-xs text-neutral-400 font-pixel">{playerData.online} / {playerData.max} players online</p>
              </div>
              <button onClick={loadPlayers} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-pixel rounded-xl">Refresh</button>
            </div>

            <div className="space-y-3">
              {playerData.players.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 font-pixel">No players connected right now.</div>
              ) : (
                playerData.players.map((p: any) => (
                  <div key={p.name || p} className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between">
                    <span className="font-semibold text-xs text-neutral-200">{p.name || p}</span>
                    <div className="flex gap-2 font-pixel">
                      <button onClick={() => handlePlayerAction('op', p.name || p)} className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs flex items-center gap-1">
                        <Shield className="w-3 h-3" /> OP
                      </button>
                      <button onClick={() => handlePlayerAction('kick', p.name || p)} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs flex items-center gap-1">
                        <UserMinus className="w-3 h-3" /> Kick
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Remote Tunnel */}
        {activeTab === "tunnel" && (
          <div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold font-pixel text-white">PLAYIT.GG REMOTE TUNNEL</h3>
                <p className="text-xs text-neutral-400 font-pixel">Expose your local servers to the Internet for free.</p>
              </div>
              <button
                onClick={handleToggleTunnel}
                disabled={tunnelLoading}
                className={`px-5 py-2.5 rounded-xl font-semibold text-xs font-pixel transition-colors ${tunnelInfo.status === 'running' ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
              >
                {tunnelLoading ? "Processing..." : tunnelInfo.status === 'running' ? "Stop Tunnel" : "Start Tunnel"}
              </button>
            </div>

            {tunnelInfo.claimUrl && (
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl font-pixel">
                <p className="text-xs text-indigo-400 font-semibold mb-1">Claim your tunnel account:</p>
                <a href={tunnelInfo.claimUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 underline font-mono break-all">
                  {tunnelInfo.claimUrl}
                </a>
              </div>
            )}

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono text-xs text-neutral-400 h-48 overflow-y-auto whitespace-pre-wrap">
              {tunnelInfo.logs || "Tunnel agent is offline."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
