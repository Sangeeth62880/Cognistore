"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database,
  Calendar,
  AlertTriangle,
  HelpCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DatasetUploaderProps {
  onDiscoverTriggered: (datasetId: string) => void;
  apiKey?: string;
}

export default function DatasetUploader({ onDiscoverTriggered, apiKey = "supersecretkeyreplaceinproduction" }: DatasetUploaderProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Loading & Ingestion States
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [expandedCol, setExpandedCol] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeaders = () => {
    return {
      "X-API-Key": apiKey,
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Unsupported File Extension. Only plain text CSV (.csv) files are accepted.");
      return false;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File is too large. Maximum size allowed is 50MB.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        uploadFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        uploadFile(selectedFile);
      }
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadFile = async (targetFile: File) => {
    setStatus("uploading");
    setUploadProgress(10);
    setError(null);

    const formData = new FormData();
    formData.append("file", targetFile);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Simulate progressive upload steps
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return prev + 15;
        });
      }, 300);

      const response = await fetch(`${apiUrl}/datasets/upload`, {
        method: "POST",
        headers: getHeaders(),
        body: formData,
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.message || errJson.detail || "Upload execution failed.");
      }

      const uploadResult = await response.json();
      setUploadProgress(100);
      setDatasetId(uploadResult.dataset_id);
      setStatus("processing");
      
      // Begin background polling
      startStatusPolling(uploadResult.dataset_id);

    } catch (err: any) {
      console.error("Dataset upload failed:", err);
      setStatus("failed");
      setError(err.message || "An unexpected network error occurred during CSV upload.");
    }
  };

  const startStatusPolling = (id: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/datasets/${id}/status`, {
          headers: getHeaders(),
        });
        
        if (!response.ok) {
          throw new Error("Polling status endpoint failed.");
        }

        const data = await response.json();
        
        if (data.is_processed) {
          clearInterval(intervalId);
          setDatasetInfo(data);
          setStatus("completed");
        }
      } catch (pollErr) {
        console.warn("Ingestion status poll issue:", pollErr);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleReset = () => {
    setFile(null);
    setDatasetId(null);
    setDatasetInfo(null);
    setUploadProgress(0);
    setStatus("idle");
    setError(null);
    setExpandedCol(null);
  };

  const toggleColDetails = (colName: string) => {
    if (expandedCol === colName) {
      setExpandedCol(null);
    } else {
      setExpandedCol(colName);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert Display */}
      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex items-start gap-3.5 glow-red">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">File Ingestion Failed</h3>
            <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
            <button onClick={handleReset} className="text-xs text-rose-400 underline font-semibold mt-1 block">
              Try Uploading Again
            </button>
          </div>
        </div>
      )}

      {/* --- Idle State: Drag & Drop Zone --- */}
      {status === "idle" && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? "border-cyan-500 bg-cyan-950/20 glow-cyan scale-[1.01]"
              : "border-slate-800 bg-slate-900/10 hover:border-slate-700/80 hover:bg-slate-900/30"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4 shadow-inner">
            <Upload className="h-8 w-8" />
          </div>
          <h3 className="text-md font-bold text-slate-200">Drag and Drop offline dataset</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm">
            Strictly accepts CSV format files up to 50MB. Large files are parsed sequentially in background workers.
          </p>
          <span className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 shadow">
            Select Training CSV
          </span>
        </div>
      )}

      {/* --- Uploading / Processing State --- */}
      {(status === "uploading" || status === "processing") && file && (
        <div className="rounded-2xl glass-panel p-8 space-y-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto border border-cyan-500/20 shadow-md">
            <FileSpreadsheet className="h-6 w-6 animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-md font-bold text-slate-200">{file.name}</h3>
            <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">
                {status === "uploading" ? "Uploading multipart chunk data..." : "Background schema ingestion..."}
              </span>
              <span className="text-cyan-400">
                {status === "uploading" ? `${uploadProgress}%` : "Processing"}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full bg-cyan-600 rounded-full transition-all duration-300 ${
                  status === "processing" ? "w-11/12 animate-pulse" : ""
                }`}
                style={{ width: status === "uploading" ? `${uploadProgress}%` : undefined }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-500" />
            <span>Do not close this page. Ingesting tables in database...</span>
          </div>
        </div>
      )}

      {/* --- Completed State: Schema Report --- */}
      {status === "completed" && datasetInfo && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Header Action Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-900/40 rounded-2xl border border-slate-800 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Analysis Complete</span>
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" /> {datasetInfo.name}
              </h2>
              <p className="text-xs text-slate-500">
                Uploaded: {new Date(datasetInfo.uploaded_at).toLocaleString()} • Rows: <span className="font-mono text-slate-300 font-bold">{datasetInfo.row_count}</span>
              </p>
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Reset Upload
              </button>
              <button
                onClick={() => onDiscoverTriggered(datasetInfo.dataset_id)}
                className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 transition-all font-bold flex items-center justify-center gap-1.5"
              >
                <BarChart2 className="h-4 w-4" /> Discover Features
              </button>
            </div>
          </div>

          {/* Relationships & Column Flags Sidebar panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Detailed columns statistics list */}
            <div className="lg:col-span-2 rounded-2xl glass-panel p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-4 w-4 text-cyan-400" /> Schema & Statistics Analysis
              </h3>
              
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400">
                        <th className="p-3.5">Column</th>
                        <th className="p-3.5">Data Type</th>
                        <th className="p-3.5">Nulls %</th>
                        <th className="p-3.5">Unique values</th>
                        <th className="p-3.5">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {Object.entries(datasetInfo.schema_info.columns).map(([name, info]: [string, any]) => (
                        <React.Fragment key={name}>
                          <tr className="hover:bg-slate-900/20 transition-colors">
                            <td className="p-3.5 font-semibold text-slate-200 font-mono">{name}</td>
                            <td className="p-3.5"><span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono text-[10px]">{info.dtype}</span></td>
                            <td className="p-3.5 text-slate-400">
                              {info.null_count > 0 ? (
                                <span className="text-amber-400 font-bold">{info.null_percentage}%</span>
                              ) : (
                                "0%"
                              )}
                            </td>
                            <td className="p-3.5 font-mono">{info.unique_count}</td>
                            <td className="p-3.5">
                              <button
                                onClick={() => toggleColDetails(name)}
                                className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
                              >
                                {expandedCol === name ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded detail stats row */}
                          {expandedCol === name && (
                            <tr>
                              <td colSpan={5} className="p-4 bg-slate-900/30 border-b border-slate-800 text-[11px] leading-relaxed space-y-3">
                                <div>
                                  <span className="font-semibold text-slate-400 block mb-1">First 5 Sample Values:</span>
                                  <div className="flex flex-wrap gap-1.5 font-mono text-slate-300">
                                    {info.sample_values.map((v: any, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800/60">
                                        {String(v)}
                                      </span>
                                    ))}
                                    {info.sample_values.length === 0 && <span className="text-slate-600">No values present</span>}
                                  </div>
                                </div>

                                {info.is_numeric && info.stats && Object.keys(info.stats).length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-slate-800/60 text-slate-400">
                                    <div>Mean: <span className="font-mono text-slate-300 font-bold block">{info.stats.mean?.toFixed(4) ?? "N/A"}</span></div>
                                    <div>Std Dev: <span className="font-mono text-slate-300 font-bold block">{info.stats.std?.toFixed(4) ?? "N/A"}</span></div>
                                    <div>Min: <span className="font-mono text-slate-300 block">{info.stats.min ?? "N/A"}</span></div>
                                    <div>Max: <span className="font-mono text-slate-300 block">{info.stats.max ?? "N/A"}</span></div>
                                    <div>Skewness: <span className="font-mono text-slate-300 block">{info.stats.skewness?.toFixed(4) ?? "N/A"}</span></div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Ingestion warning and relations side cards */}
            <div className="space-y-6">
              
              {/* Warnings and Relationships Panel */}
              <div className="rounded-2xl glass-panel p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-cyan-400" /> Structure Signals
                </h3>

                {/* Highly Correlated Columns */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">Collinear relationships (|r| &gt; 0.7):</span>
                  {datasetInfo.schema_info.relationships.highly_correlated_pairs.map((pair: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] leading-normal flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-semibold text-slate-300 font-mono">{pair.column_a} &lt;-&gt; {pair.column_b}</p>
                        <p className="text-slate-500 mt-1">Collinear warning: Pearson score is {pair.correlation}. Highly redundant.</p>
                      </div>
                    </div>
                  ))}
                  {datasetInfo.schema_info.relationships.highly_correlated_pairs.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No collinear column pairs detected.</p>
                  )}
                </div>

                <hr className="border-slate-800" />

                {/* Entity IDs */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">Potential Entity IDs:</span>
                  {datasetInfo.schema_info.relationships.potential_entity_ids.map((ent: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300">
                      {ent.column}
                    </div>
                  ))}
                  {datasetInfo.schema_info.relationships.potential_entity_ids.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No entity ID matches found.</p>
                  )}
                </div>

                <hr className="border-slate-800" />

                {/* Timestamps */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 block">Potential Time Series Indices:</span>
                  {datasetInfo.schema_info.relationships.potential_timestamps.map((ts: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 flex items-center justify-between">
                      <span>{ts.column}</span>
                      <span className="text-[10px] text-cyan-400 font-semibold uppercase">Temporal</span>
                    </div>
                  ))}
                  {datasetInfo.schema_info.relationships.potential_timestamps.length === 0 && (
                    <p className="text-xs text-slate-600 italic">No time index columns found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
