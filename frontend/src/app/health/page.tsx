"use client";

import React, { useState, useEffect, useCallback } from "react";

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
        err.message || "Failed to reach backend services. Please ensure your backend is running."
      );
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const dbOk = health?.db_connected ?? false;
  const redisOk = health?.redis_connected ?? false;

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      
      {/* Top Header Section */}
      <div className="flex flex-row items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-[#666666] uppercase tracking-wider block">
            SYSTEM DIAGNOSTICS & INFRASTRUCTURE HEALTH
          </span>
          <p className="text-[13px] text-[#666666] leading-normal max-w-xl">
            Real-time status monitors for backend services, registry databases, and Upstash Redis clusters.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-mono border border-[#1f1f1f] bg-transparent text-[#e8e8e8] rounded-[4px] hover:bg-[#111111] hover:border-[#666666] transition-colors duration-150"
        >
          {loading ? "CHECKING..." : "RUN DIAGNOSTIC"}
        </button>
      </div>

      {error && (
        <div className="rounded-[4px] border border-[#dc2626] bg-[#dc2626]/5 p-4 text-[12px] font-mono text-[#dc2626]">
          [ERROR] Connection failure: {error}
        </div>
      )}

      {/* Main Status Row (3 status items in horizontal row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Service 1: API BACKEND */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
            <span className="text-[11px] font-mono font-bold text-[#666666] uppercase tracking-wider">
              API BACKEND GATEWAY
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${health ? "bg-[#16a34a]" : "bg-[#dc2626]"}`} />
              <span className="text-[9px] font-mono text-[#666666] font-bold uppercase">
                {health ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-[11px] font-mono text-[#666666]">
            <div className="flex justify-between">
              <span>ENDPOINT:</span>
              <span className="text-[#e8e8e8]">/health</span>
            </div>
            <div className="flex justify-between">
              <span>ENV:</span>
              <span className="text-[#e8e8e8] uppercase">{health?.environment || "unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span>HEALTH:</span>
              <span className={health ? "text-[#16a34a] font-bold" : "text-[#dc2626] font-bold"}>
                {health ? "OPERATIONAL" : "UNREACHABLE"}
              </span>
            </div>
          </div>
        </div>

        {/* Service 2: POSTGRESQL DB */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
            <span className="text-[11px] font-mono font-bold text-[#666666] uppercase tracking-wider">
              POSTGRESQL REGISTRY
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dbOk ? "bg-[#16a34a]" : "bg-[#dc2626]"}`} />
              <span className="text-[9px] font-mono text-[#666666] font-bold uppercase">
                {dbOk ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-[11px] font-mono text-[#666666]">
            <div className="flex justify-between">
              <span>DRIVER:</span>
              <span className="text-[#e8e8e8]">asyncpg (SQLAlchemy)</span>
            </div>
            <div className="flex justify-between">
              <span>HOST:</span>
              <span className="text-[#e8e8e8]">db.supabase.co</span>
            </div>
            <div className="flex justify-between">
              <span>CONNECTION:</span>
              <span className={dbOk ? "text-[#16a34a] font-bold" : "text-[#dc2626] font-bold"}>
                {dbOk ? "ESTABLISHED" : "FAILURE"}
              </span>
            </div>
          </div>
        </div>

        {/* Service 3: REDIS CACHE */}
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
            <span className="text-[11px] font-mono font-bold text-[#666666] uppercase tracking-wider">
              REDIS SERVING CACHE
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${redisOk ? "bg-[#16a34a]" : "bg-[#dc2626]"}`} />
              <span className="text-[9px] font-mono text-[#666666] font-bold uppercase">
                {redisOk ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-[11px] font-mono text-[#666666]">
            <div className="flex justify-between">
              <span>LIBRARY:</span>
              <span className="text-[#e8e8e8]">redis.asyncio</span>
            </div>
            <div className="flex justify-between">
              <span>HOST:</span>
              <span className="text-[#e8e8e8]">upstash.io (caching)</span>
            </div>
            <div className="flex justify-between">
              <span>CONNECTION:</span>
              <span className={redisOk ? "text-[#16a34a] font-bold" : "text-[#dc2626] font-bold"}>
                {redisOk ? "ESTABLISHED" : "FAILURE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics Verification Footer Info */}
      {!loading && health && (
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-4 text-[11px] font-mono text-[#666666] flex flex-row items-center justify-between">
          <span>MONITOR REFRESHED TIMELINE: {lastRefreshed || "JUST NOW"}</span>
          <span className={health.status === "healthy" ? "text-[#16a34a]" : "text-[#dc2626]"}>
            STATUS REPORT: {health.status.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
