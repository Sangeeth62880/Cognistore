import React from "react";
import { Database, Plus, Search, Folder, Calendar } from "lucide-react";

export default function DatasetsPage() {
  const datasets = [
    { name: "transactions_train_2026", path: "/data/offline/transactions_train_2026.parquet", rows: "1,240,500", schema: "18 features", uploaded: "May 22, 2026", processed: true },
    { name: "user_profiles_v4", path: "/data/offline/user_profiles_v4.parquet", rows: "450,000", schema: "12 features", uploaded: "May 18, 2026", processed: true },
    { name: "merchant_meta_eval", path: "/data/offline/merchant_meta_eval.parquet", rows: "24,000", schema: "6 features", uploaded: "May 15, 2026", processed: true },
    { name: "clickstream_raw_daily", path: "/data/offline/clickstream_raw_daily.csv", rows: "Pending", schema: "Unprocessed", uploaded: "Just now", processed: false },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-cyan-400" /> Datasets Manager
          </h1>
          <p className="text-sm text-slate-400">
            Upload offline training files, track ingestion, and generate Great Expectations validation schemas.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 transition-all shrink-0">
          <Plus className="h-4 w-4" /> Upload Dataset
        </button>
      </div>

      {/* Dataset Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datasets.map((dataset) => (
          <div key={dataset.name} className="rounded-2xl glass-panel p-6 space-y-4 hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Folder className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-200">{dataset.name}</h3>
                  <p className="text-xs text-slate-500 font-mono truncate max-w-[200px] sm:max-w-xs">{dataset.path}</p>
                </div>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                dataset.processed 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
              }`}>
                {dataset.processed ? "Processed" : "Pending Ingestion"}
              </span>
            </div>

            <hr className="border-slate-800" />

            <div className="grid grid-cols-3 gap-4 text-xs text-slate-400">
              <div className="space-y-1">
                <span>Row Count</span>
                <p className="text-sm font-bold text-slate-200 font-mono">{dataset.rows}</p>
              </div>
              <div className="space-y-1">
                <span>Schema Info</span>
                <p className="text-sm font-bold text-slate-200">{dataset.schema}</p>
              </div>
              <div className="space-y-1">
                <span>Uploaded</span>
                <p className="text-sm font-bold text-slate-200 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" /> {dataset.uploaded}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
