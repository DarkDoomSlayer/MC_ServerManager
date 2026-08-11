"use client";

import { useEffect, useState } from "react";
import { Play, Square, Terminal as TerminalIcon, Plus, Settings, LogOut, Cpu, HardDrive, Key, ShieldAlert, X, Map } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import RotatingBackground from "./components/RotatingBackground";

export default function Home() {
  const router = useRouter();
  const [servers, setServers] = useState<any[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<string, { cpu: string; memUsage: string; memPerc: string }>>({});
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);

  // Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (!data.authenticated) {
          router.push('/login');
        } else if (data.isDefault) {
          setIsDefaultPassword(true);
        }
      });

    fetch('/api/servers')
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          return [];
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setServers(data);
      });

    const socket = io();
    
    socket.on('status', (data: { id: number, status: string }) => {
      setServers(prev => prev.map(s => s.id === data.id ? { ...s, status: data.status } : s));
    });

    socket.on('metrics', (data: Record<string, { cpu: string; memUsage: string; memPerc: string }>) => {
      setMetricsMap(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const handleStart = async (id: number) => {
    await fetch(`/api/servers/${id}/start`, { method: 'POST' });
  };

  const handleStop = async (id: number) => {
    await fetch(`/api/servers/${id}/stop`, { method: 'POST' });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (newPassword.length < 4) {
      setPassError("Password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setPassSuccess("Password updated successfully!");
      setIsDefaultPassword(false);
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword("");
        setConfirmPassword("");
        setPassSuccess("");
      }, 1500);
    } catch (err: any) {
      setPassError(err.message);
    }
    setPassLoading(false);
  };

  const handleScanServers = async () => {
    try {
      const res = await fetch('/api/servers/scan', { method: 'POST' });
      const data = await res.json();
      if (data.servers) setServers(data.servers);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-indigo-500/30 relative overflow-x-hidden">
      <RotatingBackground />

      <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {/* Default Password Security Alert Banner */}
        {isDefaultPassword && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-amber-300 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <strong className="font-semibold block font-pixel">SECURITY WARNING: DEFAULT PASSWORD ACTIVE</strong>
                <span className="text-xs text-amber-400/80">You are currently using the default master password (<code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">admin</code>). Please set a custom password.</span>
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 bg-amber-500 text-neutral-950 font-semibold rounded-xl text-xs hover:bg-amber-400 transition-colors shrink-0 shadow-lg font-pixel"
            >
              CHANGE PASSWORD NOW
            </button>
          </div>
        )}

        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg backdrop-blur-md">
              {/* 3D Minecraft Grass Block Icon */}
              <img src="/grass_block.png" alt="Minecraft Server Logo" className="w-10 h-10 object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-pixel tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-indigo-400 to-cyan-400">
                MINECRAFT LOBBY
              </h1>
              <p className="text-neutral-400 text-xs font-pixel tracking-wide">Server Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleScanServers} className="flex items-center gap-2 px-4 py-3 bg-neutral-900/80 border border-neutral-800 hover:bg-indigo-500/10 text-neutral-300 hover:text-indigo-400 transition-all rounded-2xl font-semibold shadow-lg text-xs font-pixel backdrop-blur-md" title="Scan Servers Folder for Existing Servers">
              SCAN FOLDER
            </button>
            <Link href="/create" className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 transition-all rounded-2xl font-semibold shadow-lg shadow-indigo-950/50 text-xs font-pixel tracking-wider">
              <Plus className="w-4 h-4" />
              CREATE SERVER
            </Link>
            <button onClick={() => setShowPasswordModal(true)} className="p-3 bg-neutral-900/80 border border-neutral-800 hover:bg-indigo-500/10 text-neutral-400 hover:text-indigo-400 rounded-2xl transition-colors backdrop-blur-md" title="Change Master Password">
              <Key className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="p-3 bg-neutral-900/80 border border-neutral-800 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 rounded-2xl transition-colors backdrop-blur-md" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server: any) => {
              const metrics = metricsMap[server.id];
              return (
                <div key={server.id} className="group relative bg-neutral-900/75 backdrop-blur-xl border border-neutral-800/80 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold mb-1 font-pixel tracking-wide text-neutral-100">{server.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <span className="px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700 capitalize text-xs font-semibold font-pixel text-indigo-300">
                            {server.type}
                          </span>
                          <span className="text-xs font-mono">{server.version}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                          {server.status === 'starting' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${server.status === 'online' ? 'bg-emerald-500' : server.status === 'starting' ? 'bg-amber-500' : 'bg-neutral-600'}`}></span>
                        </span>
                      </div>
                    </div>

                    {/* Container Stats (CPU & RAM) */}
                    {server.status === 'online' && metrics && (
                      <div className="my-4 p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          <span>CPU: <strong className="text-neutral-200">{metrics.cpu}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                          <span>RAM: <strong className="text-neutral-200">{metrics.memUsage}</strong></span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-neutral-800/50 relative z-10">
                      <button onClick={() => handleStart(server.id)} disabled={server.status !== 'offline'} className="p-2.5 rounded-xl bg-neutral-800/60 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors border border-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Play className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleStop(server.id)} disabled={server.status === 'offline'} className="p-2.5 rounded-xl bg-neutral-800/60 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-neutral-700/50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Square className="w-4 h-4" />
                      </button>
                      <a href={`http://localhost:${server.mapPort || 8123}`} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-neutral-800/60 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors border border-neutral-700/50" title="Live Map">
                        <Map className="w-4 h-4" />
                      </a>
                      <Link href={`/server/${server.id}`} className="p-2.5 rounded-xl bg-neutral-800/60 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors border border-neutral-700/50 ml-auto flex items-center gap-2">
                        <TerminalIcon className="w-4 h-4" />
                        <span className="text-xs font-pixel">Console</span>
                      </Link>
                      <Link href={`/server/${server.id}/settings`} className="p-2.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-700 transition-colors border border-neutral-700/50">
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {servers.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-900/50 backdrop-blur-md">
                <img src="/grass_block.png" className="w-12 h-12 object-contain mx-auto mb-4 opacity-50" alt="Grass block" />
                <h3 className="text-xl font-bold font-pixel text-neutral-300 mb-2">NO SERVERS FOUND</h3>
                <p className="text-neutral-500 text-xs font-pixel">Create a new server to get started.</p>
              </div>
            )}
          </div>
        </main>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-5 right-5 text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold font-pixel mb-1 flex items-center gap-2 text-indigo-400">
                <Key className="w-5 h-5" /> CHANGE MASTER PASSWORD
              </h2>
              <p className="text-xs text-neutral-400 mb-6 font-pixel">Update the master password used to log in to this panel.</p>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                {passError && <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-pixel">{passError}</div>}
                {passSuccess && <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-pixel">{passSuccess}</div>}

                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-pixel uppercase">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-pixel uppercase">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-pixel font-semibold rounded-xl transition-colors disabled:opacity-50 mt-4 shadow-lg shadow-indigo-950/50"
                >
                  {passLoading ? "Updating..." : "UPDATE PASSWORD"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
