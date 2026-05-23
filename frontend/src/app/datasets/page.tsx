"use client";

import React, { useState, useEffect } from "react";
import DatasetUploader from "../../components/DatasetUploader";
import FeatureSuggestions from "../../components/FeatureSuggestions";

interface DatasetRecord {
  dataset_id: string;
  name: string;
  file_path: string;
  is_processed: boolean;
  row_count: number | null;
  uploaded_at: string;
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [discoverySuggestions, setDiscoverySuggestions] = useState<any[]>([]);
  const [discovering, setDiscovering] = useState<boolean>(false);

  const apiKey = "supersecretkeyreplaceinproduction";

  const fetchUploadedDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/datasets`, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load historical datasets list.");
      }

      const list = await response.json();
      setDatasets(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred loading historical datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedDatasets();
  }, []);

  const handleDiscoverFeatures = async (id: string) => {
    setActiveDatasetId(id);
    setDiscovering(true);
    setError(null);
    setDiscoverySuggestions([]);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/datasets/${id}/discover`, {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || "AI discovery failed to execute.");
      }

      const result = await response.json();
      setDiscoverySuggestions(result.suggestions);
      
      setTimeout(() => {
        const elem = document.getElementById("feature-suggestions-container");
        if (elem) {
          elem.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);

    } catch (err: any) {
      console.error("AI Feature discovery failed:", err);
      setError(err.message || "An unexpected error occurred during feature suggestion.");
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full mx-auto font-sans">
      
      {/* Page Header */}
      <div className="border-b border-[#1f1f1f] pb-4">
        <span className="text-[11px] font-mono text-[#666666] uppercase tracking-wider block">
          AUTOMATIC FEATURE DISCOVERY
        </span>
        <p className="text-[13px] text-[#666666] leading-normal max-w-xl">
          Upload training datasets, analyze schema correlation statistics, and automatically generate optimal features via LLM discovery.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 space-y-4">
        <span className="text-[11px] font-bold text-[#e8e8e8] tracking-widest uppercase block">
          INGEST NEW OFFLINE DATASET
        </span>
        <DatasetUploader
          apiKey={apiKey}
          onDiscoverTriggered={handleDiscoverFeatures}
        />
      </div>

      {/* AI Recommendations Stream Console */}
      {(discovering || discoverySuggestions.length > 0) && (
        <div id="feature-suggestions-container" className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 space-y-4 scroll-mt-6">
          <div className="border-b border-[#1f1f1f] pb-3">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] uppercase tracking-wider font-mono">
              AI DISCOVERY ENGINE Active
            </span>
          </div>

          {discovering ? (
            <div className="py-12 text-center text-[#666666] font-mono text-xs">
               공부 SCHEMA PIPELINES... GENERATING OPTIMIZED PANDAS FORMULAS...
            </div>
          ) : (
            activeDatasetId && (
              <FeatureSuggestions
                suggestions={discoverySuggestions}
                datasetId={activeDatasetId}
                apiKey={apiKey}
              />
            )
          )}
        </div>
      )}

      {/* Upload History Table (Redesigned as Table instead of Cards) */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-3">
          <span className="text-[11px] font-bold text-[#666666] tracking-widest uppercase">
            UPLOADED DATASETS REGISTRY
          </span>
          <button
            onClick={fetchUploadedDatasets}
            disabled={loading}
            className="px-2 py-1 text-[10px] font-mono border border-[#1f1f1f] bg-transparent text-[#e8e8e8] rounded-[4px] hover:bg-[#161616]"
          >
            {loading ? "SYNCING..." : "SYNC"}
          </button>
        </div>

        {datasets.length === 0 ? (
          <div className="p-8 text-center text-[#444444] font-mono text-xs">
            NO INGESTED HISTORICAL DATASETS FOUND.
          </div>
        ) : (
          <div className="overflow-hidden border border-[#1f1f1f] rounded-[4px]">
            <table className="dev-table">
              <thead>
                <tr>
                  <th className="w-[30%]">Dataset Name</th>
                  <th className="w-[25%]">Dataset ID</th>
                  <th className="w-[12%]">Row Count</th>
                  <th className="w-[13%]">Uploaded</th>
                  <th className="w-[10%]">Status</th>
                  <th className="w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.dataset_id}>
                    <td className="font-semibold text-[#e8e8e8]">{dataset.name}</td>
                    <td className="font-mono text-[#666666] text-[11px]">{dataset.dataset_id}</td>
                    <td className="font-mono text-[#a3e635] text-[11px]">
                      {dataset.row_count !== null ? dataset.row_count.toLocaleString() : "PENDING"}
                    </td>
                    <td className="font-mono text-[#666666] text-[11px]">
                      {new Date(dataset.uploaded_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase font-mono ${
                          dataset.is_processed
                            ? "bg-[#16a34a]/10 text-[#16a34a] border border-[#16a34a]/15"
                            : "bg-[#d97706]/10 text-[#d97706] border border-[#d97706]/15"
                        }`}
                      >
                        {dataset.is_processed ? "PROCESSED" : "PENDING"}
                      </span>
                    </td>
                    <td>
                      {dataset.is_processed ? (
                        <button
                          onClick={() => handleDiscoverFeatures(dataset.dataset_id)}
                          className="px-2 py-0.5 text-[10px] font-mono bg-[#2563eb] text-white rounded-[4px] hover:bg-[#2563eb]/90"
                        >
                          DISCOVER
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-[#444444] italic">WAITING</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
