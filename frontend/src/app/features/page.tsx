import Link from "next/link";
import { Cpu, Search, Plus, Filter, Tag } from "lucide-react";

export default function FeaturesPage() {
  const featuresList = [
    { name: "user_transaction_velocity_1h", entity: "user", type: "fractional", desc: "Number of transactions completed in the last hour", tags: ["fraud", "real-time"], version: 2 },
    { name: "merchant_risk_score_daily", entity: "merchant", type: "float", desc: "Calculated daily risk estimation of the merchant", tags: ["risk", "batch"], version: 1 },
    { name: "device_ip_country_hash", entity: "device", type: "categorical", desc: "Hashed country indicator derived from login IP", tags: ["security"], version: 1 },
    { name: "customer_lifetime_value_v3", entity: "customer", type: "numerical", desc: "Estimated lifetime value based on model v3", tags: ["marketing", "offline"], version: 3 },
    { name: "user_failed_login_count_5m", entity: "user", type: "integer", desc: "Count of failed login attempts in past 5 minutes", tags: ["security", "real-time"], version: 1 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-violet-400" /> Feature Registry
          </h1>
          <p className="text-sm text-slate-400">
            Define, register, and serve machine learning features across offline and online stores.
          </p>
        </div>
        <Link href="/features/new">
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition-all shrink-0">
            <Plus className="h-4 w-4" /> Register Feature
          </button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search features by name, entity, tags..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl outline-none text-slate-200 transition-all placeholder:text-slate-500"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:bg-slate-800/60 transition-colors">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Features List Table */}
      <div className="rounded-2xl glass-panel p-6">
        <div className="overflow-x-auto border border-slate-800/80 bg-slate-900/30 rounded-xl">
          <table className="min-w-full divide-y divide-slate-800">
            <thead>
              <tr className="bg-slate-900/60">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Feature Details
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Version
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {featuresList.map((feat) => (
                <tr key={feat.name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-slate-200 block">{feat.name}</span>
                      <span className="text-xs text-slate-400 block max-w-lg">{feat.desc}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 uppercase font-mono">
                    {feat.entity}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-indigo-400/10 px-2.5 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/20">
                      {feat.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {feat.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-300 font-medium">
                          <Tag className="h-2.5 w-2.5 text-violet-400" /> {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">
                    v{feat.version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
