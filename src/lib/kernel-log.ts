import type { AuditEvent } from "@/types/mesh";

// Deterministic hash so the rendered string is identical on server and
// client (the audit table used to drift on hydration when we sprinkled
// Math.random into the formatter).
function hash(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function uptimeFor(ev: AuditEvent): string {
  const h = hash(ev.evt + ev.ts);
  const secs = 10000 + (h % 90000) + (h % 1000) / 1000;
  return secs.toFixed(3);
}

function pidFor(ev: AuditEvent, salt = ""): number {
  return 1000 + (hash(ev.evt + salt) % 60000);
}

export function kernelLine(ev: AuditEvent): string {
  const uptime = uptimeFor(ev);
  switch (ev.proto) {
    case "wireguard":
      return `kernel: [${uptime}] wgp2: Handshake signature verification failed for peer ${ev.source} (${ev.detail})`;
    case "tls1.3":
      return `nginx[${pidFor(ev, "nginx")}]: ${ev.source} TLS_AES_256_GCM_SHA384 ${ev.detail}`;
    case "icmp":
      return `kernel: [${uptime}] netfilter: ${ev.source} ${ev.detail} -> DROP`;
    case "https":
      return `envoy[${pidFor(ev, "envoy")}]: upstream ${ev.source} ${ev.detail}`;
    case "ztna":
      return `policy-engine: deny ${ev.source} reason="${ev.detail}"`;
    case "dns":
      return `unbound[${pidFor(ev, "unbound")}]: ${ev.source} cache miss ${ev.detail}`;
    default:
      return `${ev.source}: ${ev.detail}`;
  }
}

export function nowHms(d = new Date()) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
