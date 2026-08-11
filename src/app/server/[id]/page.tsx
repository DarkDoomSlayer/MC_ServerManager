"use client";

import { useEffect, useState, useRef, use } from "react";
import { ArrowLeft, Terminal as TerminalIcon, Play, Square, Map, Settings } from "lucide-react";
import Link from "next/link";
import { io } from "socket.io-client";
import RotatingBackground from "../../components/RotatingBackground";

export default function ServerConsole({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const serverId = resolvedParams.id;
  const [server, setServer] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/servers/${serverId}`)
      .then(res => res.json())
      .then(data => setServer(data));

    const socket = io();
    
    socket.on('console', (data: { id: number, data: string, error?: boolean }) => {
      if (data.id === parseInt(serverId)) {
        setLogs(prev => {
          const newLogs = [...prev, data.data];
          if (newLogs.length > 1000) return newLogs.slice(-1000);
          return newLogs;
        });
      }
    });

    socket.on('status', (data: { id: number, status: string }) => {
      if (data.id === parseInt(serverId)) {
        setServer((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [serverId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    await fetch(`/api/servers/${serverId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    setCommand("");
  };

  if (!server) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen text-white font-sans flex flex-col relative overflow-x-hidden">
      <RotatingBackground />

      <header className="border-b border-neutral-800/80 bg-neutral-900/75 backdrop-blur-xl p-4 sticky top-0 z-20 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-xl hover:bg-neutral-800/80 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <img src="/grass_block.png" alt="Grass block" className="w-9 h-9 object-contain" />
            <div>
              <h1 className="text-xl font-bold font-pixel flex items-center gap-2 tracking-wide">
                {server.name}
                <span className="relative flex h-2.5 w-2.5 ml-2">
                  {server.status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  {server.status === 'starting' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${server.status === 'online' ? 'bg-emerald-500' : server.status === 'starting' ? 'bg-amber-500' : 'bg-neutral-600'}`}></span>
                </span>
              </h1>
              <p className="text-xs text-neutral-400 capitalize font-mono">{server.type} • {server.version}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={`http://localhost:${server.mapPort || 8123}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 text-xs font-pixel"
            >
              <Map className="w-4 h-4" /> Live Map
            </a>
            <Link
              href={`/server/${serverId}/settings`}
              className="p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-700 transition-colors border border-neutral-700/50"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button 
              onClick={() => fetch(`/api/servers/${serverId}/start`, { method: 'POST' })}
              disabled={server.status !== 'offline'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-pixel"
            >
              <Play className="w-4 h-4" /> Start
            </button>
            <button 
              onClick={() => fetch(`/api/servers/${serverId}/stop`, { method: 'POST' })}
              disabled={server.status === 'offline'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-pixel"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6 h-[calc(100vh-80px)] relative z-10">
        <div className="flex-1 flex flex-col bg-neutral-950/90 rounded-2xl border border-neutral-800/80 overflow-hidden shadow-2xl h-full backdrop-blur-xl">
          <div className="bg-neutral-900/80 border-b border-neutral-800 px-4 py-2.5 flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-pixel text-neutral-400">CONSOLE OUTPUT</span>
          </div>
          
          <div className="flex-1 p-4 font-mono text-xs text-neutral-300 overflow-y-auto whitespace-pre-wrap flex flex-col">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic mt-auto font-pixel">Server is offline or no logs yet.</div>
            ) : (
              logs.map((log, i) => <span key={i}>{log}</span>)
            )}
            <div ref={logsEndRef} />
          </div>
          
          <form onSubmit={handleCommand} className="border-t border-neutral-800 bg-neutral-900/80 p-2 flex gap-2 shrink-0">
            <span className="text-indigo-400 pl-2 pt-2 font-mono text-xs">{'>'}</span>
            <input 
              type="text" 
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder="Enter command (e.g., list, say hello, op player)"
              className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white placeholder-neutral-600 py-2 px-2"
              disabled={server.status !== 'online'}
            />
          </form>
        </div>
      </main>
    </div>
  );
}
