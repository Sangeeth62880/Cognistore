"use client";

import React, { useState, useEffect } from "react";
import DriftChart from "../../components/DriftChart";

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

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState<string>("user_session_duration"); // Seed value for drift curves demo

  // Expanded row tracking
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>("user_session_duration"); // Expanded by default to showcase Recharts drift PDF curve
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

      const summaryResp = await fetch(`${apiUrl}/alerts/summary`, {
        headers: getHeaders(),
      });
      if (summaryResp.ok) {
        const sumData = await summaryResp.json();
        setSummary(sumData);
      }

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
      fetchAlerts();
    } catch (err: any) {
      console.error("Global drift sweep failed:", err);
      setError(err.message || "An unexpected error occurred during global drift checking.");
    } finally {
      setSweeping(false);
    }
  };

  const handleResolve = async (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    if (resolvingId) return;

    setResolvingId(alertId);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/alerts/${alertId}/resolve`, {
        method: "PATCH",
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to mark alert as resolved.");
      }

      // Optimistically update
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a))
      );
      fetchAlerts();
    } catch (err) {
      console.error("Failed to resolve alert:", err);
      alert("Failed to resolve the alert. Please verify connection.");
    } finally {
      setResolvingId(null);
    }
  };

  const filteredAlerts = alerts.filter((alert) => {
    const featureMatched = !searchQuery || alert.feature_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!featureMatched && expandedAlertId !== alert.id) {
      // Keep expanded target visible
      return false;
    }
    if (!featureMatched) return false;
    
    if (severityFilter !== "all" && alert.severity.toLowerCase() !== severityFilter) {
      return false;
    }
    if (resolvedFilter === "active" && alert.is_resolved) return false;
    if (resolvedFilter === "resolved" && !alert.is_resolved) return false;

    return true;
  });

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans bg-white">
      {/* Top Header Section */}
      <div className="flex flex-row items-center justify-between border-b border-[#e5e7eb] pb-4">
        <div className="space-y-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111111] font-sans">
            Alerts
          </h1>
          <p className="text-[14px] text-[#6b7280] leading-normal max-w-xl font-sans mt-1">
            Audit covariate drift alerts, Population Stability Index shifts, and execute ML retraining remedies.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {loading ? "Syncing..." : "Sync logs"}
          </button>

          <button
            onClick={handleGlobalSweep}
            disabled={sweeping}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {sweeping ? "Running check..." : "Run sweep check"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#ef4444] bg-[#ef4444]/5 p-4 text-[12px] font-mono text-[#ef4444]">
          [Error] Sweep monitoring failed: {error}
        </div>
      )}

      {/* 3-Column flat Cardless KPI Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#6b7280] uppercase tracking-widest block font-sans">
            Total anomalies logged
          </span>
          <span className="text-[32px] font-semibold text-[#111111] tracking-tight font-sans">
            {summary.total_alerts}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#6b7280] uppercase tracking-widest block font-sans">
            Severity ratios
          </span>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-[32px] font-semibold text-[#ef4444] tracking-tight font-sans">
              {summary.high_severity_count}
            </span>
            <span className="text-sm font-semibold text-[#6b7280] font-sans">High</span>
            <span className="text-xl text-[#e5e7eb] font-sans">/</span>
            <span className="text-[32px] font-semibold text-[#f59e0b] tracking-tight font-sans">
              {summary.medium_severity_count}
            </span>
            <span className="text-sm font-semibold text-[#6b7280] font-sans">Med</span>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[#6b7280] uppercase tracking-widest block font-sans">
            Drift remediation rate
          </span>
          <span className="text-[32px] font-semibold text-[#10b981] tracking-tight font-sans">
            {summary.resolution_rate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-[#e5e7eb] pb-4 items-center">
        <input
          type="text"
          placeholder="Filter alerts by feature name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input flex-1 w-full"
        />

        <div className="flex flex-wrap items-center gap-6 text-[12px] font-medium shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[#6b7280] font-sans uppercase text-[10px] tracking-wider font-semibold">Severity:</span>
            {["all", "high", "medium"].map((sev) => {
              const isActive = severityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isActive ? "bg-[#111111] text-white" : "bg-[#f5f5f5] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-l border-[#e5e7eb] pl-6">
            <span className="text-[#6b7280] font-sans uppercase text-[10px] tracking-wider font-semibold">Status:</span>
            {["active", "resolved", "all"].map((res) => {
              const isActive = resolvedFilter === res;
              return (
                <button
                  key={res}
                  onClick={() => setResolvedFilter(res)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isActive ? "bg-[#111111] text-white" : "bg-[#f5f5f5] text-[#6b7280] hover:bg-[#e5e7eb]"
                  }`}
                >
                  {res.charAt(0).toUpperCase() + res.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Alerts Table */}
      <div className="w-full overflow-x-auto">
        <table className="dev-table">
          <thead>
            <tr>
              <th className="w-[30%] font-sans">Feature name</th>
              <th className="w-[12%] font-sans">Severity</th>
              <th className="w-[12%] font-sans">PSI Score</th>
              <th className="w-[13%] font-sans">KL Divergence</th>
              <th className="w-[15%] font-sans">Detected at</th>
              <th className="w-[10%] font-sans">Status</th>
              <th className="w-[8%] font-sans">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[#6b7280] font-sans text-sm">
                  Retrieving monitoring logs...
                </td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[#6b7280] font-sans text-sm">
                  No drift anomalies currently recorded in logs.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => {
                const isExpanded = expandedAlertId === alert.id;
                const corr = alert.upstream_correlation || {};
                const psi = corr.psi ?? 0.0;
                const klDiv = corr.kl_divergence ?? 0.0;
                const baselineStats = corr.baseline_stats || {};
                const currentStats = corr.current_stats || {};
                const driftType = corr.drift_type || "Covariate Drift";

                const isHigh = alert.severity.toLowerCase() === "high";

                return (
                  <React.Fragment key={alert.id}>
                    <tr
                      onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                      className="cursor-pointer hover:bg-[#f9fafb]"
                    >
                      {/* Feature Name */}
                      <td className="font-sans text-[#111111] font-semibold text-sm">
                        {alert.feature_name}
                      </td>

                      {/* Severity (text color only, no pills/backgrounds) */}
                      <td className={`font-sans font-bold text-xs ${isHigh ? "text-[#ef4444]" : "text-[#f59e0b]"}`}>
                        {alert.severity}
                      </td>

                      {/* PSI (JetBrains Mono) */}
                      <td className="font-mono text-[#111111] text-[13px] font-semibold">
                        {psi.toFixed(4)}
                      </td>

                      {/* KL Divergence */}
                      <td className="font-mono text-[#6b7280] text-[13px]">
                        {klDiv.toFixed(4)}
                      </td>

                      {/* Detected timestamp */}
                      <td className="font-sans text-[#6b7280] text-xs">
                        {new Date(alert.detected_at).toLocaleString()}
                      </td>

                      {/* Status Badges */}
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold font-sans inline-flex items-center ${
                            alert.is_resolved
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {alert.is_resolved ? "Resolved" : "Active"}
                        </span>
                      </td>

                      {/* Action trigger */}
                      <td>
                        {!alert.is_resolved ? (
                          <button
                            onClick={(e) => handleResolve(e, alert.id)}
                            disabled={resolvingId === alert.id}
                            className="btn-primary text-xs py-1 px-3 shrink-0"
                          >
                            {resolvingId === alert.id ? "Resolving" : "Resolve"}
                          </button>
                        ) : (
                          <span className="text-[11px] font-sans text-[#9ca3af] italic">Closed</span>
                        )}
                      </td>
                    </tr>

                    {/* Inline row expansion details */}
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-5 bg-white border-t border-b border-[#e5e7eb] font-sans text-sm text-[#374151] leading-normal"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Descriptive analysis block */}
                            <div className="space-y-4 font-sans text-sm">
                              <div className="space-y-1">
                                <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider block font-sans">
                                  Covariate drift analysis details:
                                </span>
                                <p className="text-[#374151] text-[14px] font-sans leading-relaxed">{alert.explanation}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-white border border-[#e5e7eb] rounded-[8px] space-y-1">
                                  <span className="text-[#6b7280] text-[10px] block font-sans font-semibold uppercase">Drift speciation</span>
                                  <span className="text-[#111111] text-xs font-semibold font-sans">{driftType}</span>
                                </div>
                                <div className="p-3 bg-white border border-[#e5e7eb] rounded-[8px] space-y-1">
                                  <span className="text-[#6b7280] text-[10px] block font-sans font-semibold uppercase">Population instability</span>
                                  <span className="text-[#111111] text-xs font-mono font-bold">PSI {psi.toFixed(4)}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-white border border-[#e5e7eb] rounded-[8px] space-y-1">
                                <span className="text-[#6b7280] text-[10px] block font-sans font-semibold uppercase">Probable root cause</span>
                                <p className="text-[#6b7280] text-xs leading-relaxed font-sans">{corr.likely_cause || "No statistical metrics matched."}</p>
                              </div>

                              <div className="p-3 bg-[#fef2f2] border border-[#ef4444]/25 rounded-[8px] space-y-1">
                                <span className="text-[#ef4444] text-[10px] block font-sans font-semibold uppercase">Proposed AI remedial fix</span>
                                <p className="text-[#ef4444] text-xs leading-relaxed font-sans font-semibold">{alert.suggested_fix}</p>
                              </div>
                            </div>

                            {/* Probability density chart column */}
                            {baselineStats && currentStats && Object.keys(baselineStats).length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider block font-sans">
                                  Covariate probability density curves:
                                </span>
                                <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 shadow-none">
                                  <DriftChart
                                    baselineStats={baselineStats}
                                    currentStats={currentStats}
                                    psi={psi}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
