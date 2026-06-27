import type { AuditEvent, IntrusionRow, MeshNode, MeshTunnel } from "@/types/mesh";

// layout coordinates are percentage based; tuned against the 16:9 viewport.
export const meshNodes: MeshNode[] = [
  { id: "helios-1",       hostname: "core-db-cluster-primary",    cidr: "10.142.0.8/32",   region: "us-east-1a", kind: "core",   x: 50, y: 50 },
  { id: "lunar-base",     hostname: "edge-gw-lunar-base-01",      cidr: "10.142.4.21/32",  region: "eu-west-2b", kind: "edge",   x: 22, y: 28 },
  { id: "void-sat",       hostname: "edge-gw-void-sat-03",        cidr: "10.142.6.74/32",  region: "ap-se-1a",   kind: "edge",   x: 80, y: 30 },
  { id: "orbit-04",       hostname: "svc-orbit-04",               cidr: "10.142.8.12/32",  region: "us-east-1c", kind: "edge",   x: 18, y: 72 },
  { id: "relay-09",       hostname: "relay-pop-09",               cidr: "10.142.9.40/32",  region: "us-west-2a", kind: "edge",   x: 78, y: 76 },
  { id: "node-al-01",     hostname: "sec-edge-node-al-01",        cidr: "10.142.11.5/32",  region: "sa-east-1a", kind: "edge",   x: 92, y: 55 },
  { id: "sec-edge-unknown-node-04", hostname: "sec-edge-unknown-node-04", cidr: "10.99.13.244/32", asn: "AS-66613", region: "??", kind: "unknown", x: 8, y: 52 },
];

export const meshTunnels: MeshTunnel[] = [
  { from: "helios-1", to: "lunar-base", protocol: "wg" },
  { from: "helios-1", to: "void-sat",   protocol: "wg" },
  { from: "helios-1", to: "orbit-04",   protocol: "mtls" },
  { from: "helios-1", to: "relay-09",   protocol: "mtls" },
  { from: "helios-1", to: "node-al-01", protocol: "wg" },
  { from: "lunar-base", to: "void-sat", protocol: "ipsec" },
  { from: "orbit-04", to: "relay-09",   protocol: "ipsec" },
  { from: "lunar-base", to: "sec-edge-unknown-node-04", protocol: "wg" },
  { from: "sec-edge-unknown-node-04", to: "orbit-04",   protocol: "wg" },
  { from: "node-al-01", to: "void-sat", protocol: "mtls" },
];

export const seedAuditFeed: AuditEvent[] = [
  { ts: "23:41:08", evt: "evt-2241", proto: "tls1.3",    source: "edge-gw-lunar-base-01", detail: "session resumption ticket accepted", action: "ALLOWED",    severity: "info" },
  { ts: "23:39:52", evt: "evt-2240", proto: "wireguard", source: "edge-gw-void-sat-03",   detail: "peer rekey (psk rotation) ok",      action: "LOGGED",     severity: "info" },
  { ts: "23:36:14", evt: "evt-2239", proto: "icmp",      source: "svc-orbit-04",          detail: "burst > 400pps from 10.142.8.0/24", action: "DROPPED",    severity: "warn" },
  { ts: "23:30:02", evt: "evt-2238", proto: "https",     source: "ingress-04",            detail: "SNI/cert pin mismatch (HPKP)",      action: "DROPPED",    severity: "warn" },
];

export const intrusionRoster: IntrusionRow[] = [
  { id: "vec-990", name: "credential stuffing",   peer: "sec-edge-unknown-node-04", cidr: "10.99.13.244/32", active: false },
  { id: "vec-991", name: "volumetric flood (udp)", peer: "AS-66613",                cidr: "203.0.113.0/24",  active: false },
  { id: "vec-992", name: "sqli on /v2/orders",     peer: "edge-gw-void-sat-03",     cidr: "10.142.6.74/32",  active: false },
  { id: "vec-993", name: "tcp/syn sweep",          peer: "relay-pop-09",            cidr: "10.142.9.0/24",   active: false },
];
