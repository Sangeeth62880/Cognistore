import React from "react";
import { AlertTriangle, Tag, Check, RefreshCw, X } from "lucide-react";

export default function AlertsPage() {
  const alerts = [
    {
      id: "DRIFT_ALERT_042",
      feature: "user_transaction_velocity_1h",
      severity: "high",
      detected: "2 hours ago",
      explanation: "Significant shift in value distribution detected using Kolmogorov-Smirnov test (KS-statistic = 0.082 vs threshold = 0.05). Indicating possible upstream fraud patterns or script changes.",
      fix: "Verify user transaction ingestion logs and recalculate velocity aggregates.",
      resolved: false,
    },
    {
      id: "DRIFT_ALERT_039",
      feature: "customer_lifetime_value_v3",
      severity: "medium",
      detected: "1 day ago",
      explanation: "Population stability index (PSI) threshold exceeded (PSI = 0.14 vs threshold = 0.10). Inconsistency detected in customer signup attributes.",
      fix: "Trigger retraining of customer CLV offline models with recent monthly records.",
      resolved: false,
    },
    {
      id: "DRIFT_ALERT_031",
      feature: "device_ip_country_hash",
      severity: "low",
      detected: "3 days ago",
      explanation: "Null value percentage increased beyond 2% in the daily serving dataset.",
      fix: "Review device IP tracking middleware to ensure country resolution fallback is functional.",
      resolved: true,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-rose-500" /> Drift & Quality Alerts
          </h1>
          <p className="text-sm text-slate-400">
            Real-time notifications regarding feature distribution changes, dataset quality anomalies, and pipeline latency.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors">
          <RefreshCw className="h-4 w-4" /> Run Quality Check
        </button>
      </div>

      {/* Alerts Checklist */}
      <div className="space-y-6">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-2xl glass-panel p-6 border transition-all duration-300 ${
              alert.resolved
                ? "border-slate-800 opacity-60 hover:opacity-90"
                : alert.severity === "high"
                ? "border-rose-500/30 glow-red"
                : "border-amber-500/20"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {alert.id}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                    alert.severity === "high"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : alert.severity === "medium"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {alert.severity} Severity
                  </span>
                  <span className="text-xs text-slate-500">{alert.detected}</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-md font-bold text-slate-200">
                    Feature Drift: <span className="text-violet-400 font-mono">{alert.feature}</span>
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{alert.explanation}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-400 block mb-1">Suggested Mitigation:</span>
                  <p className="text-slate-300 leading-relaxed">{alert.fix}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex gap-2">
                {alert.resolved ? (
                  <span className="flex items-center gap-1 text-xs text-slate-500 border border-slate-800 bg-slate-900/40 px-3 py-1.5 rounded-xl font-semibold">
                    <Check className="h-3.5 w-3.5" /> Resolved
                  </span>
                ) : (
                  <>
                    <button className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl transition-colors">
                      <X className="h-3.5 w-3.5 text-slate-400" /> Ignore
                    </button>
                    <button className="flex items-center gap-1 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-xl shadow-md shadow-violet-500/10 transition-all">
                      <Check className="h-3.5 w-3.5" /> Resolve Alert
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
