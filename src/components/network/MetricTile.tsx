interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: "sky" | "purple" | "red";
}

export function MetricTile({ label, value, sub, accent = "sky" }: Props) {
  const color =
    accent === "red"
      ? "text-red-300 border-red-500/30 bg-red-500/5"
      : accent === "purple"
        ? "text-purple-300 border-purple-500/30 bg-purple-500/5"
        : "text-sky-300 border-sky-500/30 bg-sky-500/5";

  return (
    <div className={`col-span-12 sm:col-span-6 lg:col-span-3 rounded-md border ${color} p-3 relative overflow-hidden`}>
      <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-mono font-bold tracking-wider">{value}</div>
      {sub && <div className="mt-1 text-[10px] font-mono tracking-widest text-slate-500">{sub}</div>}
      <div className="absolute -right-6 -bottom-6 size-16 rounded-full bg-current opacity-5" />
    </div>
  );
}
