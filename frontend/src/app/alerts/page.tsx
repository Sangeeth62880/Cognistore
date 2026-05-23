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
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Expanded row tracking
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
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
    if (searchQuery && !alert.feature_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (severityFilter !== "all" && alert.severity.toLowerCase() !== severityFilter) {
      return false;
    }
    if (resolvedFilter === "active" && alert.is_resolved) return false;
    if (resolvedFilter === "resolved" && !alert.is_resolved) return false;

    return true;
  });

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      
      {/* Top Header Section */}
      <div className="flex flex-row items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-[#666666] uppercase tracking-wider block">
            DRIFT & ANOMALY LOGS
          </span>
          <p className="text-[13px] text-[#666666] leading-normal max-w-xl">
            Audit covariate drift alerts, Population Stability Index shifts, and execute ML retraining remedies.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-mono border border-[#1f1f1f] bg-transparent text-[#e8e8e8] rounded-[4px] hover:bg-[#161616] hover:border-[#666666] transition-colors duration-150"
          >
            {loading ? "SYNCING..." : "SYNC"}
          </button>
          
          <button
            onClick={handleGlobalSweep}
            disabled={sweeping}
            className="px-3 py-1.5 text-xs font-mono bg-[#2563eb] text-white rounded-[4px] hover:bg-[#2563eb]/90 transition-colors duration-150"
          >
            {sweeping ? "RUNNING CHECK..." : "RUN SWEEP CHECK"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-[4px] border border-[#dc2626] bg-[#dc2626]/5 p-4 text-[12px] font-mono text-[#dc2626]">
          [ERROR] Sweep monitoring failed: {error}
        </div>
      )}

      {/* 3-Column flat KPI Aggregates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-4 flex flex-col justify-between h-[80px]">
          <span className="text-[10px] font-bold text-[#666666] uppercase tracking-widest block">TOTAL ANOMALIES LOGGED</span>
          <span className="text-2xl font-bold font-mono text-[#e8e8e8]">{summary.total_alerts}</span>
        </div>

        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-4 flex flex-col justify-between h-[80px]">
          <span className="text-[10px] font-bold text-[#666666] uppercase tracking-widest block">SEVERITY RATIOS</span>
          <div className="flex items-center gap-3 font-mono text-[11px] font-bold">
            <span className="text-[#dc2626]">{summary.high_severity_count} HIGH</span>
            <span className="text-[#666666]">/</span>
            <span className="text-[#d97706]">{summary.medium_severity_count} MED</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-4 flex flex-col justify-between h-[80px]">
          <span className="text-[10px] font-bold text-[#666666] uppercase tracking-widest block">DRIFT REMEDIATION RATE</span>
          <span className="text-2xl font-bold font-mono text-[#a3e635]">{summary.resolution_rate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 border-b border-[#1f1f1f] pb-4">
        <input
          type="text"
          placeholder="Filter alerts by feature name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs bg-[#111111] border border-[#1f1f1f] rounded-[4px] outline-none text-[#e8e8e8] font-mono placeholder:text-[#444444]"
        />

        <div className="flex items-center gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[#666666] uppercase">SEVERITY:</span>
            {["all", "high", "medium"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2 py-0.5 rounded-[2px] transition ${
                  severityFilter === sev ? "bg-[#2563eb] text-white" : "text-[#666666] hover:text-[#e8e8e8]"
                }`}
              >
                {sev.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-l border-[#1f1f1f] pl-4">
            <span className="text-[#666666] uppercase">STATUS:</span>
            {["active", "resolved", "all"].map((res) => (
              <button
                key={res}
                onClick={() => setResolvedFilter(res)}
                className={`px-2 py-0.5 rounded-[2px] transition ${
                  resolvedFilter === res ? "bg-[#2563eb] text-white" : "text-[#666666] hover:text-[#e8e8e8]"
                }`}
              >
                {res.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Alerts Table */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] overflow-hidden">
        <table className="dev-table">
          <thead>
            <tr>
              <th className="w-[30%]">Feature Name</th>
              <th className="w-[12%]">Severity</th>
              <th className="w-[12%]">PSI Score</th>
              <th className="w-[13%]">KL Divergence</th>
              <th className="w-[15%]">Detected At</th>
              <th className="w-[10%]">Status</th>
              <th className="w-[8%]">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[#666666] font-mono">
                  RETRIEVING MONITORING LOGS...
                </td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[#444444] font-mono">
                  NO DRIFT ANOMALIES CURRENTLY RECORDED IN LOGS.
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
                      className="cursor-pointer"
                    >
                      {/* Feature Name */}
                      <td className="font-mono text-[#e8e8e8] font-bold">
                        {alert.feature_name}
                      </td>

                      {/* Severity (text color only) */}
                      <td className={`font-mono font-bold text-[11px] uppercase ${isHigh ? "text-[#dc2626]" : "text-[#d97706]"}`}>
                        {alert.severity}
                      </td>

                      {/* PSI (lime monospace) */}
                      <td className="font-mono text-[#a3e635] text-[11px] font-semibold">
                        {psi.toFixed(4)}
                      </td>

                      {/* KL Divergence */}
                      <td className="font-mono text-[#666666] text-[11px]">
                        {klDiv.toFixed(4)}
                      </td>

                      {/* Detected timestamp */}
                      <td className="font-mono text-[#666666] text-[11px]">
                        {new Date(alert.detected_at).toLocaleString()}
                      </td>

                      {/* Status Badges */}
                      <td>
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase font-mono border ${
                            alert.is_resolved
                              ? "bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/15"
                              : "bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/15"
                          }`}
                        >
                          {alert.is_resolved ? "RESOLVED" : "ACTIVE"}
                        </span>
                      </td>

                      {/* Action trigger */}
                      <td>
                        {!alert.is_resolved ? (
                          <button
                            onClick={(e) => handleResolve(e, alert.id)}
                            disabled={resolvingId === alert.id}
                            className="px-2 py-0.5 text-[10px] font-mono bg-[#16a34a] text-white rounded-[4px] hover:bg-[#16a34a]/90 disabled:opacity-50"
                          >
                            {resolvingId === alert.id ? "RESOLVING" : "RESOLVE"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#444444] font-mono italic">CLOSED</span>
                        )}
                      </td>
                    </tr>

                    {/* Inline row expansion details */}
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-5 bg-[#161616] border-t border-b border-[#1f1f1f] text-[#666666] font-mono leading-normal"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Descriptive analysis block */}
                            <div className="space-y-4 text-xs font-mono">
                              <div className="space-y-1">
                                <span className="text-[10px] text-[#444444] font-bold uppercase tracking-wider block">
                                  COVARIATE DRIFT ANALYSIS DETAILS:
                                </span>
                                <p className="text-[#e8e8e8] text-xs">{alert.explanation}</p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-[#111111] border border-[#1f1f1f] rounded-[4px]">
                                  <span className="text-[#444444] text-[9px] block">DRIFT SPECIATION</span>
                                  <span className="text-[#e8e8e8] text-xs font-bold">{driftType}</span>
                                </div>
                                <div className="p-3 bg-[#111111] border border-[#1f1f1f] rounded-[4px]">
                                  <span className="text-[#444444] text-[9px] block">POPULATION INSTABILITY</span>
                                  <span className="text-[#a3e635] text-xs font-bold">PSI {psi.toFixed(4)}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-[#111111] border border-[#1f1f1f] rounded-[4px] space-y-1">
                                <span className="text-[#444444] text-[9px] block">PROBABLE ROOT CAUSE</span>
                                <p className="text-[#666666] text-xs leading-relaxed">{corr.likely_cause || "No metrics matched."}</p>
                              </div>

                              <div className="p-3 bg-[#111111] border border-[#dc2626]/20 rounded-[4px] space-y-1">
                                <span className="text-[#dc2626] text-[9px] block">PROPOSED AI REMEDIAL FIX</span>
                                <p className="text-[#e8e8e8] text-xs leading-relaxed">{alert.suggested_fix}</p>
                              </div>
                            </div>

                            {/* Probability density chart column */}
                            {baselineStats && currentStats && Object.keys(baselineStats).length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] text-[#444444] font-bold uppercase tracking-wider block">
                                  COVARIATE PROBABILITY DENSITY CURVES:
                                </span>
                                <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-3">
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
