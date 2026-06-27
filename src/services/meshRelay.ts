// Thin wrapper around the native WebSocket API that fans messages out to
// every browser tab subscribed to the same channel. We piggy-back on a
// public PieSocket demo relay (docs.piesocket.com) so the prototype works
// with zero backend setup, and mirror traffic across same-origin tabs via
// BroadcastChannel for instant local sync.
//
// Payload schema is intentionally tiny so any future relay can be dropped
// in without touching call sites.

export type MeshControlAction = "compromise" | "release" | "intrusion" | "heal";

export interface MeshControlMessage {
  v: 1;
  action: MeshControlAction;
  nodeId?: string;
  origin: string;
  at: number;
}

type Listener = (msg: MeshControlMessage) => void;

const RELAY_URL =
  "wss://demo.piesocket.com/v3/astraeus-mesh?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self=0";
const CHANNEL = "astraeus-mesh-control";

class MeshRelay {
  private ws: WebSocket | null = null;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();
  private queue: MeshControlMessage[] = [];
  private retry = 0;
  private origin = `op-${Math.random().toString(36).slice(2, 8)}`;
  private started = false;

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    try {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (ev) => this.deliver(ev.data as MeshControlMessage, false);
    } catch {
      this.channel = null;
    }
    this.connect();
  }

  stop() {
    this.started = false;
    this.ws?.close();
    this.ws = null;
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  send(action: MeshControlAction, nodeId?: string) {
    const msg: MeshControlMessage = {
      v: 1,
      action,
      nodeId,
      origin: this.origin,
      at: Date.now(),
    };
    // mirror to local tabs immediately
    this.channel?.postMessage(msg);
    // fan out to remote sessions
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.queue.push(msg);
    }
    // echo back to caller so the UI updates without a round-trip
    this.deliver(msg, true);
  }

  private connect() {
    if (!this.started) return;
    try {
      this.ws = new WebSocket(RELAY_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.addEventListener("open", () => {
      this.retry = 0;
      const pending = this.queue.splice(0);
      pending.forEach((m) => this.ws?.send(JSON.stringify(m)));
    });
    this.ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse(typeof ev.data === "string" ? ev.data : "");
        if (data && data.v === 1 && data.origin !== this.origin) {
          this.deliver(data as MeshControlMessage, false);
        }
      } catch {
        /* ignore non-JSON keepalives */
      }
    });
    this.ws.addEventListener("close", () => this.scheduleReconnect());
    this.ws.addEventListener("error", () => this.ws?.close());
  }

  private scheduleReconnect() {
    if (!this.started) return;
    const delay = Math.min(15000, 1000 * 2 ** this.retry++);
    setTimeout(() => this.connect(), delay);
  }

  private deliver(msg: MeshControlMessage, isLocalEcho: boolean) {
    // BroadcastChannel echoes already include origin; drop our own remote echoes
    if (!isLocalEcho && msg.origin === this.origin) return;
    this.listeners.forEach((fn) => fn(msg));
  }

  whoami() {
    return this.origin;
  }
}

export const meshRelay = new MeshRelay();
