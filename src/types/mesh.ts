export type NodeKind = "core" | "edge" | "unknown";

export interface MeshNode {
  id: string;
  hostname: string;
  cidr: string;
  asn?: string;
  region: string;
  kind: NodeKind;
  x: number;
  y: number;
}

export interface MeshTunnel {
  from: string;
  to: string;
  protocol: "wg" | "ipsec" | "mtls";
}

export type TunnelAction = "QUARANTINE" | "LOGGED" | "DROPPED" | "ALLOWED";
export type Severity = "info" | "warn" | "crit";

export interface AuditEvent {
  ts: string;
  evt: string;
  proto: string;
  source: string;
  detail: string;
  action: TunnelAction;
  severity: Severity;
}

export interface IntrusionRow {
  id: string;
  name: string;
  peer: string;
  cidr: string;
  active: boolean;
}
