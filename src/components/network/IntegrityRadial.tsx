interface Props {
  value: number;
  alarming: boolean;
}

export function IntegrityRadial({ value, alarming }: Props) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const stroke = alarming ? "#f87171" : "#38bdf8";

  return (
    <div className="relative size-24">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} stroke="rgb(30 41 59)" strokeWidth="6" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
          style={{ filter: `drop-shadow(0 0 6px ${stroke})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          <div className={`text-xl font-mono font-bold ${alarming ? "text-red-300" : "text-sky-300"}`}>
            {Math.round(value)}%
          </div>
          <div className="text-[8px] font-mono tracking-widest text-slate-500">INTEGRITY</div>
        </div>
      </div>
    </div>
  );
}
