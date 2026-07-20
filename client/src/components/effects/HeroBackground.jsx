import { lazy, Suspense, useEffect, useState } from "react";
import "./HeroBackground.css";

const LiquidEther = lazy(() => import("./LiquidEther"));

// Real-time fluid sim is genuinely heavy (WebGL2 + several full-screen
// passes per frame) - worth it for the landing page's one big hero
// moment, not worth it on a phone GPU or for someone who's asked the OS
// to reduce motion. This gate decides once on mount whether to load the
// ~150KB Three.js chunk at all; the fallback below is pure CSS and costs
// nothing.
function canRunFluidSim() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(max-width: 860px)").matches) return false;
  if (window.matchMedia("(pointer: coarse)").matches) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HeroBackground({ className = "" }) {
  const [useFluid, setUseFluid] = useState(false);

  useEffect(() => {
    setUseFluid(canRunFluidSim());
  }, []);

  if (!useFluid) {
    return (
      <div className={`hero-bg-fallback ${className}`} aria-hidden="true">
        <div className="hero-bg-fallback-blob hero-bg-fallback-blob-1" />
        <div className="hero-bg-fallback-blob hero-bg-fallback-blob-2" />
        <div className="hero-bg-fallback-blob hero-bg-fallback-blob-3" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className={`hero-bg-fallback ${className}`} aria-hidden="true" />}>
      <LiquidEther
        className={className}
        colors={["#8B5CF6", "#22D3EE", "#C158F0"]}
        mouseForce={18}
        cursorSize={110}
        isViscous={false}
        viscous={28}
        iterationsViscous={24}
        iterationsPoisson={24}
        resolution={0.5}
        isBounce={false}
        autoDemo
        autoSpeed={0.45}
        autoIntensity={2.0}
        takeoverDuration={0.3}
        autoResumeDelay={2600}
        autoRampDuration={0.6}
      />
    </Suspense>
  );
}
