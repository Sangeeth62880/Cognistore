"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HeartPulse,
  Database,
  Layers,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface HealthData {
  status: string;
  db_connected: boolean;
  redis_connected: boolean;
  environment: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/health`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HealthData = await response.json();
      setHealth(data);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Health check fetch failed:", err);
      setError(
        err.message || "Failed to reach backend services. Please ensure your backend container is running."
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const isHealthy = health?.status === "healthy";
  const dbOk = health?.db_connected ?? false;
  const redisOk = health?.redis_connected ?? false;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Header with Title and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HeartPulse className="h-6 w-6 text-violet-400" /> System Diagnostics
          </h1>
          <p className="text-sm text-slate-400">
            Real-time status monitor for active databases, caches, and API nodes.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking..." : "Refresh Diagnostics"}
        </button>
      </div>

      {/* Connection Failure Warning Banner */}
      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex items-start gap-3.5 glow-red">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Backend Connection Error</h3>
            <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* API Server Card */}
        <div className="rounded-2xl glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Server className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200">API Backend</h3>
            </div>
            {loading ? (
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
            ) : health ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Endpoint:</span>
              <span className="font-mono text-slate-300">/health</span>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <span className="capitalize text-slate-300">{health?.environment || "unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span
                className={`font-semibold ${
                  health ? "text-green-400" : "text-red-400"
                }`}
              >
                {health ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* PostgreSQL Database Card */}
        <div className="rounded-2xl glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200">PostgreSQL</h3>
            </div>
            {loading ? (
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
            ) : dbOk ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Driver:</span>
              <span className="font-mono text-slate-300">asyncpg (SQLAlchemy)</span>
            </div>
            <div className="flex justify-between">
              <span>Host:</span>
              <span className="font-mono text-slate-300">db (container)</span>
            </div>
            <div className="flex justify-between">
              <span>Connection:</span>
              <span
                className={`font-semibold ${
                  dbOk ? "text-green-400" : "text-red-400"
                }`}
              >
                {dbOk ? "Established" : "Failed"}
              </span>
            </div>
          </div>
        </div>

        {/* Redis Cache Card */}
        <div className="rounded-2xl glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200">Redis Cache</h3>
            </div>
            {loading ? (
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-pulse" />
            ) : redisOk ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Library:</span>
              <span className="font-mono text-slate-300">redis.asyncio</span>
            </div>
            <div className="flex justify-between">
              <span>Host:</span>
              <span className="font-mono text-slate-300">redis (container)</span>
            </div>
            <div className="flex justify-between">
              <span>Connection:</span>
              <span
                className={`font-semibold ${
                  redisOk ? "text-green-400" : "text-red-400"
                }`}
              >
                {redisOk ? "Established" : "Failed"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Diagnostic Pulse */}
      {!loading && health && (
        <div className={`rounded-2xl glass-panel p-6 border ${
          isHealthy ? "border-green-500/20 glow-green" : "border-rose-500/20 glow-red"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border ${
                isHealthy ? "border-green-500/30 text-green-400" : "border-rose-500/30 text-rose-400"
              }`}>
                <Activity className={`h-6 w-6 ${isHealthy ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <h3 className="text-md font-bold text-slate-100">
                  Overall Server Cluster Status: <span className="capitalize">{health.status}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Last monitored verification: {lastRefreshed || "Just now"}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                isHealthy ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                {isHealthy ? "All Systems Operational" : "Degraded Service Performance"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
