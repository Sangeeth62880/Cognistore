import React from "react";
import Link from "next/link";
import {
  Cpu,
  Database,
  Brain,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Plus,
} from "lucide-react";

export default function Home() {
  // Mock statistics representing realistic feature store status
  const stats = [
    {
      name: "Total Active Features",
      value: "142",
      change: "+12%",
      changeType: "positive",
      icon: Cpu,
      color: "from-violet-500 to-indigo-600",
    },
    {
      name: "Registered Datasets",
      value: "28",
      change: "+4 this week",
      changeType: "positive",
      icon: Database,
      color: "from-blue-500 to-cyan-600",
    },
    {
      name: "Active Models",
      value: "8",
      change: "100% serving status",
      changeType: "neutral",
      icon: Brain,
      color: "from-emerald-500 to-teal-600",
    },
    {
      name: "Drift Alerts",
      value: "2",
      change: "Critical alert detected",
      changeType: "negative",
      icon: AlertTriangle,
      color: "from-rose-500 to-red-600",
    },
  ];

  const recentFeatures = [
    { name: "user_transaction_velocity_1h", type: "fractional", entity: "user", status: "Active", updated: "3 mins ago" },
    { name: "merchant_risk_score_daily", type: "float", entity: "merchant", status: "Active", updated: "12 mins ago" },
    { name: "device_ip_country_hash", type: "categorical", entity: "device", status: "Active", updated: "1 hr ago" },
    { name: "customer_lifetime_value_v3", type: "numerical", entity: "customer", status: "Active", updated: "4 hrs ago" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-2xl glass-panel p-8 glow-indigo relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="space-y-2 relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Intelligent Feature Store
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Analyze, orchestrate, and validate features across offline and real-time inference pipelines with built-in MLflow logging, drift alerting, and Great Expectations checks.
          </p>
        </div>
        <div className="flex gap-3 relative z-10 shrink-0">
          <Link
            href="/health"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-100 transition-colors"
          >
            <Activity className="h-4 w-4" /> System Health
          </Link>
          <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition-all">
            <Plus className="h-4 w-4" /> Create Feature
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="rounded-2xl glass-card p-6 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">
                  {stat.name}
                </span>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <span className="text-3xl font-bold tracking-tight text-white">
                  {stat.value}
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <TrendingUp
                    className={`h-3.5 w-3.5 ${
                      stat.changeType === "positive"
                        ? "text-green-400"
                        : stat.changeType === "negative"
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  />
                  <span
                    className={
                      stat.changeType === "positive"
                        ? "text-green-400"
                        : stat.changeType === "negative"
                        ? "text-red-400"
                        : "text-slate-400"
                    }
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Split Panels */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Recent Features List */}
        <div className="lg:col-span-2 rounded-2xl glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-violet-400" /> Recent Feature Definitions
            </h2>
            <Link
              href="/features"
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 hover:underline"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/30">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr className="bg-slate-900/60">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Feature Name
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Entity Type
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Data Type
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentFeatures.map((feat) => (
                  <tr key={feat.name} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">
                      {feat.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 uppercase">
                      {feat.entity}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <span className="inline-flex items-center rounded-md bg-violet-400/10 px-2 py-1 text-xs font-medium text-violet-400 ring-1 ring-inset ring-violet-400/20">
                        {feat.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {feat.updated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Model Serving & Active Alerts */}
        <div className="space-y-8">
          {/* Active Model Performance Card */}
          <div className="rounded-2xl glass-panel p-6 space-y-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-400" /> Active Models
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">xgboost_fraud_detector</h3>
                    <p className="text-xs text-slate-500">MLflow Run ID: 8fd092a7e</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Active
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Version: v2.4</span>
                  <span>Drift Status: Stable</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">customer_churn_predictor</h3>
                    <p className="text-xs text-slate-500">MLflow Run ID: 41acb990f</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Active
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Version: v1.0</span>
                  <span>Drift Status: Degraded</span>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Drift Alerts Panel */}
          <div className="rounded-2xl glass-panel p-6 space-y-6 glow-red border border-rose-950/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" /> Active Alerts
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse">
                Action Required
              </span>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-rose-400">
                  <span>DRIFT_ALERT_042</span>
                  <span>Severity: HIGH</span>
                </div>
                <p className="text-sm text-slate-200 font-medium">
                  Drift detected in user_transaction_velocity_1h
                </p>
                <p className="text-xs text-slate-400">
                  Distribution shifted by KS-statistic = 0.082 (threshold = 0.05). Upstream correlations identified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
