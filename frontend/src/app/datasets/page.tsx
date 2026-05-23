"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Search,
  Folder,
  Calendar,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Cpu,
} from "lucide-react";
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

  // Active Discovery states
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
      
      // Smooth scroll to suggestions block
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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Database className="h-6 w-6 text-cyan-400" /> Automatic Feature Discovery
        </h1>
        <p className="text-sm text-slate-400">
          Upload offline training files, analyze card skewness, detect correlations, and let AI discover production-grade pandas features automatically.
        </p>
      </div>

      {/* Primary Grid Layout */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Upload Zone Component */}
        <div className="rounded-2xl glass-panel p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-cyan-400" /> Ingest & Analyze New Dataset
          </h3>
          <DatasetUploader
            apiKey={apiKey}
            onDiscoverTriggered={handleDiscoverFeatures}
          />
        </div>

        {/* Discovery suggestions Container Panel */}
        {(discovering || discoverySuggestions.length > 0) && (
          <div id="feature-suggestions-container" className="rounded-2xl glass-panel p-6 space-y-6 scroll-mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-4 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 uppercase tracking-wider">
                  AI RECOMMENDATIONS
                </span>
                <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-cyan-400" /> Recommended ML Features
                </h3>
              </div>
            </div>

            {discovering ? (
              <div className="p-12 text-center space-y-4">
                <RefreshCw className="h-10 w-10 text-cyan-400 animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Claude is studying your schema...</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Analyzing column relationships and data metrics to recommend 8 optimized, non-obvious features. (This takes 15-20 seconds).
                  </p>
                </div>
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

        {/* Historical upload registry list */}
        <div className="rounded-2xl glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Folder className="h-4.5 w-4.5 text-cyan-400" /> Upload History Registry
            </h3>
            <button
              onClick={fetchUploadedDatasets}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-200 hover:border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {datasets.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
              <p className="text-xs text-slate-500">No historical uploaded datasets found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {datasets.map((dataset) => (
                <div
                  key={dataset.dataset_id}
                  className="rounded-xl border border-slate-850 bg-slate-950/20 p-5 space-y-4 hover:border-cyan-500/30 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                          <Folder className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 truncate">{dataset.name}</h4>
                          <span className="text-[9px] text-slate-500 font-mono truncate block max-w-[200px]">ID: {dataset.dataset_id}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                          dataset.is_processed
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                        }`}
                      >
                        {dataset.is_processed ? "Processed" : "Pending Ingestion"}
                      </span>
                    </div>

                    <hr className="border-slate-900" />

                    <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-400 font-mono">
                      <div className="space-y-0.5">
                        <span>Row Count</span>
                        <p className="text-xs font-bold text-slate-200">
                          {dataset.row_count !== null ? dataset.row_count.toLocaleString() : "Analyzing"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span>Uploaded</span>
                        <p className="text-xs font-bold text-slate-250 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" /> {new Date(dataset.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {dataset.is_processed && (
                    <button
                      onClick={() => handleDiscoverFeatures(dataset.dataset_id)}
                      className="w-full mt-4 py-2 text-[10px] font-bold rounded-lg bg-cyan-600/10 border border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400 uppercase tracking-wider transition-all"
                    >
                      Analyze & Propose Features
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
