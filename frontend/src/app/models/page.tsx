"use client";

import React, { useState, useEffect } from "react";
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
    fetchModels();
    setActiveTab("registry");
  };

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      
      {/* Top Header Section */}
      <div className="flex flex-row items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-[#666666] uppercase tracking-wider block">
            MODEL DEPLOYMENT REGISTRY
          </span>
          <p className="text-[13px] text-[#666666] leading-normal max-w-xl">
            Monitor and audit machine learning schemas feeding from the feature store. Map lineage definitions directly.
          </p>
        </div>

        {/* Minimalist Tabs (clean layout, text accent only) */}
        <div className="flex items-center gap-4 shrink-0 font-mono text-[12px] font-semibold border-l border-[#1f1f1f] pl-4">
          <button
            onClick={() => setActiveTab("registry")}
            className={`pb-1 transition-colors duration-150 relative ${
              activeTab === "registry" ? "text-[#e8e8e8]" : "text-[#666666] hover:text-[#e8e8e8]"
            }`}
          >
            REGISTRY LIST
            {activeTab === "registry" && (
              <div className="absolute left-0 right-0 bottom-[-5px] h-[2px] bg-[#2563eb]" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("register")}
            className={`pb-1 transition-colors duration-150 relative ${
              activeTab === "register" ? "text-[#e8e8e8]" : "text-[#666666] hover:text-[#e8e8e8]"
            }`}
          >
            LOG NEW MODEL
            {activeTab === "register" && (
              <div className="absolute left-0 right-0 bottom-[-5px] h-[2px] bg-[#2563eb]" />
            )}
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
        <div className="space-y-4">
          
          {error && (
            <div className="rounded-[4px] border border-[#dc2626] bg-[#dc2626]/5 p-4 text-[12px] font-mono text-[#dc2626]">
              [ERROR] Sync failure: {error}
            </div>
          )}

          {/* Table Container */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] overflow-hidden">
            <table className="dev-table">
              <thead>
                <tr>
                  <th className="w-[30%]">Model Name</th>
                  <th className="w-[12%]">Version</th>
                  <th className="w-[20%]">Linked Features</th>
                  <th className="w-[23%]">MLflow Run ID</th>
                  <th className="w-[15%]">Registered At</th>
                </tr>
              </thead>
              <tbody>
                {loading && models.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[#666666] font-mono">
                      RETRIEVING REGISTERED MODEL SCHEMAS...
                    </td>
                  </tr>
                ) : models.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[#444444] font-mono">
                      NO MODEL SCHEMAS LOGGED IN REGISTRY.
                    </td>
                  </tr>
                ) : (
                  models.map((model) => {
                    const isExpanded = expandedModelId === model.id;

                    return (
                      <React.Fragment key={model.id}>
                        <tr
                          onClick={() => handleToggleExpand(model.id)}
                          className="cursor-pointer"
                        >
                          {/* Name */}
                          <td className="font-mono text-[#e8e8e8] font-bold">
                            {model.name}
                          </td>

                          {/* Version */}
                          <td>
                            <span className="font-mono text-[#a3e635] text-[11px]">
                              {model.version}
                            </span>
                          </td>

                          {/* Linked Features Count */}
                          <td className="font-mono text-[#e8e8e8] text-[11px]">
                            {model.features.length} FEATURES BOUND
                          </td>

                          {/* MLflow Run ID */}
                          <td className="font-mono text-[#666666] text-[11px]">
                            {model.mlflow_run_id ? (
                              <span className="text-[#a3e635]">{model.mlflow_run_id}</span>
                            ) : (
                              "NO_MLFLOW_LINK"
                            )}
                          </td>

                          {/* Registered timestamp */}
                          <td className="font-mono text-[#666666] text-[11px]">
                            {new Date(model.created_at).toLocaleDateString()}
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-4 bg-[#161616] border-t border-b border-[#1f1f1f] text-[#666666] font-mono"
                            >
                              <div className="space-y-2">
                                <span className="text-[10px] text-[#444444] font-bold uppercase tracking-wider block">
                                  LINEAGE FEATURE SCHEMAS:
                                </span>
                                <div className="flex flex-col gap-1 pl-2">
                                  {model.features.map((feat) => (
                                    <div
                                      key={feat.feature_id}
                                      className="text-xs text-[#e8e8e8]"
                                    >
                                      &bull; <span className="font-semibold text-[#a3e635]">{feat.feature_name}</span> (ID: <span className="text-[#666666]">{feat.feature_id}</span>)
                                    </div>
                                  ))}
                                  {model.features.length === 0 && (
                                    <span className="text-xs text-[#444444] italic">
                                      NO FEATURES CURRENTLY LINKED TO PIPELINE.
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
      )}
    </div>
  );
}
