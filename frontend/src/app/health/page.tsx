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
    <div className="space-y-6 max-w-full mx-auto font-sans bg-white">
      {/* Top Header Section */}
      <div className="flex flex-row items-center justify-between border-b border-[#e5e7eb] pb-4">
        <div className="space-y-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111111] font-sans">
            Health Status
          </h1>
          <p className="text-[14px] text-[#6b7280] leading-normal max-w-xl font-sans mt-1">
            Real-time status monitors for backend services, registry databases, and Upstash Redis clusters.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="btn-secondary text-xs"
        >
          {loading ? "Checking..." : "Run diagnostic"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#ef4444] bg-[#ef4444]/5 p-4 text-[12px] font-mono text-[#ef4444]">
          [Error] Connection failure: {error}
        </div>
      )}

      {/* Main Status Row (3 status items in horizontal row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Service 1: API BACKEND */}
        <div className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-[12px] p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2">
            <span className="text-[14px] font-semibold text-[#111111] font-sans">
              API Backend Gateway
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${health ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
              <span className="text-xs text-[#6b7280] font-sans">
                {health ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-[13px] text-[#374151] font-sans">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Endpoint:</span>
              <span className="text-[#111111] font-semibold">/health</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Environment:</span>
              <span className="text-[#111111] font-semibold uppercase">{health?.environment || "unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Status:</span>
              <span className={health ? "text-[#10b981] font-bold" : "text-[#ef4444] font-bold"}>
                {health ? "Operational" : "Unreachable"}
              </span>
            </div>
          </div>
        </div>

        {/* Service 2: POSTGRESQL DB */}
        <div className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-[12px] p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2">
            <span className="text-[14px] font-semibold text-[#111111] font-sans">
              PostgreSQL Registry
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${dbOk ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
              <span className="text-xs text-[#6b7280] font-sans">
                {dbOk ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-[13px] text-[#374151] font-sans">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Driver:</span>
              <span className="text-[#111111] font-semibold">asyncpg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Host:</span>
              <span className="text-[#111111] font-semibold">db.supabase.co</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Connection:</span>
              <span className={dbOk ? "text-[#10b981] font-bold" : "text-[#ef4444] font-bold"}>
                {dbOk ? "Established" : "Failure"}
              </span>
            </div>
          </div>
        </div>

        {/* Service 3: REDIS CACHE */}
        <div className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-[12px] p-5 space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-2">
            <span className="text-[14px] font-semibold text-[#111111] font-sans">
              Redis Serving Cache
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${redisOk ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
              <span className="text-xs text-[#6b7280] font-sans">
                {redisOk ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          
          <div className="space-y-1.5 text-[13px] text-[#374151] font-sans">
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Library:</span>
              <span className="text-[#111111] font-semibold">redis.asyncio</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Host:</span>
              <span className="text-[#111111] font-semibold">upstash.io</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6b7280]">Connection:</span>
              <span className={redisOk ? "text-[#10b981] font-bold" : "text-[#ef4444] font-bold"}>
                {redisOk ? "Established" : "Failure"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Overall status line below */}
      {!loading && health && health.status === "healthy" && dbOk && redisOk ? (
        <div className="pt-8 text-center">
          <span className="text-[#10b981] font-sans font-semibold text-[15px] inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" /> All Systems Operational
          </span>
        </div>
      ) : (
        !loading && (
          <div className="pt-8 text-center">
            <span className="text-[#ef4444] font-sans font-semibold text-[15px] inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#ef4444] animate-pulse" /> System Degradation Detected
            </span>
          </div>
        )
      )}
    </div>
  );
}
