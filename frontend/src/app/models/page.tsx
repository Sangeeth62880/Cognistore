import React from "react";
import { Brain, Search, Plus, Cpu, Activity, Play } from "lucide-react";

export default function ModelsPage() {
  const models = [
    { name: "xgboost_fraud_detector", version: "v2.4", features: 8, runId: "8fd092a7e44a49c9", status: "Active", updated: "May 22, 2026" },
    { name: "customer_churn_predictor", version: "v1.0", features: 14, runId: "41acb990ff5b4e88", status: "Active", updated: "May 18, 2026" },
    { name: "recommendation_ranker", version: "v4.1.2", features: 32, runId: "b8577fd15a2e4b31", status: "Inactive", updated: "May 10, 2026" },
    { name: "anomaly_detection_autoencoder", version: "v0.8", features: 6, runId: "9fa0b555e10c410d", status: "Staging", updated: "May 08, 2026" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-emerald-400" /> Model Deployment Registry
          </h1>
          <p className="text-sm text-slate-400">
            Monitor models reading from the feature store and log deployment configurations using MLflow.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all shrink-0">
          <Plus className="h-4 w-4" /> Log Model
        </button>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((model) => (
          <div key={model.name} className="rounded-2xl glass-panel p-6 space-y-4 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-md font-bold text-slate-200">{model.name}</h3>
                <p className="text-xs text-slate-500 font-mono">MLflow Run ID: {model.runId}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                model.status === "Active" 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : model.status === "Staging"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}>
                {model.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <Cpu className="h-4 w-4 text-violet-400" />
                <div>
                  <span className="block text-[10px] text-slate-500">Bound Features</span>
                  <span className="text-slate-200 font-semibold">{model.features} registered features</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="block text-[10px] text-slate-500">Deploy Version</span>
                  <span className="text-slate-200 font-semibold font-mono">{model.version}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Registered on {model.updated}</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 transition-colors">
                <Play className="h-3 w-3" /> Test Inference
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
