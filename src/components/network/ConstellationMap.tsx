import { useMemo } from "react";
import type { MeshNode, MeshTunnel } from "@/types/mesh";

interface Props {
  nodes: MeshNode[];
  tunnels: MeshTunnel[];
  compromised: Set<string>;
  severed: Set<string>;
  underAttack: boolean;
  onHover: (id: string | null) => void;
  hoverId: string | null;
}

export function ConstellationMap({
  nodes,
  tunnels,
  compromised,
  severed,
  underAttack,
  onHover,
  hoverId,
}: Props) {
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(56,189,248,0.10), transparent 60%), radial-gradient(ellipse at 50% 55%, rgba(168,85,247,0.06), transparent 70%)",
        }}
      />

      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[18, 30, 42].map((rr) => (
          <ellipse
            key={rr}
            cx="50"
            cy="55"
            rx={rr}
            ry={rr * 0.6}
            fill="none"
            stroke="rgba(56,189,248,0.08)"
            strokeWidth="0.1"
          />
        ))}
      </svg>

      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tunnel-ok" x1="0" x2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="tunnel-bad" x1="0" x2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {tunnels.map((t) => {
          const a = byId[t.from];
          const b = byId[t.to];
          if (!a || !b) return null;
          const key = `${t.from}->${t.to}`;
          const isSevered = severed.has(key);
          const hot = (a.kind === "unknown" || b.kind === "unknown") && underAttack;
          return (
            <g key={key} className={isSevered ? "opacity-0 transition-opacity duration-700" : "opacity-100"}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? "url(#tunnel-bad)" : "url(#tunnel-ok)"}
                strokeWidth="0.18"
                vectorEffect="non-scaling-stroke"
              />
              <circle r="0.5" fill={hot ? "#ef4444" : "#bae6fd"}>
                <animateMotion
                  dur={`${1.8 + ((a.x + b.y) % 4) * 0.3}s`}
                  repeatCount="indefinite"
                  path={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                />
              </circle>
            </g>
          );
        })}
      </svg>

      {nodes.map((n) => {
        const compromisedNow = compromised.has(n.id) && underAttack;
        const tone =
          compromisedNow || (n.kind === "unknown" && underAttack)
            ? "red"
            : n.kind === "unknown"
              ? "purple"
              : "sky";
        const dim = n.kind === "core" ? "size-16" : "size-11";
        const ring =
          tone === "red"
            ? "border-red-500 bg-red-500/15 shadow-[0_0_24px] shadow-red-500/60"
            : tone === "purple"
              ? "border-purple-400 bg-purple-500/15 shadow-[0_0_20px] shadow-purple-500/40"
              : "border-sky-400 bg-sky-500/10 shadow-[0_0_20px] shadow-sky-500/40";
        return (
          <button
            type="button"
            key={n.id}
            onMouseEnter={() => onHover(n.id)}
            onMouseLeave={() => onHover(null)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
          >
            <div
              className={`relative grid place-items-center rounded-full border transition-all duration-500 ${ring} ${dim} ${
                compromisedNow ? "animate-pulse" : ""
              }`}
            >
              <div
                className={`size-2 rounded-full ${
                  tone === "red" ? "bg-red-400" : tone === "purple" ? "bg-purple-300" : "bg-sky-300"
                }`}
              />
              {n.kind === "core" && (
                <div className="absolute inset-1 rounded-full border border-sky-400/30 animate-[spin_18s_linear_infinite]" />
              )}
            </div>
            <div
              className={`absolute left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-[9px] font-mono tracking-[0.2em] ${
                tone === "red" ? "text-red-300" : tone === "purple" ? "text-purple-300" : "text-sky-300"
              }`}
            >
              {n.hostname}
            </div>
            {hoverId === n.id && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-5 w-56 rounded border border-slate-700 bg-slate-950/90 p-2 text-left text-[10px] font-mono text-slate-300 z-30">
                <div className="text-sky-300">{n.hostname}</div>
                <div className="text-slate-500">cidr {n.cidr}</div>
                <div className="text-slate-500">region {n.region}</div>
                <div className="text-slate-500">
                  state{" "}
                  <span className={compromisedNow ? "text-red-400" : "text-sky-300"}>
                    {compromisedNow ? "compromised" : "healthy"}
                  </span>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
