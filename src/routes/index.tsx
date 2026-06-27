import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { ConstellationMap } from "@/components/network/ConstellationMap";
import { CornerBrackets } from "@/components/network/CornerBrackets";
import { IntegrityRadial } from "@/components/network/IntegrityRadial";
import { MetricTile } from "@/components/network/MetricTile";
import { StarField } from "@/components/network/StarField";
import { intrusionRoster, meshNodes, meshTunnels, seedAuditFeed } from "@/data/mesh-fixtures";
import { formatHms, useTelemetry } from "@/hooks/useTelemetry";
import { kernelLine, nowHms } from "@/lib/kernel-log";
import { meshRelay, type MeshControlMessage } from "@/services/meshRelay";
import type { AuditEvent, IntrusionRow } from "@/types/mesh";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Astraeus Command · zero-trust mesh" },
      {
        name: "description",
        content:
          "Operator console for live zero-trust mesh visibility, intrusion containment, and post-event audit.",
      },
      { property: "og:title", content: "Astraeus Command" },
      {
        property: "og:description",
        content: "Operator console for live zero-trust mesh visibility and intrusion containment.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Sora:wght@400;700;800&family=Space+Mono:wght@400;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
      },
    ],
  }),
  component: CommandConsole,
});

const DEFAULT_BREACH = ["sec-edge-unknown-node-04", "node-al-01"];

function CommandConsole() {
  const [underAttack, setUnderAttack] = useState(false);
  const [detectedAt, setDetectedAt] = useState<number | null>(null);
  const [activeCluster, setActiveCluster] = useState("helios-1");
  const [activeNav, setActiveNav] = useState("Secure Tunnels");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [intrusions, setIntrusions] = useState<IntrusionRow[]>(intrusionRoster);
  const [audit, setAudit] = useState<AuditEvent[]>(seedAuditFeed);
  const [compromised, setCompromised] = useState<Set<string>>(() => new Set());

  const { sample, resetIntegrity } = useTelemetry({ underAttack });

  const severed = useMemo(() => {
    if (compromised.size === 0) return new Set<string>();
    return new Set(
      meshTunnels
        .filter((t) => compromised.has(t.from) || compromised.has(t.to))
        .map((t) => `${t.from}->${t.to}`),
    );
  }, [compromised]);

  function triggerIntrusion(targets: string[]) {
    const ts = nowHms();
    const targetNode = meshNodes.find((n) => n.id === targets[0]);
    const source = targetNode?.hostname ?? "sec-edge-unknown-node-04";
    setCompromised(new Set(targets));
    setUnderAttack(true);
    setDetectedAt(Date.now());
    setIntrusions((prev) =>
      prev.map((row) =>
        targets.includes("sec-edge-unknown-node-04") &&
        (row.peer === "sec-edge-unknown-node-04" || row.peer === "AS-66613")
          ? { ...row, active: true }
          : targets.some((t) => row.peer.includes(t))
            ? { ...row, active: true }
            : row,
      ),
    );
    setAudit((prev) => {
      const incoming: AuditEvent[] = [
        {
          ts,
          evt: nextEvtId(prev),
          proto: "wireguard",
          source,
          detail: "invalid handshake mac1; peer fingerprint mismatch",
          action: "QUARANTINE",
          severity: "crit",
        },
        {
          ts,
          evt: nextEvtId(prev, 1),
          proto: "ztna",
          source,
          detail: "trust score 0.12 < policy threshold 0.7",
          action: "DROPPED",
          severity: "crit",
        },
      ];
      return [...incoming, ...prev];
    });
  }

  function resetMesh() {
    const ts = nowHms();
    setUnderAttack(false);
    setDetectedAt(null);
    setCompromised(new Set());
    resetIntegrity(98);
    setIntrusions((prev) => prev.map((row) => ({ ...row, active: false })));
    setAudit((prev) => [
      {
        ts,
        evt: nextEvtId(prev),
        proto: "wireguard",
        source: "core-db-cluster-primary",
        detail: "mesh rekey complete; all peers re-attested",
        action: "ALLOWED",
        severity: "info",
      },
      ...prev,
    ]);
  }

  // wire the relay so a controller (admin panel / second tab) can drive
  // this dashboard remotely. Local intrusion buttons also flow through here
  // via meshRelay.send(), giving us a single state-mutation entry point.
  useEffect(() => {
    meshRelay.start();
    const off = meshRelay.on((msg: MeshControlMessage) => {
      switch (msg.action) {
        case "compromise":
          if (msg.nodeId) triggerIntrusion([msg.nodeId]);
          break;
        case "intrusion":
          triggerIntrusion(DEFAULT_BREACH);
          break;
        case "release":
        case "heal":
          resetMesh();
          break;
      }
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function simulateIntrusion() {
    meshRelay.send("intrusion");
  }
  function healTunnels() {
    meshRelay.send("heal");
  }

  const elapsed = detectedAt ? formatHms(Date.now() - detectedAt) : "00:00:00";
  const tempWarn = sample.coreTempC > 80;
  const liveTunnels = meshTunnels.length - severed.size;

  return (
    <div className="min-h-screen w-full bg-[#04070f] text-slate-200 font-[Sora,sans-serif] overflow-hidden relative">
      <StarField />
      <div className="relative z-10 grid grid-cols-12 gap-3 p-3 min-h-screen">
        <aside className="col-span-12 lg:col-span-2 flex flex-col gap-3">
          <div className="rounded-md border border-sky-500/20 bg-slate-900/60 backdrop-blur p-4">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_2px] shadow-sky-400/70" />
              <div className="font-mono text-[10px] tracking-[0.3em] text-sky-400">ASTRAEUS</div>
            </div>
            <h1 className="mt-1 text-lg font-extrabold tracking-[0.18em] text-slate-100">COMMAND</h1>
            <p className="mt-1 text-[10px] font-mono tracking-widest text-slate-500">ZERO-TRUST MESH · v4.21</p>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] font-mono tracking-widest text-slate-500 mb-2">CLUSTERS</div>
            <div className="flex flex-col gap-1">
              {["helios-1", "lunar-base", "void-sat"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCluster(c)}
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-[11px] font-mono tracking-wider transition ${
                    activeCluster === c
                      ? "bg-sky-500/10 text-sky-300 border border-sky-500/30"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <span>{c}</span>
                  <span className={`size-1.5 rounded-full ${activeCluster === c ? "bg-sky-400" : "bg-slate-600"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-purple-500/20 bg-slate-900/60 p-3">
            <div className="text-[10px] font-mono tracking-widest text-purple-300/80 mb-2">OPERATOR</div>
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-md bg-gradient-to-br from-purple-500/40 to-sky-500/30 grid place-items-center font-mono text-xs text-purple-200 border border-purple-400/30">
                07
              </div>
              <div className="leading-tight">
                <div className="text-xs font-semibold text-slate-100">node-07</div>
                <div className="text-[10px] font-mono text-slate-500">sector alpha-9</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center">
              {[
                ["clr", "L5"],
                ["upt", "47d"],
                ["key", "OK"],
              ].map(([k, v]) => (
                <div key={k} className="rounded bg-slate-950/60 p-1.5 border border-slate-800">
                  <div className="text-[8px] tracking-widest text-slate-500 font-mono">{k}</div>
                  <div className="text-[10px] text-slate-200 font-mono">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <nav className="rounded-md border border-slate-800 bg-slate-900/60 p-2 flex-1">
            <div className="px-2 py-1 text-[10px] font-mono tracking-widest text-slate-500">NAVIGATION</div>
            {[
              ["lan", "Secure Tunnels"],
              ["hub", "Staging Area"],
              ["crisis_alert", "Alert Matrix"],
              ["satellite_alt", "Orbital Hub"],
              ["radar", "Deep Telemetry"],
            ].map(([icon, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveNav(label)}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded text-[12px] tracking-wide transition ${
                  activeNav === label
                    ? "bg-sky-500/10 text-sky-300 border-l-2 border-sky-400"
                    : "text-slate-400 hover:bg-slate-800/50 border-l-2 border-transparent"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={simulateIntrusion}
              className="rounded px-3 py-2.5 text-[11px] font-bold tracking-[0.2em] text-red-300 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 transition"
            >
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">e911_emergency</span>
              EMERGENCY OVERRIDE
            </button>
            <a
              href="/admin"
              className="rounded px-3 py-2 text-[11px] font-mono tracking-wider text-slate-300 bg-slate-800/40 border border-slate-700 hover:border-sky-500/40 hover:text-sky-300 transition text-center"
            >
              Remote Controller →
            </a>
            <button
              type="button"
              className="rounded px-3 py-2 text-[11px] font-mono tracking-wider text-slate-300 bg-slate-800/40 border border-slate-700 hover:border-sky-500/40 hover:text-sky-300 transition"
            >
              System Logs
            </button>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-7 flex flex-col gap-3">
          <div className="relative rounded-md border border-sky-500/20 bg-slate-900/40 backdrop-blur overflow-hidden flex-1 min-h-[560px]">
            <CornerBrackets />
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono tracking-[0.3em] text-sky-400/80">CONSTELLATION MAP</div>
                <div className="text-lg font-extrabold tracking-[0.18em] text-slate-100">
                  {activeCluster.toUpperCase()} · LIVE MESH
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={simulateIntrusion}
                  disabled={underAttack}
                  className="rounded px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-red-300 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 disabled:opacity-40"
                >
                  SIMULATE INTRUSION
                </button>
                <button
                  type="button"
                  onClick={healTunnels}
                  className="rounded px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-sky-300 bg-sky-500/10 border border-sky-500/40 hover:bg-sky-500/20"
                >
                  HEAL TUNNELS
                </button>
              </div>
            </div>

            <ConstellationMap
              nodes={meshNodes}
              tunnels={meshTunnels}
              compromised={compromised}
              severed={severed}
              underAttack={underAttack}
              hoverId={hoverId}
              onHover={setHoverId}
            />

            <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between text-[10px] font-mono tracking-widest text-slate-500">
              <span>10.142.0.0/16 · geo-fence active</span>
              <span>uptime {formatHms(sample.sessionUptimeMs)}</span>
              <span>
                {meshNodes.length} peers · {liveTunnels}/{meshTunnels.length} tunnels
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <MetricTile label="NETWORK BANDWIDTH" value={`${sample.bandwidthTbps.toFixed(2)} TB/s`} sub="ingress · 10.142.0.0/16" />
            <MetricTile label="SATELLITE LINK" value="LOCKED" sub="12 birds · rssi -64 dBm" />
            <MetricTile label="ENCRYPTION" value="AES-4096" sub="qkd-enhanced · pfs" accent="purple" />
            <MetricTile
              label="CORE TEMP"
              value={`${sample.coreTempC.toFixed(1)}°C`}
              sub={tempWarn ? "threshold warn" : "nominal"}
              accent={tempWarn ? "red" : "sky"}
            />

            <div className="col-span-12 rounded-md border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500">BREACH EVENT TIMELINE</div>
                  <div className="text-sm font-bold tracking-wider text-slate-200">post-event audit feed</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] font-mono tracking-widest text-slate-400 hover:text-sky-300 hover:border-sky-500/40"
                  >
                    FILTER
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] font-mono tracking-widest text-slate-400 hover:text-sky-300 hover:border-sky-500/40"
                  >
                    ↓ EXPORT
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="text-slate-500 tracking-widest text-[10px]">
                    <tr className="border-b border-slate-800">
                      <th className="py-2 pr-3">TIMESTAMP</th>
                      <th className="py-2 pr-3">EVENT ID</th>
                      <th className="py-2 pr-3">PROTOCOL</th>
                      <th className="py-2 pr-3">VECTOR</th>
                      <th className="py-2 pr-3">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.slice(0, 10).map((row, i) => {
                      const line = kernelLine(row);
                      return (
                        <tr key={row.evt + i} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                          <td
                            className={`py-2 pr-3 ${
                              row.severity === "crit" ? "text-red-400 animate-pulse" : "text-slate-400"
                            }`}
                          >
                            {row.ts}
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{row.evt}</td>
                          <td className="py-2 pr-3 text-purple-300">{row.proto}</td>
                          <td className="py-2 pr-3 text-slate-300 max-w-[24rem] truncate" title={line}>
                            {line}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] tracking-widest ${
                                row.action === "QUARANTINE"
                                  ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                  : row.action === "DROPPED"
                                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                                    : row.action === "LOGGED"
                                      ? "bg-slate-700/40 text-slate-300 border border-slate-600"
                                      : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                              }`}
                            >
                              {row.action}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3">
          <div
            className={`rounded-md p-4 border ${
              underAttack
                ? "bg-red-500/10 border-red-500/50 text-red-200"
                : "bg-sky-500/10 border-sky-500/40 text-sky-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    underAttack ? "animate-pulse text-red-400" : "text-sky-300"
                  }`}
                >
                  {underAttack ? "gpp_maybe" : "verified_user"}
                </span>
                <span className="text-[10px] font-mono tracking-[0.3em]">
                  {underAttack ? "STATUS: CRITICAL" : "STATUS: NOMINAL"}
                </span>
              </div>
              <span className={`size-2 rounded-full ${underAttack ? "bg-red-400 animate-ping" : "bg-sky-400"}`} />
            </div>
            <div className="mt-2 text-xl font-extrabold tracking-[0.15em]">
              {underAttack ? "CRITICAL BREACH DETECTED" : "SYSTEM PROTECTED"}
            </div>
            <div className="mt-2 text-[11px] font-mono tracking-widest text-slate-400">
              TIME SINCE DETECTION:{" "}
              <span className={underAttack ? "text-red-300" : "text-slate-500"}>{elapsed}</span>
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500">THREAT VECTOR</div>
              <div className={`text-[10px] font-mono tracking-widest ${underAttack ? "text-red-300" : "text-slate-500"}`}>
                {underAttack ? "TRACKING" : "—"}
              </div>
            </div>
            <div className="mt-2 text-lg font-bold tracking-wider text-slate-100">
              vec-990 <span className="text-slate-500">·</span>{" "}
              <span className={underAttack ? "text-red-300" : "text-sky-300"}>
                {Array.from(compromised)[0] ?? "sec-edge-node-al-01"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ["PACKET LOSS", underAttack ? "98.4%" : "0.1%"],
                ["LATENCY", underAttack ? "812ms" : "9ms"],
                ["ORIGIN ASN", "AS-66613"],
                ["CIDR", "10.99.13.244/32"],
              ].map(([k, v]) => (
                <div key={k} className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5">
                  <div className="text-[8px] tracking-[0.25em] font-mono text-slate-500">{k}</div>
                  <div
                    className={`text-sm font-mono ${
                      underAttack && (k === "PACKET LOSS" || k === "LATENCY") ? "text-red-300" : "text-slate-200"
                    }`}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500 mb-2">ACTIVE INTRUSIONS</div>
            <div className="flex flex-col gap-1.5">
              {intrusions.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5"
                >
                  <div className="leading-tight">
                    <div className="text-[12px] text-slate-200">{row.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {row.peer} · {row.cidr}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold tracking-[0.2em] px-1.5 py-0.5 rounded ${
                      row.active
                        ? "bg-red-500/15 text-red-300 border border-red-500/30 animate-pulse"
                        : "bg-slate-700/40 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {row.active ? "ACTIVE" : "HALTED"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 flex-1">
            <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500 mb-3">SYSTEM INTEGRITY</div>
            <div className="flex items-center gap-4">
              <IntegrityRadial value={sample.integrity} alarming={underAttack} />
              <div className="flex-1 space-y-2">
                {[
                  ["MESH HEALTH", Math.max(20, Math.round(sample.integrity - 4))],
                  ["KEY ROTATION", 92],
                  ["POLICY SYNC", underAttack ? 71 : 99],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="flex justify-between text-[10px] font-mono tracking-widest text-slate-500">
                      <span>{k}</span>
                      <span className={underAttack ? "text-red-300" : "text-sky-300"}>{v as number}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${underAttack ? "bg-red-400" : "bg-sky-400"}`}
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function nextEvtId(list: AuditEvent[], offset = 0) {
  const last = list[0]?.evt ?? "evt-2240";
  const n = parseInt(last.split("-")[1] ?? "2240", 10);
  return `evt-${n + 1 + offset}`;
}
