"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Cpu,
  Activity,
  Plus,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Database,
  Inbox,
} from "lucide-react";
import ModelRegistration from "../../components/ModelRegistration";

interface FeatureLink {
  feature_id: string;
  feature_name: string;
}

interface ModelData {
  id: string;
  name: string;
  version: string;
  mlflow_run_id: string | null;
  created_at: string;
  is_active: boolean;
  features: FeatureLink[];
}

export default function ModelsPage() {
  const [activeTab, setActiveTab] = useState<"registry" | "register">("registry");
  const [models, setModels] = useState<ModelData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Row expansion state
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  const apiKey = "supersecretkeyreplaceinproduction";

  const getHeaders = () => {
    return {
      "X-API-Key": apiKey,
    };
  };

  const fetchModels = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/models`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch registered models list.");
      }

      const data = await response.json();
      setModels(data);
    } catch (err: any) {
      console.error("Models fetch failure:", err);
      setError(err.message || "An unexpected error occurred while loading deployment registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleToggleExpand = (modelId: string) => {
    if (expandedModelId === modelId) {
      setExpandedModelId(null);
    } else {
      setExpandedModelId(modelId);
    }
  };

  const handleRegistrationSuccess = () => {
    // Refresh models list
    fetchModels();
    // Switch to Tab 2 (Model Registry)
    setActiveTab("registry");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-emerald-400" /> Model Deployment Registry
          </h1>
          <p className="text-sm text-slate-400">
            Monitor and audit machine learning schemas feeding from the feature store. Map lineage definitions directly with MLflow.
          </p>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("registry")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "registry"
                ? "bg-slate-800 text-slate-100 shadow"
                : "text-slate-450 hover:text-slate-200"
            }`}
          >
            Model Registry
          </button>
          
          <button
            onClick={() => setActiveTab("register")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "register"
                ? "bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 shadow-inner font-bold"
                : "text-slate-450 hover:text-slate-200"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> Log Model
          </button>
        </div>
      </div>

      {/* --- TAB 1: Model Registration Form --- */}
      {activeTab === "register" && (
        <ModelRegistration
          onRegistrationSuccess={handleRegistrationSuccess}
          apiKey={apiKey}
        />
      )}

      {/* --- TAB 2: Model Registry List Table --- */}
      {activeTab === "registry" && (
        <div className="space-y-6">
          
          {/* Summary error state */}
          {error && (
            <div className="p-4 rounded-xl border border-rose-900/50 bg-rose-950/20 text-xs text-rose-450 leading-relaxed font-semibold">
              Failed to sync registry: {error}
            </div>
          )}

          {/* Table Container */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400">
                    <th className="p-4">Model Name</th>
                    <th className="p-4 w-28">Version</th>
                    <th className="p-4 w-44">Linked Features</th>
                    <th className="p-4 w-52">MLflow Run ID</th>
                    <th className="p-4 w-40">Registered At</th>
                    <th className="p-4 w-12 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-350">
                  {loading && models.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 font-semibold">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-emerald-400 mb-2" />
                        Querying model schemas...
                      </td>
                    </tr>
                  ) : models.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500">
                        <Inbox className="h-8 w-8 text-slate-655 mx-auto mb-2 opacity-50" />
                        No model registrations logged. Click "Log Model" to link active features!
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => {
                      const isExpanded = expandedModelId === model.id;

                      return (
                        <React.Fragment key={model.id}>
                          <tr
                            onClick={() => handleToggleExpand(model.id)}
                            className="hover:bg-slate-900/15 cursor-pointer transition-colors"
                          >
                            {/* Name */}
                            <td className="p-4 font-bold text-slate-200 font-mono tracking-tight">
                              {model.name}
                            </td>

                            {/* Version */}
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[10px]">
                                {model.version}
                              </span>
                            </td>

                            {/* Linked Features Count */}
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 text-slate-300">
                                <Cpu className="h-3.5 w-3.5 text-violet-400" />
                                {model.features.length} active features
                              </span>
                            </td>

                            {/* MLflow Run ID */}
                            <td className="p-4 font-mono text-slate-450 text-[11px]">
                              {model.mlflow_run_id ? (
                                <span className="text-violet-400">{model.mlflow_run_id}</span>
                              ) : (
                                <span className="text-slate-600">No MLflow Link</span>
                              )}
                            </td>

                            {/* Registered timestamp */}
                            <td className="p-4 text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(model.created_at).toLocaleDateString()}
                            </td>

                            {/* Expand toggle */}
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr>
                              <td
                                colSpan={6}
                                className="p-5 bg-slate-900/30 border-b border-slate-800 text-slate-400 leading-relaxed space-y-3"
                              >
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Linked Features Lineage List
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {model.features.map((feat) => (
                                      <div
                                        key={feat.feature_id}
                                        className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl flex items-center gap-2 font-mono text-[11px]"
                                      >
                                        <Database className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                        <span className="font-bold text-slate-200 truncate">
                                          {feat.feature_name}
                                        </span>
                                      </div>
                                    ))}
                                    {model.features.length === 0 && (
                                      <span className="text-xs text-slate-600 italic">
                                        No features bound.
                                      </span>
                                    )}
                                  </div>
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
        </div>
      )}
    </div>
  );
}
