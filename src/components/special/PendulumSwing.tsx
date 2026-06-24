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

// Real pendulum physics: T = 2π√(L/g)
// For L≈2m, g=9.81: T≈2.84s → ω = 2π/T ≈ 2.21 rad/s
// This gives a slow, realistic grandfather-clock swing
const PENDULUM_OMEGA = 2.21;
const PENDULUM_MAX_ANGLE = Math.PI / 3.2; // ~56° wide swing
const PENDULUM_DAMPING = 0.008; // very slow natural decay
const INFLUENCE_RADIUS = 75;
const PUSH_STRENGTH = 2.8;
const VELOCITY_DAMPING = 0.94; // friction only, NO spring-back
const COLOR_HOT = "#e63946";
const COLOR_COOL = "#3b82f6";

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

export function PendulumSwing({ text }: { text: string }) {
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

    // === Phase 1: Measure character positions via normal flow ===
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

    // === Phase 2: Absolute positioning for animation ===
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

    // === Phase 3: Full-viewport fixed pendulum overlay ===
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9998;overflow:visible;";
    document.body.appendChild(overlay);

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;";
    overlay.appendChild(svg);

    // Pendulum string
    const pendLine = document.createElementNS(svgNS, "line");
    pendLine.setAttribute("stroke", COLOR_COOL);
    pendLine.setAttribute("stroke-width", "1.5");
    pendLine.setAttribute("stroke-opacity", "0.45");
    svg.appendChild(pendLine);

    // Pendulum bob (weight)
    const pendBob = document.createElementNS(svgNS, "circle");
    pendBob.setAttribute("r", "12");
    pendBob.setAttribute("fill", COLOR_COOL);
    pendBob.setAttribute("fill-opacity", "0.85");
    pendBob.setAttribute("stroke", "#1e40af");
    pendBob.setAttribute("stroke-width", "1");
    pendBob.setAttribute("stroke-opacity", "0.3");
    svg.appendChild(pendBob);

    // Pivot point
    const pendPivot = document.createElementNS(svgNS, "circle");
    pendPivot.setAttribute("r", "5");
    pendPivot.setAttribute("fill", "#555");
    pendPivot.setAttribute("fill-opacity", "0.6");
    svg.appendChild(pendPivot);

    // === Phase 4: Animation loop ===
    let time = 0;
    let lastTimestamp = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 1 / 30);
      lastTimestamp = now;
      time += dt;

      // Damped harmonic oscillator — re-energize when nearly stopped
      let amplitude = PENDULUM_MAX_ANGLE * Math.exp(-PENDULUM_DAMPING * time);
      if (amplitude < PENDULUM_MAX_ANGLE * 0.45) {
        time = 0;
        amplitude = PENDULUM_MAX_ANGLE;
      }

      const angle = amplitude * Math.cos(PENDULUM_OMEGA * time);

      // Pivot at top-center of viewport; length spans full viewport height
      const pivotX = window.innerWidth / 2;
      const pivotY = 0;
      const length = window.innerHeight;

      const bobX = pivotX + length * Math.sin(angle);
      const bobY = pivotY + length * Math.cos(angle);

      // Angular velocity for push-direction calculation
      const angVel =
        -PENDULUM_OMEGA * amplitude * Math.sin(PENDULUM_OMEGA * time);

      // Direction perpendicular to pendulum string
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

      // Get current container position (may shift on scroll)
      const cRect = container.getBoundingClientRect();

      // Update each character — collision in viewport space
      for (const c of charData) {
        // Character center in viewport coordinates
        const charVx = cRect.left + c.x + 6;
        const charVy = cRect.top + c.y + 12;

        const dist = pointToSegmentDist(
          charVx, charVy,
          pivotX, pivotY,
          bobX, bobY
        );

        if (dist < INFLUENCE_RADIUS) {
          const proximity = 1 - dist / INFLUENCE_RADIUS;
          // Push proportional to angular velocity (faster swing = harder hit)
          const swingBoost = 0.35 + 0.65 * Math.abs(angVel);
          const force = proximity * swingBoost * PUSH_STRENGTH;

          c.vx += perpX * force;
          c.vy += perpY * force;

          // Random scatter for organic chaos
          c.vx += (Math.random() - 0.5) * force * 0.7;
          c.vy += (Math.random() - 0.5) * force * 0.7;

          c.phase = "hot";
          c.hotTime = time;
        } else if (c.phase === "hot" && time - c.hotTime > 0.25) {
          // Released — transition to cooling (blue), never back to normal
          c.phase = "cooling";
        }

        // NO spring-back force — characters don't recover
        // Only friction to prevent infinite sliding
        c.vx *= VELOCITY_DAMPING;
        c.vy *= VELOCITY_DAMPING;

        c.x += c.vx;
        c.y += c.vy;

        // Apply transform
        c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;

        // Color: red when hit, blue forever after release
        if (c.phase === "hot") {
          c.el.style.color = COLOR_HOT;
        } else if (c.phase === "cooling") {
          c.el.style.color = COLOR_COOL;
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const c of charData) c.el.remove();
      overlay.remove();
    };
  }, [mounted, text]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: "400px",
        overflow: "visible",
        userSelect: "none",
        fontSize: "1.25rem",
        lineHeight: "2.4",
        padding: "2rem 0",
      }}
    />
  );
}
