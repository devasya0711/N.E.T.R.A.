import { useMemo } from "react";
import { usePotholeList } from "../hooks/usePotholes";

// ── Cost estimation constants ─────────────────────────────────────────────────
const ASPHALT_DENSITY_KG_M3 = 2400;
const ASPHALT_PRICE_PER_KG = 7.5; // INR
const LABOR_COST_PER_POTHOLE = 1200; // INR
const EQUIPMENT_COST_PER_POTHOLE = 800; // INR
const OVERHEAD_MULTIPLIER = 1.15;

function estimateCost(depthCm, diameterCm) {
  if (!depthCm || !diameterCm) return { volume: 0, weight: 0, materialCost: 0, totalCost: 0 };
  const rM = (diameterCm / 100) / 2;
  const dM = depthCm / 100;
  const volumeM3 = Math.PI * rM * rM * dM;
  const weightKg = volumeM3 * ASPHALT_DENSITY_KG_M3;
  const materialCost = weightKg * ASPHALT_PRICE_PER_KG;
  const totalCost = (materialCost + LABOR_COST_PER_POTHOLE + EQUIPMENT_COST_PER_POTHOLE) * OVERHEAD_MULTIPLIER;
  return {
    volume: +(volumeM3 * 1000).toFixed(2), // liters
    weight: +weightKg.toFixed(2),
    materialCost: Math.round(materialCost),
    totalCost: Math.round(totalCost),
  };
}

export default function CostEstimatorPage() {
  const { potholes, loading } = usePotholeList({ limit: 200 });

  const estimates = useMemo(() => {
    const active = potholes.filter((p) => p.severity !== "REPAIRED" && p.status !== "Fixed");
    return active.map((p) => ({
      ...p,
      est: estimateCost(p.depth, p.diameter),
    })).sort((a, b) => b.est.totalCost - a.est.totalCost);
  }, [potholes]);

  const totals = useMemo(() => {
    const totalMaterial = estimates.reduce((s, e) => s + e.est.materialCost, 0);
    const totalCost = estimates.reduce((s, e) => s + e.est.totalCost, 0);
    const totalWeight = estimates.reduce((s, e) => s + e.est.weight, 0);
    const totalVolume = estimates.reduce((s, e) => s + e.est.volume, 0);
    return { totalMaterial, totalCost, totalWeight: +totalWeight.toFixed(1), totalVolume: +totalVolume.toFixed(1) };
  }, [estimates]);

  if (loading) return <div className="text-center py-12 text-slate-500">Calculating material estimates...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Material Cost Estimator</h1>
        <p className="text-xs text-slate-500 mt-1">
          Calculates approximate asphalt requirements and budget needs based on bounding box dimensions of detected potholes
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Potholes to Repair</p>
          <p className="text-3xl font-black text-blue-900 mt-1">{estimates.length}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Asphalt Needed</p>
          <p className="text-3xl font-black text-slate-700 mt-1">{totals.totalWeight.toLocaleString()} kg</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{totals.totalVolume.toLocaleString()} liters</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Material Cost</p>
          <p className="text-3xl font-black text-amber-600 mt-1">₹{totals.totalMaterial.toLocaleString()}</p>
        </div>
        <div className="netra-panel p-5">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Budget (incl. labor)</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">₹{totals.totalCost.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Includes 15% overhead</p>
        </div>
      </div>

      {/* Cost formula */}
      <div className="netra-panel p-5">
        <h3 className="text-xs font-bold text-slate-700 mb-2">Cost Estimation Formula</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] text-slate-400 uppercase">Asphalt Volume</p>
            <p className="font-mono text-slate-700 mt-1">π × (d/2)² × depth</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] text-slate-400 uppercase">Asphalt Density</p>
            <p className="font-mono text-slate-700 mt-1">{ASPHALT_DENSITY_KG_M3.toLocaleString()} kg/m³</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] text-slate-400 uppercase">Material Price</p>
            <p className="font-mono text-slate-700 mt-1">₹{ASPHALT_PRICE_PER_KG}/kg</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] text-slate-400 uppercase">Labor + Equipment</p>
            <p className="font-mono text-slate-700 mt-1">₹{(LABOR_COST_PER_POTHOLE + EQUIPMENT_COST_PER_POTHOLE).toLocaleString()}/unit</p>
          </div>
        </div>
      </div>

      {/* Per-pothole table */}
      <div className="netra-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-700">Per-Pothole Cost Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">ID</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Location</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Depth</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Diameter</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Volume</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Weight</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Material ₹</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Total ₹</th>
              </tr>
            </thead>
            <tbody>
              {estimates.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-bold text-blue-900">{p.id}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-600 max-w-[200px] truncate">{p.location || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{p.depth || 0} cm</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{p.diameter || 0} cm</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{p.est.volume} L</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{p.est.weight} kg</td>
                  <td className="px-4 py-3 text-xs font-semibold text-amber-600">₹{p.est.materialCost.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-600">₹{p.est.totalCost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td colSpan={6} className="px-4 py-3 text-xs font-black text-slate-700 text-right">TOTAL</td>
                <td className="px-4 py-3 text-xs font-black text-amber-600">₹{totals.totalMaterial.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-black text-emerald-600">₹{totals.totalCost.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
