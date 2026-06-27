import { useEffect, useRef, useState } from "react";

export interface TelemetrySample {
  bandwidthTbps: number;
  coreTempC: number;
  integrity: number;
  sessionUptimeMs: number;
}

interface Options {
  underAttack: boolean;
  // baseline integrity to drift back to when healthy
  baseline?: number;
}

// lightweight pseudo-telemetry; replace with WS subscription when collector lands.
export function useTelemetry({ underAttack, baseline = 98 }: Options) {
  const start = useRef(Date.now());
  const [sample, setSample] = useState<TelemetrySample>({
    bandwidthTbps: 1.4,
    coreTempC: 62,
    integrity: baseline,
    sessionUptimeMs: 0,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setSample((prev) => {
        const drift = (Math.random() - 0.5) * 1.2;
        const nextTemp = clamp(prev.coreTempC + drift + (underAttack ? 0.7 : -0.15), 58, 96);
        const nextBw = +(1.18 + Math.random() * 0.55).toFixed(2);
        const integrityDelta = underAttack
          ? -(0.6 + Math.random() * 1.2)
          : prev.integrity < baseline
            ? 0.4
            : 0;
        return {
          bandwidthTbps: nextBw,
          coreTempC: nextTemp,
          integrity: clamp(prev.integrity + integrityDelta, 11, 99),
          sessionUptimeMs: Date.now() - start.current,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [underAttack, baseline]);

  // hard reset on heal — caller can flip baseline back up.
  function resetIntegrity(to = baseline) {
    setSample((p) => ({ ...p, integrity: to }));
  }

  return { sample, resetIntegrity };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function formatHms(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
