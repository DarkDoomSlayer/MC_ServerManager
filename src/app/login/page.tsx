"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import RotatingBackground from "../components/RotatingBackground";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid password");

      router.push("/");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white font-sans flex items-center justify-center p-6 relative overflow-hidden">
      <RotatingBackground />

      <div className="w-full max-w-md bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl mb-4 shadow-lg">
            {/* 3D Grass Block Icon */}
            <img src="/grass_block.png" alt="Minecraft Grass Block" className="w-12 h-12 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider font-pixel bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-indigo-400 to-cyan-400">
            MINECRAFT LOBBY
          </h1>
          <p className="text-xs text-neutral-400 mt-2 font-pixel tracking-wide">Enter master password to manage servers</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm text-center font-pixel">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 pl-1 font-pixel">
              PASSWORD
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950/90 border border-neutral-800 rounded-2xl px-4 py-3.5 pl-11 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Lock className="w-5 h-5 text-neutral-500 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-xs text-neutral-400 pl-1 pt-1 font-pixel">Default password: <code className="text-indigo-400 font-mono">admin</code></p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 disabled:opacity-50 font-pixel tracking-wider text-base"
          >
            {loading ? "Authenticating..." : <>Access Panel <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
