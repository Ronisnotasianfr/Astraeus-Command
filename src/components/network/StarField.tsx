import { useEffect, useState } from "react";

// frosted starfield. recomputes a sparse layout once per mount to avoid the
// regular grid look you get from a deterministic seed.
export function StarField({ density = 110 }: { density?: number }) {
  const [stars, setStars] = useState<Array<{ x: number; y: number; s: number; o: number }>>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: density }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.6 + 0.2,
        o: Math.random() * 0.6 + 0.2,
      })),
    );
  }, [density]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(56,189,248,0.08), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.08), transparent 55%)",
        }}
      />
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.s}px`,
            height: `${s.s}px`,
            opacity: s.o,
            boxShadow: `0 0 ${s.s * 3}px rgba(186,230,253,${s.o})`,
          }}
        />
      ))}
    </div>
  );
}
