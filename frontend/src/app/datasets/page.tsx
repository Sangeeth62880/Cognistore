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
      <div className="border-b border-[#e5e7eb] pb-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#111111] font-sans">
          Automatic Feature Discovery
        </h1>
        <p className="text-[14px] text-[#6b7280] leading-normal max-w-xl font-sans mt-1">
          Upload training datasets, analyze schema correlation statistics, and automatically generate optimal features via LLM discovery.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-4">
        <span className="text-[11px] font-medium text-[#6b7280] tracking-widest uppercase block font-sans">
          Ingest new offline dataset
        </span>
        <DatasetUploader
          apiKey={apiKey}
          onDiscoverTriggered={handleDiscoverFeatures}
        />
      </div>

      {/* AI Recommendations Stream Console */}
      {(discovering || discoverySuggestions.length > 0) && (
        <div id="feature-suggestions-container" className="bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-4 scroll-mt-6">
          <div className="border-b border-[#e5e7eb] pb-3 flex justify-between items-center">
            <span className="tag-pill font-sans text-xs">
              AI discovery engine active
            </span>
          </div>

          {discovering ? (
            <div className="py-12 text-center text-[#6b7280] font-sans text-sm animate-pulse">
              Parsing schema pipelines... generating optimized pandas formulas...
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

      {/* Upload History Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
          <span className="text-[11px] font-medium text-[#6b7280] tracking-widest uppercase font-sans">
            Uploaded Datasets Registry
          </span>
          <button
            onClick={fetchUploadedDatasets}
            disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {loading ? "Syncing..." : "Sync history"}
          </button>
        </div>

        {datasets.length === 0 ? (
          <div className="p-8 text-center text-[#6b7280] font-sans text-sm">
            No ingested historical datasets found.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="dev-table">
              <thead>
                <tr>
                  <th className="w-[30%] font-sans">Dataset name</th>
                  <th className="w-[25%] font-sans">Dataset ID</th>
                  <th className="w-[12%] font-sans">Row count</th>
                  <th className="w-[13%] font-sans">Uploaded</th>
                  <th className="w-[10%] font-sans">Status</th>
                  <th className="w-[10%] font-sans">Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.dataset_id}>
                    <td className="font-sans text-[#111111] font-semibold text-sm">{dataset.name}</td>
                    <td className="font-mono text-[#6b7280] text-[11px]">{dataset.dataset_id}</td>
                    <td className="font-mono text-[#111111] text-[12px]">
                      {dataset.row_count !== null ? dataset.row_count.toLocaleString() : "Pending"}
                    </td>
                    <td className="font-sans text-[#374151] text-sm">
                      {new Date(dataset.uploaded_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold font-sans inline-flex items-center ${
                          dataset.is_processed
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {dataset.is_processed ? "Processed" : "Pending"}
                      </span>
                    </td>
                    <td>
                      {dataset.is_processed ? (
                        <button
                          onClick={() => handleDiscoverFeatures(dataset.dataset_id)}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          Discover
                        </button>
                      ) : (
                        <span className="text-[11px] font-sans text-[#9ca3af] italic">Waiting</span>
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

