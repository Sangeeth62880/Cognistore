"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DatasetUploaderProps {
  onDiscoverTriggered: (datasetId: string) => void;
  apiKey?: string;
}

export default function DatasetUploader({
  onDiscoverTriggered,
  apiKey = "supersecretkeyreplaceinproduction",
}: DatasetUploaderProps) {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);

  // Loading & Ingestion States
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "failed">(
    "idle"
  );
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
    <div className="space-y-6 font-sans">
      {/* Error Alert Display */}
      {error && (
        <div className="rounded-[8px] border border-[#ef4444] bg-[#ef4444]/5 p-5 flex items-start gap-3.5 text-xs text-[#ef4444]">
          <AlertCircle className="h-5 w-5 text-[#ef4444] shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">File ingestion failed</h3>
            <p className="leading-relaxed opacity-95">{error}</p>
            <button
              onClick={handleReset}
              className="text-xs font-semibold underline mt-1 block hover:opacity-80"
            >
              Try uploading again
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
          className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-[12px] p-12 text-center cursor-pointer transition-all duration-300 bg-white ${
            dragActive ? "border-[#111111] bg-[#f9fafb]" : "border-[#e5e7eb] hover:bg-[#f9fafb]"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#f5f5f5] text-[#374151] mb-4">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] font-medium text-[#374151] font-sans">
            Drag and drop offline dataset
          </h3>
          <p className="text-[14px] text-[#6b7280] font-sans mt-2 max-w-sm leading-normal">
            Strictly accepts CSV format files up to 50MB. Large files are parsed sequentially in background workers.
          </p>
          <span className="btn-secondary mt-4">
            Select CSV file
          </span>
        </div>
      )}

      {/* --- Uploading / Processing State --- */}
      {(status === "uploading" || status === "processing") && file && (
        <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-8 space-y-6 text-center shadow-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#f5f5f5] text-[#374151] mx-auto">
            <RefreshCw className="h-6 w-6 animate-spin text-[#111111]" />
          </div>

          <div className="space-y-1">
            <h3 className="text-[16px] font-semibold text-[#111111] font-sans">{file.name}</h3>
            <p className="text-xs text-[#6b7280]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between text-xs font-semibold font-sans">
              <span className="text-[#6b7280]">
                {status === "uploading" ? "Uploading multipart chunks..." : "Background schema ingestion..."}
              </span>
              <span className="text-[#111111]">
                {status === "uploading" ? `${uploadProgress}%` : "Processing"}
              </span>
            </div>
            <div className="w-full bg-[#f5f5f5] h-2 rounded-full overflow-hidden border border-[#e5e7eb]">
              <div
                className={`h-full bg-[#111111] rounded-full transition-all duration-300 ${
                  status === "processing" ? "w-11/12 animate-pulse" : ""
                }`}
                style={{ width: status === "uploading" ? `${uploadProgress}%` : undefined }}
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#6b7280]">
            <span>Do not close this page. Ingesting tables in database...</span>
          </div>
        </div>
      )}

      {/* --- Completed State: Schema Report --- */}
      {status === "completed" && datasetInfo && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Action Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-[#f5f5f5] border border-[#e5e7eb] rounded-[12px] gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider font-sans">
                  Analysis complete
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#111111] font-sans">
                {datasetInfo.name}
              </h2>
              <p className="text-xs text-[#6b7280] font-sans">
                Uploaded: {new Date(datasetInfo.uploaded_at).toLocaleString()} • Rows:{" "}
                <span className="font-mono text-[#111111] font-bold">
                  {datasetInfo.row_count}
                </span>
              </p>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleReset}
                className="btn-secondary flex-1 sm:flex-none text-xs"
              >
                Reset upload
              </button>
              <button
                onClick={() => onDiscoverTriggered(datasetInfo.dataset_id)}
                className="btn-primary flex-1 sm:flex-none text-xs"
              >
                Discover features
              </button>
            </div>
          </div>

          {/* Relationships & Columns Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Detailed columns statistics list */}
            <div className="lg:col-span-2 bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-4 shadow-none">
              <h3 className="text-sm font-semibold text-[#111111] font-sans mb-2">
                Schema & Statistics Analysis
              </h3>

              <div className="w-full overflow-x-auto">
                <table className="dev-table">
                  <thead>
                    <tr>
                      <th className="p-3.5 font-sans">Column</th>
                      <th className="p-3.5 font-sans">Data type</th>
                      <th className="p-3.5 font-sans">Nulls %</th>
                      <th className="p-3.5 font-sans">Unique values</th>
                      <th className="p-3.5 font-sans">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(datasetInfo.schema_info.columns).map(
                      ([name, info]: [string, any]) => (
                        <React.Fragment key={name}>
                          <tr className="hover:bg-[#f9fafb]">
                            <td className="p-3.5 font-mono text-sm text-[#111111] font-semibold">
                              {name}
                            </td>
                            <td className="p-3.5">
                              <span className="tag-pill font-mono text-[10px]">
                                {info.dtype}
                              </span>
                            </td>
                            <td className="p-3.5 text-[#374151]">
                              {info.null_count > 0 ? (
                                <span className="text-amber-600 font-bold">
                                  {info.null_percentage}%
                                </span>
                              ) : (
                                "0%"
                              )}
                            </td>
                            <td className="p-3.5 font-mono text-[#374151]">{info.unique_count}</td>
                            <td className="p-3.5">
                              <button
                                onClick={() => toggleColDetails(name)}
                                className="p-1 text-[#6b7280] hover:text-[#111111] transition-colors"
                              >
                                {expandedCol === name ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded detail stats row */}
                          {expandedCol === name && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-4 bg-[#f8f9fa] border-b border-[#e5e7eb] text-xs font-sans text-[#374151] leading-relaxed space-y-3"
                              >
                                <div>
                                  <span className="font-semibold text-[#6b7280] block mb-1">
                                    First 5 Sample Values:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 font-mono text-[#374151]">
                                    {info.sample_values.map((v: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded bg-white border border-[#e5e7eb]"
                                      >
                                        {String(v)}
                                      </span>
                                    ))}
                                    {info.sample_values.length === 0 && (
                                      <span className="text-[#6b7280]">No values present</span>
                                    )}
                                  </div>
                                </div>

                                {info.is_numeric && info.stats && Object.keys(info.stats).length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-[#e5e7eb] text-[#374151]">
                                    <div>
                                      Mean:{" "}
                                      <span className="font-mono text-[#111111] font-bold block">
                                        {info.stats.mean?.toFixed(4) ?? "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      Std Dev:{" "}
                                      <span className="font-mono text-[#111111] font-bold block">
                                        {info.stats.std?.toFixed(4) ?? "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      Min:{" "}
                                      <span className="font-mono text-[#111111] block">
                                        {info.stats.min ?? "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      Max:{" "}
                                      <span className="font-mono text-[#111111] block">
                                        {info.stats.max ?? "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      Skewness:{" "}
                                      <span className="font-mono text-[#111111] block">
                                        {info.stats.skewness?.toFixed(4) ?? "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ingestion signals panel */}
            <div className="space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-4 shadow-none">
                <h3 className="text-sm font-semibold text-[#111111] font-sans">
                  Structure Signals
                </h3>

                {/* Highly Correlated Columns */}
                <div className="space-y-2 font-sans">
                  <span className="text-xs font-semibold text-[#6b7280] block">
                    Collinear relationships (|r| &gt; 0.7):
                  </span>
                  {datasetInfo.schema_info.relationships.highly_correlated_pairs.map(
                    (pair: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#f8f9fa] rounded-[8px] border border-[#e5e7eb] text-xs leading-normal flex items-start gap-2"
                      >
                        <div className="space-y-1 text-[#374151]">
                          <p className="font-semibold font-mono text-[#111111]">
                            {pair.column_a} &lt;-&gt; {pair.column_b}
                          </p>
                          <p className="text-[#6b7280] mt-1 text-[11px]">
                            Collinear warning: Pearson score is {pair.correlation}. Highly redundant.
                          </p>
                        </div>
                      </div>
                    )
                  )}
                  {datasetInfo.schema_info.relationships.highly_correlated_pairs.length === 0 && (
                    <p className="text-xs text-[#9ca3af] italic">
                      No collinear column pairs detected.
                    </p>
                  )}
                </div>

                <hr className="border-[#e5e7eb]" />

                {/* Entity IDs */}
                <div className="space-y-2 font-sans">
                  <span className="text-xs font-semibold text-[#6b7280] block">
                    Potential Entity IDs:
                  </span>
                  {datasetInfo.schema_info.relationships.potential_entity_ids.map(
                    (ent: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-[8px] text-xs font-mono text-[#374151]"
                      >
                        {ent.column}
                      </div>
                    )
                  )}
                  {datasetInfo.schema_info.relationships.potential_entity_ids.length === 0 && (
                    <p className="text-xs text-[#9ca3af] italic">No entity ID matches found.</p>
                  )}
                </div>

                <hr className="border-[#e5e7eb]" />

                {/* Timestamps */}
                <div className="space-y-2 font-sans">
                  <span className="text-xs font-semibold text-[#6b7280] block">
                    Potential Time Series Indices:
                  </span>
                  {datasetInfo.schema_info.relationships.potential_timestamps.map(
                    (ts: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#f8f9fa] border border-[#e5e7eb] rounded-[8px] text-xs font-mono text-[#374151] flex items-center justify-between"
                      >
                        <span>{ts.column}</span>
                        <span className="tag-pill">Temporal</span>
                      </div>
                    )
                  )}
                  {datasetInfo.schema_info.relationships.potential_timestamps.length === 0 && (
                    <p className="text-xs text-[#9ca3af] italic">No time index columns found.</p>
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
