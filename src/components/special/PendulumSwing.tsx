"use client";

import { useEffect, useRef, useState } from "react";

interface CharState {
  el: HTMLSpanElement;
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: "normal" | "hot" | "cooling";
  hotTime: number;
}

interface PendulumConfig {
  maxAngle?: number;
  angularFreq?: number;
  damping?: number;
  influenceRadius?: number;
  pushStrength?: number;
  returnStrength?: number;
  velocityDamping?: number;
  colorHot?: string;
  colorCool?: string;
}

const DEFAULT_CONFIG: Required<PendulumConfig> = {
  maxAngle: Math.PI / 2.8,
  angularFreq: 1.6,
  damping: 0.06,
  influenceRadius: 90,
  pushStrength: 3.5,
  returnStrength: 0.06,
  velocityDamping: 0.88,
  colorHot: "#e63946",
  colorCool: "#3b82f6",
};

function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearX = ax + t * dx;
  const nearY = ay + t * dy;
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}

export function PendulumSwing({
  text,
  config: userConfig,
}: {
  text: string;
  config?: PendulumConfig;
}) {
  const cfg = { ...DEFAULT_CONFIG, ...userConfig };
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    // --- Phase 1: Measure character positions using normal flow ---
    const measureDiv = document.createElement("div");
    measureDiv.style.cssText =
      "position:relative;visibility:hidden;white-space:pre-wrap;word-break:break-word;font-size:inherit;line-height:inherit;letter-spacing:inherit;";
    container.appendChild(measureDiv);

    const chars = Array.from(text);
    const tempSpans: HTMLSpanElement[] = [];

    for (const ch of chars) {
      if (ch === "\n") {
        measureDiv.appendChild(document.createElement("br"));
        continue;
      }
      const span = document.createElement("span");
      span.textContent = ch;
      span.style.cssText = "display:inline-block;white-space:pre;";
      measureDiv.appendChild(span);
      tempSpans.push(span);
    }

    // Read positions
    const containerRect = container.getBoundingClientRect();
    const charData: CharState[] = [];

    for (const span of tempSpans) {
      const rect = span.getBoundingClientRect();
      const ox = rect.left - containerRect.left;
      const oy = rect.top - containerRect.top;
      charData.push({
        el: span,
        ox,
        oy,
        x: ox,
        y: oy,
        vx: 0,
        vy: 0,
        phase: "normal",
        hotTime: 0,
      });
    }

    // --- Phase 2: Switch to absolute positioning ---
    for (const c of charData) {
      c.el.style.visibility = "visible";
      c.el.style.position = "absolute";
      c.el.style.left = "0";
      c.el.style.top = "0";
      c.el.style.transform = `translate(${c.ox}px, ${c.oy}px)`;
      c.el.style.willChange = "transform, color";
      container.appendChild(c.el);
    }
    measureDiv.remove();

    // --- Phase 3: Create pendulum SVG ---
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:visible;";
    container.appendChild(svg);

    const pendLine = document.createElementNS(svgNS, "line");
    pendLine.setAttribute("stroke", cfg.colorCool);
    pendLine.setAttribute("stroke-width", "2");
    pendLine.setAttribute("stroke-opacity", "0.5");
    svg.appendChild(pendLine);

    const pendBob = document.createElementNS(svgNS, "circle");
    pendBob.setAttribute("r", "8");
    pendBob.setAttribute("fill", cfg.colorCool);
    pendBob.setAttribute("fill-opacity", "0.85");
    svg.appendChild(pendBob);

    const pendPivot = document.createElementNS(svgNS, "circle");
    pendPivot.setAttribute("r", "4");
    pendPivot.setAttribute("fill", "#888");
    pendPivot.setAttribute("fill-opacity", "0.5");
    svg.appendChild(pendPivot);

    // --- Phase 4: Pendulum config ---
    const containerWidth = container.clientWidth;
    const containerHeight = Math.max(container.clientHeight, 300);
    const pivotX = containerWidth / 2;
    const pivotY = 10;
    const length = Math.min(containerHeight * 0.85, 380);

    let time = 0;
    let cycleStart = 0;

    const animate = () => {
      const dt = 1 / 60;
      time += dt;

      // Re-energize pendulum when amplitude decays below threshold
      let elapsed = time - cycleStart;
      let amplitude = cfg.maxAngle * Math.exp(-cfg.damping * elapsed);
      if (amplitude < cfg.maxAngle * 0.35) {
        cycleStart = time;
        elapsed = 0;
        amplitude = cfg.maxAngle;
      }

      const angle = amplitude * Math.cos(cfg.angularFreq * elapsed);

      const bobX = pivotX + length * Math.sin(angle);
      const bobY = pivotY + length * Math.cos(angle);

      // Angular velocity (derivative of angle)
      const angVel =
        -amplitude * cfg.angularFreq * Math.sin(cfg.angularFreq * elapsed) -
        cfg.maxAngle * cfg.damping * Math.exp(-cfg.damping * elapsed) * Math.cos(cfg.angularFreq * elapsed);

      // Perpendicular direction to pendulum line (for pushing text)
      const perpX = Math.cos(angle);
      const perpY = -Math.sin(angle);

      // Update pendulum SVG
      pendLine.setAttribute("x1", String(pivotX));
      pendLine.setAttribute("y1", String(pivotY));
      pendLine.setAttribute("x2", String(bobX));
      pendLine.setAttribute("y2", String(bobY));
      pendBob.setAttribute("cx", String(bobX));
      pendBob.setAttribute("cy", String(bobY));
      pendPivot.setAttribute("cx", String(pivotX));
      pendPivot.setAttribute("cy", String(pivotY));

      // Update characters
      for (const c of charData) {
        // Use character center for distance calculation
        const charCx = c.x + 6;
        const charCy = c.y + 12;

        const dist = pointToSegmentDist(charCx, charCy, pivotX, pivotY, bobX, bobY);

        if (dist < cfg.influenceRadius) {
          const proximity = 1 - dist / cfg.influenceRadius;
          const swingBoost = 0.4 + 0.6 * Math.abs(angVel);
          const force = proximity * swingBoost * cfg.pushStrength;

          c.vx += perpX * force;
          c.vy += perpY * force;

          // Random scatter for chaos
          c.vx += (Math.random() - 0.5) * force * 0.6;
          c.vy += (Math.random() - 0.5) * force * 0.6;

          c.phase = "hot";
          c.hotTime = time;
        } else if (c.phase === "hot" && time - c.hotTime > 0.3) {
          c.phase = "cooling";
        }

        // Spring return force
        const dx = c.ox - c.x;
        const dy = c.oy - c.y;
        const retStr = c.phase === "normal" ? cfg.returnStrength * 1.5 : cfg.returnStrength * 0.6;
        c.vx += dx * retStr;
        c.vy += dy * retStr;

        // Velocity damping
        c.vx *= cfg.velocityDamping;
        c.vy *= cfg.velocityDamping;

        c.x += c.vx;
        c.y += c.vy;

        // Transition back to normal
        if (c.phase === "cooling") {
          const disp = Math.sqrt((c.x - c.ox) ** 2 + (c.y - c.oy) ** 2);
          if (disp < 2 && time - c.hotTime > 1.5) {
            c.phase = "normal";
          }
        }

        // Apply visual transform and color
        const disp = Math.sqrt((c.x - c.ox) ** 2 + (c.y - c.oy) ** 2);
        const scale = Math.min(1.6, 1 + disp * 0.004);
        c.el.style.transform = `translate(${c.x}px, ${c.y}px) scale(${scale})`;

        let color = "";
        if (c.phase === "hot") color = cfg.colorHot;
        else if (c.phase === "cooling") color = cfg.colorCool;
        c.el.style.color = color;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const c of charData) {
        c.el.remove();
      }
      svg.remove();
    };
  }, [mounted, text, cfg.maxAngle, cfg.angularFreq, cfg.damping, cfg.influenceRadius, cfg.pushStrength, cfg.returnStrength, cfg.velocityDamping, cfg.colorHot, cfg.colorCool]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "350px",
        overflow: "visible",
        userSelect: "none",
        fontSize: "1.125rem",
        lineHeight: "2.2",
        padding: "1rem 0",
      }}
    />
  );
}
