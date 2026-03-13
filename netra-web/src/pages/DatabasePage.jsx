import PotholeTable from "../components/PotholeTable";

export default function DatabasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Pothole Database</h1>
        <p className="text-sm text-slate-500 mt-1">
          Full lifecycle records — detection → complaint filing → verification. Searchable and sortable.
        </p>
      </div>
      <PotholeTable />
    </div>
  );
}
