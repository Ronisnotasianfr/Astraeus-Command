import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { meshNodes } from "@/data/mesh-fixtures";
import { meshRelay, type MeshControlAction, type MeshControlMessage } from "@/services/meshRelay";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Astraeus · remote controller" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Sora:wght@400;700;800&display=swap",
      },
    ],
  }),
  component: AdminController,
});

interface Tx {
  at: number;
  action: MeshControlAction;
  nodeId?: string;
  remote: boolean;
}

function AdminController() {
  const [feed, setFeed] = useState<Tx[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    meshRelay.start();
    const off = meshRelay.on((msg: MeshControlMessage) => {
      setFeed((prev) =>
        [{ at: msg.at, action: msg.action, nodeId: msg.nodeId, remote: msg.origin !== meshRelay.whoami() }, ...prev].slice(
          0,
          40,
        ),
      );
    });
    const t = setInterval(() => setConnected((c) => (c ? c : feed.length > 0)), 1000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [feed.length]);

  function broadcast(action: MeshControlAction, nodeId?: string) {
    meshRelay.send(action, nodeId);
  }

  return (
    <div className="min-h-screen bg-[#04070f] text-slate-200 font-[Sora,sans-serif] p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-sky-400">REMOTE CONTROLLER</div>
          <h1 className="text-2xl font-extrabold tracking-[0.18em]">MESH OVERRIDE PANEL</h1>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            origin {meshRelay.whoami()} · relay {connected ? "online" : "negotiating"}
          </p>
        </div>
        <Link
          to="/"
          className="rounded px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-sky-300 bg-sky-500/10 border border-sky-500/40 hover:bg-sky-500/20"
        >
          ← CONSOLE
        </Link>
      </header>

      <section className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-md border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500 mb-3">PER-NODE OVERRIDE</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {meshNodes.map((n) => (
              <div
                key={n.id}
                className="rounded border border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-2"
              >
                <div>
                  <div className="text-sm font-bold tracking-wide text-slate-100">{n.hostname}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {n.id} · {n.cidr} · {n.region}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => broadcast("compromise", n.id)}
                    className="flex-1 rounded px-2 py-1.5 text-[10px] font-bold tracking-[0.2em] text-red-300 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20"
                  >
                    COMPROMISE
                  </button>
                  <button
                    type="button"
                    onClick={() => broadcast("release", n.id)}
                    className="rounded px-2 py-1.5 text-[10px] font-mono tracking-wider text-slate-300 border border-slate-700 hover:border-sky-500/40 hover:text-sky-300"
                  >
                    release
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500 mb-3">GLOBAL</div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => broadcast("intrusion")}
                className="rounded px-3 py-2 text-[11px] font-bold tracking-[0.2em] text-red-300 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20"
              >
                BROADCAST INTRUSION
              </button>
              <button
                type="button"
                onClick={() => broadcast("heal")}
                className="rounded px-3 py-2 text-[11px] font-bold tracking-[0.2em] text-sky-300 bg-sky-500/10 border border-sky-500/40 hover:bg-sky-500/20"
              >
                HEAL ALL TUNNELS
              </button>
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-4 flex-1">
            <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500 mb-3">RELAY TRAFFIC</div>
            <ol className="space-y-1 text-[11px] font-mono">
              {feed.length === 0 && (
                <li className="text-slate-600">waiting for traffic on astraeus-mesh-control…</li>
              )}
              {feed.map((tx, i) => (
                <li
                  key={tx.at + ":" + i}
                  className={`flex justify-between gap-2 border-b border-slate-800/60 pb-1 ${
                    tx.remote ? "text-purple-300" : "text-slate-300"
                  }`}
                >
                  <span>{new Date(tx.at).toLocaleTimeString("en-GB", { hour12: false })}</span>
                  <span className="flex-1 truncate">
                    {tx.action}
                    {tx.nodeId ? ` · ${tx.nodeId}` : ""}
                  </span>
                  <span className="text-[9px] tracking-widest text-slate-500">
                    {tx.remote ? "RX" : "TX"}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </section>
    </div>
  );
}
