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
      <div className="flex flex-row items-center justify-between border-b border-[#e5e7eb] pb-4">
        <div className="space-y-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111111] font-sans">
            Models
          </h1>
          <p className="text-[14px] text-[#6b7280] leading-normal max-w-xl font-sans mt-1">
            Monitor and audit machine learning schemas feeding from the feature store. Map lineage definitions directly.
          </p>
        </div>

        {/* Minimalist Tabs (clean layout, text accent only) */}
        <div className="flex items-center gap-4 shrink-0 font-sans text-[14px] font-medium border-l border-[#e5e7eb] pl-4">
          <button
            onClick={() => setActiveTab("registry")}
            className={`pb-1 transition-colors duration-150 relative ${
              activeTab === "registry" ? "text-[#111111]" : "text-[#6b7280] hover:text-[#111111]"
            }`}
          >
            Registry list
            {activeTab === "registry" && (
              <div className="absolute left-0 right-0 bottom-[-5px] h-[2px] bg-[#111111]" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("register")}
            className={`pb-1 transition-colors duration-150 relative ${
              activeTab === "register" ? "text-[#111111]" : "text-[#6b7280] hover:text-[#111111]"
            }`}
          >
            Log new model
            {activeTab === "register" && (
              <div className="absolute left-0 right-0 bottom-[-5px] h-[2px] bg-[#111111]" />
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
            <div className="rounded-lg border border-[#ef4444] bg-[#ef4444]/5 p-4 text-[12px] font-mono text-[#ef4444]">
              [Error] Sync failure: {error}
            </div>
          )}

          {/* Table Container */}
          <div className="w-full overflow-x-auto">
            <table className="dev-table">
              <thead>
                <tr>
                  <th className="w-[30%] font-sans">Model name</th>
                  <th className="w-[12%] font-sans">Version</th>
                  <th className="w-[20%] font-sans">Linked features</th>
                  <th className="w-[23%] font-sans">MLflow Run ID</th>
                  <th className="w-[15%] font-sans">Registered at</th>
                </tr>
              </thead>
              <tbody>
                {loading && models.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[#6b7280] font-sans text-sm">
                      Retrieving registered model schemas...
                    </td>
                  </tr>
                ) : models.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-[#6b7280] font-sans text-sm">
                      No model schemas logged in registry.
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
                          <td className="font-sans text-[#111111] font-semibold text-sm">
                            {model.name}
                          </td>

                          {/* Version */}
                          <td>
                            <span className="font-mono text-[#111111] text-[13px]">
                              {model.version}
                            </span>
                          </td>

                          {/* Linked Features Count */}
                          <td className="font-sans text-[#374151] text-sm">
                            {model.features.length} features bound
                          </td>

                          {/* MLflow Run ID */}
                          <td className="font-mono text-[#2563eb] text-[13px]">
                            {model.mlflow_run_id ? (
                              <span>{model.mlflow_run_id}</span>
                            ) : (
                              "NO_MLFLOW_LINK"
                            )}
                          </td>

                          {/* Registered timestamp */}
                          <td className="font-sans text-[#6b7280] text-xs">
                            {new Date(model.created_at).toLocaleDateString()}
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-5 bg-[#f8f9fa] border-t border-b border-[#e5e7eb] text-[#374151] font-sans leading-relaxed"
                            >
                              <div className="space-y-2">
                                <span className="text-[10px] text-[#6b7280] font-bold uppercase tracking-wider block font-sans">
                                  Lineage feature schemas:
                                </span>
                                <div className="flex flex-col gap-1 pl-2">
                                  {model.features.map((feat) => (
                                    <div
                                      key={feat.feature_id}
                                      className="text-xs text-[#374151]"
                                    >
                                      &bull; <span className="font-semibold text-[#111111]">{feat.feature_name}</span> (ID: <span className="font-mono text-[#6b7280]">{feat.feature_id}</span>)
                                    </div>
                                  ))}
                                  {model.features.length === 0 && (
                                    <span className="text-xs text-[#9ca3af] italic font-sans">
                                      No features currently linked to pipeline.
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
