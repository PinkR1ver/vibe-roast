import React, { useMemo, useState, useRef, useEffect } from "react";
import { buildActivityHeatmap } from "../lib/activity-heatmap.js";

/* ══════════════════════════════════════════════════════════
   ActivityHeatmap3D — adapted from TokenTracker
   (mm7894215/TokenTracker, MIT licensed)
   ══════════════════════════════════════════════════════════ */

export const PALETTES = {
  emerald: {
    light: ["#ebedf0", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981"],
    dark: ["#2d333b", "#065f46", "#059669", "#10b981", "#34d399"],
    gridColor: { light: "rgba(16, 185, 129, 0.12)", dark: "rgba(52, 211, 153, 0.08)" }
  },
  ocean: {
    light: ["#f1f5f9", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"],
    dark: ["#1e293b", "#1e3a8a", "#2563eb", "#3b82f6", "#60a5fa"],
    gridColor: { light: "rgba(59, 130, 246, 0.12)", dark: "rgba(96, 165, 250, 0.08)" }
  },
  neon: {
    light: ["#faf5ff", "#ebd5ff", "#c084fc", "#a855f7", "#7e22ce"],
    dark: ["#2e1065", "#581c87", "#8b5cf6", "#a855f7", "#c084fc"],
    gridColor: { light: "rgba(168, 85, 247, 0.12)", dark: "rgba(192, 132, 252, 0.08)" }
  },
  amber: {
    light: ["#fffbeb", "#fde68a", "#f59e0b", "#d97706", "#b45309"],
    dark: ["#451a03", "#78350f", "#b45309", "#d97706", "#f59e0b"],
    gridColor: { light: "rgba(245, 158, 11, 0.12)", dark: "rgba(245, 158, 11, 0.08)" }
  }
};

function shadeColor(hex, factor) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const c = (n) => Math.max(0, Math.min(255, Math.round(n * factor)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

function rotatePoint(x, y, z, yaw, pitch) {
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const x1 = x * cosY - y * sinY;
  const y1 = x * sinY + y * cosY;
  const z1 = z;
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  return { x: x1, y: y1 * cosP - z1 * sinP, z: y1 * sinP + z1 * cosP };
}

function rotateVector(x, y, z, yaw, pitch) {
  return rotatePoint(x, y, z, yaw, pitch);
}

function getTooltipText(level, value) {
  const v = Number(value).toLocaleString();
  if (level >= 4) return `${v} prompts — an epic day of coding!`;
  if (level === 3) return `${v} prompts — you were in the zone.`;
  if (level === 2) return `${v} prompts — a solid session.`;
  if (level === 1) return `${v} prompts — dipping your toes in.`;
  return "No activity this day.";
}

export default function ActivityHeatmap3D({
  prompts = [],
  weeks = 26,
  palette = "emerald",
  isDark = true,
  interactive = true,
  autoRotateInit = true,
}) {
  // Build data
  const heatmap = useMemo(
    () => buildActivityHeatmap({ prompts, weeks }),
    [prompts, weeks]
  );
  const weeksData = heatmap.weeks;

  const selectedTheme = PALETTES[palette] || PALETTES.emerald;
  const colors = isDark ? selectedTheme.dark : selectedTheme.light;
  const gridColor = isDark ? selectedTheme.gridColor.dark : selectedTheme.gridColor.light;

  const defaultYaw = -0.20;
  const defaultPitch = 0.88;

  const [angle, setAngle] = useState({ yaw: defaultYaw, pitch: defaultPitch });
  const [autoRotate, setAutoRotate] = useState(autoRotateInit);
  const [zoom, setZoom] = useState(1.0);

  const UNIT_SIZE = interactive ? 13 : 10.5;

  // Floor grid lines
  const floorGridLines = useMemo(() => {
    const lines = [];
    const W = weeksData.length;
    if (W === 0 || !interactive) return [];
    for (let r = 0; r <= 7; r++) {
      const y = (r - 3.5) * UNIT_SIZE;
      const p1 = rotatePoint((-W / 2) * UNIT_SIZE, y, 0, angle.yaw, angle.pitch);
      const p2 = rotatePoint((W / 2) * UNIT_SIZE, y, 0, angle.yaw, angle.pitch);
      lines.push({ d: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, key: `h-${r}` });
    }
    for (let c = 0; c <= W; c += 4) {
      const x = (c - W / 2) * UNIT_SIZE;
      const p1 = rotatePoint(x, -3.5 * UNIT_SIZE, 0, angle.yaw, angle.pitch);
      const p2 = rotatePoint(x, 3.5 * UNIT_SIZE, 0, angle.yaw, angle.pitch);
      lines.push({ d: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, key: `v-${c}` });
    }
    return lines;
  }, [weeksData.length, angle, UNIT_SIZE, interactive]);

  // Interaction refs
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const angleStartRef = useRef({ yaw: defaultYaw, pitch: defaultPitch });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0, time: 0 });
  const rafRef = useRef(null);

  // Growth wave
  const [growthWave, setGrowthWave] = useState(0);
  const growthRafRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const triggerGrowthWave = () => {
    if (growthRafRef.current) cancelAnimationFrame(growthRafRef.current);
    setGrowthWave(0);
    const start = performance.now();
    const anim = (now) => {
      if (!mountedRef.current) return;
      const p = Math.min(1, (now - start) / 1200);
      setGrowthWave(1 - Math.pow(1 - p, 3));
      if (p < 1) growthRafRef.current = requestAnimationFrame(anim);
    };
    growthRafRef.current = requestAnimationFrame(anim);
  };
  useEffect(() => { triggerGrowthWave(); return () => { if (growthRafRef.current) cancelAnimationFrame(growthRafRef.current); }; }, [interactive]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || isDraggingRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") { raf = requestAnimationFrame(tick); return; }
      setAngle((prev) => ({ yaw: prev.yaw + 0.002, pitch: prev.pitch }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate]);

  // Drag handlers
  const handleStart = (cx, cy) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: cx, y: cy };
    angleStartRef.current = { yaw: angle.yaw, pitch: angle.pitch };
    velocityRef.current = { x: 0, y: 0 };
    lastMousePosRef.current = { x: cx, y: cy, time: performance.now() };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
  const handleMove = (cx, cy) => {
    if (!isDraggingRef.current) return;
    const dx = cx - dragStartRef.current.x;
    const dy = cy - dragStartRef.current.y;
    const now = performance.now();
    const dt = now - lastMousePosRef.current.time;
    if (dt > 0) velocityRef.current = { x: (cx - lastMousePosRef.current.x) / dt, y: (cy - lastMousePosRef.current.y) / dt };
    lastMousePosRef.current = { x: cx, y: cy, time: now };
    const s = 0.005;
    const newYaw = angleStartRef.current.yaw - dx * s;
    const maxPitch = Math.PI / 2.3;
    const newPitch = Math.max(-maxPitch, Math.min(maxPitch, angleStartRef.current.pitch - dy * s));
    setAngle({ yaw: newYaw, pitch: newPitch });
  };
  const handleEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    let sx = -velocityRef.current.x * 12, sy = -velocityRef.current.y * 12;
    const tick = () => {
      if (isDraggingRef.current) return;
      sx *= 0.95; sy *= 0.95;
      if (Math.abs(sx) < 0.01 && Math.abs(sy) < 0.01) return;
      setAngle((prev) => {
        const maxPitch = Math.PI / 2.3;
        return { yaw: prev.yaw + sx * 0.005, pitch: Math.max(-maxPitch, Math.min(maxPitch, prev.pitch + sy * 0.005)) };
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Hover
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, shiftX: 0 });
  const hideTimeoutRef = useRef(null);
  useEffect(() => () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); }, []);

  // Zoom
  useEffect(() => {
    if (!interactive || !containerRef.current) return;
    const h = (e) => { e.preventDefault(); setZoom((p) => Math.max(0.5, Math.min(3.0, p - e.deltaY * 0.0025))); };
    containerRef.current.addEventListener("wheel", h, { passive: false });
    return () => containerRef.current?.removeEventListener("wheel", h);
  }, [interactive]);

  // Cells
  const cells = useMemo(() => {
    const out = [];
    weeksData.forEach((week, wi) => {
      (Array.isArray(week) ? week : []).forEach((cell, di) => {
        if (!cell) return;
        out.push({ key: cell.day || `${wi}-${di}`, col: wi, row: di, level: cell.level || 0, value: cell.value || 0, day: cell.day, models: cell.models || null });
      });
    });
    return out;
  }, [weeksData]);

  const GAP = interactive ? 1.8 : 1.5;
  const SIZE = UNIT_SIZE - GAP;
  const HEIGHT_MAX = interactive ? 38 : 28;
  const levelToHeight = (l) => Math.max(1.8, (Number(l) / 4) * HEIGHT_MAX);

  // Projected cells
  const projectedCells = useMemo(() => {
    if (cells.length === 0) return [];
    const W = weeksData.length;
    return cells.map((c) => {
      const targetH = levelToHeight(c.level);
      const distFromCenter = Math.sqrt(Math.pow(c.col - W / 2, 2) + Math.pow(c.row - 3.5, 2));
      const maxDist = Math.sqrt(Math.pow(W / 2, 2) + Math.pow(3.5, 2));
      const delay = (distFromCenter / maxDist) * 0.4;
      const cellProgress = Math.min(1, Math.max(0, (growthWave - delay) * (1 / 0.6)));
      const h = targetH * cellProgress;
      const xc = (c.col - W / 2) * UNIT_SIZE;
      const yc = (c.row - 3.5) * UNIT_SIZE;
      const half = SIZE / 2;
      const pts = [
        { x: xc - half, y: yc - half, z: 0 }, { x: xc + half, y: yc - half, z: 0 },
        { x: xc + half, y: yc + half, z: 0 }, { x: xc - half, y: yc + half, z: 0 },
        { x: xc - half, y: yc - half, z: h }, { x: xc + half, y: yc - half, z: h },
        { x: xc + half, y: yc + half, z: h }, { x: xc - half, y: yc + half, z: h },
      ];
      const proj = pts.map((p) => rotatePoint(p.x, p.y, p.z, angle.yaw, angle.pitch));
      const centerProj = rotatePoint(xc, yc, h / 2, angle.yaw, angle.pitch);
      const facesConfig = [
        { name: "top", indices: [4, 5, 6, 7], scale: 1.0, normal: [0, 0, 1] },
        { name: "bottom", indices: [3, 2, 1, 0], scale: 0.4, normal: [0, 0, -1] },
        { name: "left", indices: [3, 0, 4, 7], scale: 0.55, normal: [-1, 0, 0] },
        { name: "right", indices: [1, 2, 6, 5], scale: 0.75, normal: [1, 0, 0] },
        { name: "front", indices: [0, 1, 5, 4], scale: 0.85, normal: [0, -1, 0] },
        { name: "back", indices: [2, 3, 7, 6], scale: 0.65, normal: [0, 1, 0] },
      ];
      const baseColor = colors[Math.min(4, Math.max(0, Number(c.level) || 0))];
      const renderedFaces = [];
      const lx = 0.35, ly = -0.4, lz = 0.83;
      facesConfig.forEach((f) => {
        const nRot = rotateVector(f.normal[0], f.normal[1], f.normal[2], angle.yaw, angle.pitch);
        if (nRot.z > 0.001) {
          const p0 = proj[f.indices[0]], p1 = proj[f.indices[1]], p2 = proj[f.indices[2]], p3 = proj[f.indices[3]];
          const d = `M${p0.x},${p0.y} L${p1.x},${p1.y} L${p2.x},${p2.y} L${p3.x},${p3.y} Z`;
          const dot = nRot.x * lx + nRot.y * ly + nRot.z * lz;
          const ambient = isDark ? 0.18 : 0.0;
          const factor = f.scale * (0.82 + 0.28 * Math.max(0, dot)) + ambient;
          renderedFaces.push({ name: f.name, d, fill: shadeColor(baseColor, factor) });
        }
      });
      return { ...c, centerProj, renderedFaces };
    });
  }, [cells, angle, colors, weeksData.length, growthWave, UNIT_SIZE, SIZE, HEIGHT_MAX, isDark]);

  const sortedCells = useMemo(() => [...projectedCells].sort((a, b) => a.centerProj.z - b.centerProj.z), [projectedCells]);

  // Bounds
  const bounds = useMemo(() => {
    if (sortedCells.length === 0) return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    sortedCells.forEach((c) => {
      const pad = UNIT_SIZE * 2;
      if (c.centerProj.x - pad < minX) minX = c.centerProj.x - pad;
      if (c.centerProj.x + pad > maxX) maxX = c.centerProj.x + pad;
      if (c.centerProj.y - pad < minY) minY = c.centerProj.y - pad;
      if (c.centerProj.y + pad > maxY) maxY = c.centerProj.y + pad;
    });
    return { minX, minY, maxX, maxY };
  }, [sortedCells, UNIT_SIZE]);

  const pad = 12;
  const width = bounds.maxX - bounds.minX + pad * 2;
  const height = bounds.maxY - bounds.minY + pad * 2;
  const vw = width / zoom, vh = height / zoom;
  const minX = bounds.minX - pad + (width - vw) / 2;
  const minY = bounds.minY - pad + (height - vh) / 2;
  const viewBox = `${minX} ${minY} ${vw} ${vh}`;

  if (cells.length === 0) {
    return <div className="py-8 text-center text-sm text-oai-gray-500">No activity data yet.</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none outline-none ${interactive ? "cursor-grab active:cursor-grabbing w-full h-full flex items-center justify-center" : "w-full overflow-hidden flex justify-center"}`}
      onMouseDown={(e) => {
        if (!interactive) return;
        handleStart(e.clientX, e.clientY);
        const moveH = (me) => handleMove(me.clientX, me.clientY);
        const upH = () => { handleEnd(); window.removeEventListener("mousemove", moveH); window.removeEventListener("mouseup", upH); };
        window.addEventListener("mousemove", moveH);
        window.addEventListener("mouseup", upH);
      }}
      onTouchStart={(e) => { if (interactive && e.touches.length) handleStart(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchMove={(e) => { if (interactive && e.touches.length) handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={() => { if (interactive) handleEnd(); }}
    >
      <svg
        ref={svgRef}
        viewBox={viewBox}
        width={interactive ? "95%" : "100%"}
        height={interactive ? "95%" : "auto"}
        role="img"
        aria-label="3D interactive activity heatmap"
        style={{ display: "block", width: "100%", height: "auto", maxWidth: interactive ? "none" : `${width}px`, maxHeight: interactive ? "78vh" : "none" }}
        className="transition-transform duration-300 ease-out"
      >
        {interactive && floorGridLines.map((line) => (
          <path key={line.key} d={line.d} fill="none" stroke={gridColor} strokeWidth={0.25} strokeDasharray="1.5 2.5" strokeLinecap="round" />
        ))}
        {sortedCells.map((c) => {
          const isHovered = hoveredCell && hoveredCell.key === c.key;
          return (
            <g
              key={c.key}
              onMouseEnter={(e) => {
                if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }
                setHoveredCell(c);
                if (interactive && svgRef.current) {
                  const projPoint = rotatePoint((c.col - weeksData.length / 2) * UNIT_SIZE, (c.row - 3.5) * UNIT_SIZE, levelToHeight(c.level), angle.yaw, angle.pitch);
                  let sx = 0, sy = 0;
                  const svgEl = svgRef.current;
                  if (containerRef.current && typeof svgEl.createSVGPoint === "function" && typeof svgEl.getScreenCTM === "function") {
                    try { const pt = svgEl.createSVGPoint(); pt.x = projPoint.x; pt.y = projPoint.y; const ctm = svgEl.getScreenCTM(); if (ctm) { const sp = pt.matrixTransform(ctm); const cr = containerRef.current.getBoundingClientRect(); sx = sp.x - cr.left; sy = sp.y - cr.top; } } catch {}
                  }
                  const halfW = 140, cw = containerRef.current?.getBoundingClientRect().width || svgEl.getBoundingClientRect().width;
                  let shX = 0;
                  if (sx < halfW) shX = halfW - sx; else if (sx > cw - halfW) shX = (cw - halfW) - sx;
                  setTooltipPos({ x: sx, y: sy, shiftX: shX });
                }
              }}
              onMouseLeave={() => {
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(() => setHoveredCell(null), 150);
              }}
              className="transition-all duration-200"
              style={{ filter: isHovered ? "brightness(1.15) drop-shadow(0 4px 6px rgba(0,0,0,0.15))" : "none", cursor: interactive ? "pointer" : "default" }}
            >
              {!interactive && c.day && <title>{`${c.day}: ${Number(c.value).toLocaleString()} prompts`}</title>}
              {c.renderedFaces.map((f, idx) => (
                <path key={idx} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.25} strokeLinejoin="round" />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {interactive && hoveredCell && (
        <div
          onMouseEnter={() => { if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; } }}
          onMouseLeave={() => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = setTimeout(() => setHoveredCell(null), 150); }}
          className="absolute z-[9999] w-0 h-0 transition-all duration-100 ease-out"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y}px` }}
        >
          <div className="absolute left-0 bottom-[10px] backdrop-blur-md bg-white/90 dark:bg-oai-gray-900/90 border border-oai-gray-200/50 dark:border-oai-gray-800/50 shadow-xl rounded-xl p-3.5 max-w-[280px] min-w-[200px] flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100"
            style={{ transform: `translateX(calc(-50% + ${tooltipPos.shiftX}px))` }}>
            <div className="flex items-center justify-between border-b border-oai-gray-100 dark:border-oai-gray-800/80 pb-1.5">
              <span className="text-[11px] font-semibold text-oai-gray-500 dark:text-oai-gray-400">{hoveredCell.day}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: (hoveredCell.level === 0 ? (isDark ? "#9ca3af" : "#6b7280") : colors[hoveredCell.level]) + "22", color: hoveredCell.level === 0 ? (isDark ? "#9ca3af" : "#6b7280") : colors[hoveredCell.level], border: `1px solid ${(hoveredCell.level === 0 ? (isDark ? "#9ca3af" : "#6b7280") : colors[hoveredCell.level])}44` }}>
                Level {hoveredCell.level}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-oai-gray-900 dark:text-white leading-none">{Number(hoveredCell.value).toLocaleString()}</span>
                <span className="text-[10px] text-oai-gray-400 uppercase tracking-wider font-semibold">Prompts</span>
              </div>
              <p className="text-[11px] text-oai-gray-600 dark:text-oai-gray-300 leading-relaxed font-normal mt-1 border-t border-dashed border-oai-gray-100 dark:border-oai-gray-800/60 pt-1.5">
                {getTooltipText(hoveredCell.level, hoveredCell.value)}
              </p>
            </div>
          </div>
          <div className="absolute bottom-[6px] left-0 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-white dark:bg-oai-gray-900 border-r border-b border-oai-gray-200/50 dark:border-oai-gray-800/50 shadow-sm" style={{ marginBottom: "1px" }} />
        </div>
      )}
    </div>
  );
}
