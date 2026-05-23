"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Shield,
  Search,
} from "lucide-react";
import AlertCard from "../../components/AlertCard";

interface AlertData {
  id: string;
  feature_id: string;
  feature_name: string;
  detected_at: string;
  severity: string;
  explanation: string;
  upstream_correlation: any;
  suggested_fix: string;
  is_resolved: boolean;
}

interface SummaryData {
  total_alerts: number;
  high_severity_count: number;
  medium_severity_count: number;
  resolution_rate: number;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total_alerts: 0,
    high_severity_count: 0,
    medium_severity_count: 0,
    resolution_rate: 100.0,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [sweeping, setSweeping] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const apiKey = "supersecretkeyreplaceinproduction";

  const getHeaders = () => {
    return {
      "X-API-Key": apiKey,
    };
  };

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Load Alert summary counts
      const summaryResp = await fetch(`${apiUrl}/alerts/summary`, {
        headers: getHeaders(),
      });
      if (summaryResp.ok) {
        const sumData = await summaryResp.json();
        setSummary(sumData);
      }

      // Load full list
      const listResp = await fetch(`${apiUrl}/alerts?limit=100`, {
        headers: getHeaders(),
      });
      if (!listResp.ok) {
        throw new Error("Failed to fetch historical alerts list.");
      }

      const listData = await listResp.json();
      setAlerts(listData);
    } catch (err: any) {
      console.error("Alerts fetching error:", err);
      setError(err.message || "An unexpected error occurred while loading alert monitors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleGlobalSweep = async () => {
    setSweeping(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/alerts/drift/check`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || "Global drift sweep execution failed.");
      }

      const sweepResult = await response.json();
      alert(`Drift sweep completed successfully. Checked ${sweepResult.features_checked} features. Found ${sweepResult.features_drifted} new drifts.`);
      
      // Refresh
      fetchAlerts();
    } catch (err: any) {
      console.error("Global drift sweep failed:", err);
      setError(err.message || "An unexpected error occurred during global drift checking.");
    } finally {
      setSweeping(false);
    }
  };

  const handleResolveSuccess = (alertId: string) => {
    // Optimistically update list
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a))
    );
    // Refresh summary
    fetchAlerts();
  };

  // Client-side filtering logic
  const filteredAlerts = alerts.filter((alert) => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    if (query && !alert.feature_name.toLowerCase().includes(query)) {
      return false;
    }

    // Severity filter
    if (severityFilter !== "all" && alert.severity.toLowerCase() !== severityFilter) {
      return false;
    }

    // Resolved filter
    if (resolvedFilter === "active" && alert.is_resolved) return false;
    if (resolvedFilter === "resolved" && !alert.is_resolved) return false;

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rose-500 font-bold" /> Drift & Quality Alerts
          </h1>
          <p className="text-sm text-slate-400">
            Real-time notifications regarding feature distribution changes, statistical drift thresholds, and pipeline quality anomalies.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-200 hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          <button
            onClick={handleGlobalSweep}
            disabled={sweeping}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 shadow flex items-center justify-center gap-1.5 transition"
          >
            {sweeping ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-rose-500" /> Sweeping...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-rose-500" /> Run Quality Check
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex items-start gap-3.5 glow-red">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Sweep / Monitoring Failure</h3>
            <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Events */}
        <div className="rounded-2xl glass-panel p-6 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Inspected Events</span>
          <h3 className="text-2xl font-black text-slate-100 font-mono">
            {summary.total_alerts}
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Total active anomalies recorded inside monitoring logs directory.
          </p>
        </div>

        {/* Severity Metrics */}
        <div className="rounded-2xl glass-panel p-6 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Anomalies Detected</span>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black text-rose-400 font-mono">{summary.high_severity_count}</span>
            <span className="text-xs text-rose-500 font-semibold uppercase">High</span>
            <span className="text-2xl font-black text-amber-400 font-mono ml-2">{summary.medium_severity_count}</span>
            <span className="text-xs text-amber-500 font-semibold uppercase">Med</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            Drift severity distribution counts parsed from PSI analysis.
          </p>
        </div>

        {/* Resolution Rates */}
        <div className="rounded-2xl glass-panel p-6 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Resolution Status</span>
          <h3 className="text-2xl font-black text-emerald-400 font-mono flex items-center gap-1.5">
            <TrendingUp className="h-5 w-5" /> {summary.resolution_rate}%
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Remediation completion rate for feature covariate drifts.
          </p>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-slate-800 pb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search features by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900/60 border border-slate-800 focus:border-rose-500 rounded-xl outline-none text-slate-200 transition-all placeholder:text-slate-500"
          />
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Severity:</span>
          {["all", "high", "medium"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                severityFilter === sev
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Resolve filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Status:</span>
          {["active", "resolved", "all"].map((res) => (
            <button
              key={res}
              onClick={() => setResolvedFilter(res)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                resolvedFilter === res
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Checklist Cards */}
      <div className="space-y-4">
        {loading && alerts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 rounded-2xl border border-slate-850">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-rose-400 mb-2" />
            Loading alert monitors...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-850 bg-slate-900/10 rounded-2xl">
            <CheckCircle className="h-8 w-8 text-emerald-400 animate-pulse mx-auto mb-2" />
            No active drift alerts found matching current filters.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolveSuccess={handleResolveSuccess}
              apiKey={apiKey}
            />
          ))
        )}
      </div>
    </div>
  );
}
