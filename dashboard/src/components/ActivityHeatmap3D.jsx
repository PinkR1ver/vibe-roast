import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";

const SOURCE_COLORS = {
  codex: { top: "#10b981", side: "#059669", dark: "#047857" },
  claude: { top: "#f59e0b", side: "#d97706", dark: "#b45309" },
  cursor: { top: "#3b82f6", side: "#2563eb", dark: "#1d4ed8" },
};
const DEFAULT_COLOR = { top: "#6b7280", side: "#4b5563", dark: "#374151" };
const GRID_COLOR = "rgba(255,255,255,0.04)";
const CELL = 11;
const GAP = 2;
const MAX_H = 32;

function buildDailyData(prompts, weeks = 20) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - weeks * 7 + 1);
  const startDow = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - (startDow === 0 ? 6 : startDow - 1));

  const map = new Map();
  for (const p of prompts || []) {
    if (!p.timestamp) continue;
    const day = String(p.timestamp).slice(0, 10);
    if (!map.has(day)) map.set(day, { total: 0, sources: {} });
    const entry = map.get(day);
    entry.total++;
    const src = p.source || "unknown";
    entry.sources[src] = (entry.sources[src] || 0) + 1;
  }

  const totalDays = Math.floor((end - start) / 86400000) + 1;
  const weekCount = Math.ceil(totalDays / 7);
  const grid = [];
  let globalMax = 0;

  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start);
      dt.setUTCDate(dt.getUTCDate() + w * 7 + d);
      const key = dt.toISOString().slice(0, 10);
      const entry = map.get(key);
      if (dt > end) { week.push(null); continue; }
      const total = entry?.total || 0;
      if (total > globalMax) globalMax = total;
      week.push({
        day: key,
        total,
        sources: entry?.sources || {},
      });
    }
    grid.push(week);
  }

  // Trim empty weeks from end
  while (grid.length > 0 && grid[grid.length - 1].every(c => c === null || c.total === 0)) {
    grid.pop();
  }

  return { grid, max: globalMax, weekCount: grid.length };
}

/* ══════════════════════════════════════════════════════
   3D Projection helpers
   ══════════════════════════════════════════════════════ */

function rotate(x, y, z, yaw, pitch) {
  const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  const x1 = x * cosY - y * sinY;
  const y1 = x * sinY + y * cosY;
  const z1 = z;
  const x2 = x1;
  const y2 = y1 * cosP - z1 * sinP;
  return { x: x2, y: y2, z: y1 * sinP + z1 * cosP };
}

export default function ActivityHeatmap3D({ prompts = [], weeks = 20 }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const angleRef = useRef({ yaw: -0.55, pitch: 0.75 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const growthRef = useRef(0);
  const rafRef = useRef(null);
  const mountedRef = useRef(true);

  const daily = useMemo(() => buildDailyData(prompts, weeks), [prompts, weeks]);
  const { grid, max, weekCount } = daily;

  // Growth animation
  useEffect(() => {
    mountedRef.current = true;
    growthRef.current = 0;
    const start = performance.now();
    const dur = 1000;
    const tick = (now) => {
      if (!mountedRef.current) return;
      growthRef.current = Math.min(1, 1 - Math.pow(1 - Math.min(1, (now - start) / dur), 3));
      if (growthRef.current < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { mountedRef.current = false; };
  }, [weekCount]);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const growth = growthRef.current;
    const { yaw, pitch } = angleRef.current;
    const cx = w / 2;
    const cy = h / 2 + 20;
    const unit = CELL + GAP;

    // Sort columns back-to-front for painter's algorithm
    const columns = [];
    for (let wi = 0; wi < grid.length; wi++) {
      for (let di = 0; di < 7; di++) {
        const cell = grid[wi]?.[di];
        if (!cell) continue;
        const xc = (wi - grid.length / 2) * unit;
        const yc = (di - 3.5) * unit;
        const proj = rotate(xc, yc, 0, yaw, pitch);
        columns.push({ ...cell, wi, di, proj, xc, yc });
      }
    }
    columns.sort((a, b) => b.proj.z - a.proj.z);

    // Draw grid lines
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= 7; r++) {
      const y = (r - 3.5) * unit;
      let started = false;
      ctx.beginPath();
      for (let c = 0; c <= grid.length; c++) {
        const p = rotate((c - grid.length / 2) * unit, y, 0, yaw, pitch);
        if (!started) { ctx.moveTo(cx + p.x, cy + p.y); started = true; }
        else ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.stroke();
    }
    for (let c = 0; c <= grid.length; c++) {
      const x = (c - grid.length / 2) * unit;
      const p1 = rotate(x, -3.5 * unit, 0, yaw, pitch);
      const p2 = rotate(x, 3.5 * unit, 0, yaw, pitch);
      ctx.beginPath();
      ctx.moveTo(cx + p1.x, cy + p1.y);
      ctx.lineTo(cx + p2.x, cy + p2.y);
      ctx.stroke();
    }

    // Draw columns
    const half = (CELL - GAP) / 2;
    for (const col of columns) {
      if (col.total === 0) continue;
      const hgt = Math.max(1, (col.total / Math.max(max, 1)) * MAX_H) * growth;

      // Determine dominant source for color
      const sources = Object.entries(col.sources).sort((a, b) => b[1] - a[1]);
      const dominant = sources[0]?.[0] || "unknown";
      const colors = SOURCE_COLORS[dominant] || DEFAULT_COLOR;

      // Draw top face
      ctx.fillStyle = colors.top;
      ctx.beginPath();
      const t0 = rotate(col.xc - half, col.yc - half, hgt, yaw, pitch);
      const t1 = rotate(col.xc + half, col.yc - half, hgt, yaw, pitch);
      const t2 = rotate(col.xc + half, col.yc + half, hgt, yaw, pitch);
      const t3 = rotate(col.xc - half, col.yc + half, hgt, yaw, pitch);
      ctx.moveTo(cx + t0.x, cy + t0.y);
      ctx.lineTo(cx + t1.x, cy + t1.y);
      ctx.lineTo(cx + t2.x, cy + t2.y);
      ctx.lineTo(cx + t3.x, cy + t3.y);
      ctx.closePath();
      ctx.fill();

      // Front-right face (lighter)
      ctx.fillStyle = colors.side;
      ctx.beginPath();
      const b1 = rotate(col.xc + half, col.yc - half, 0, yaw, pitch);
      const b2 = rotate(col.xc + half, col.yc + half, 0, yaw, pitch);
      ctx.moveTo(cx + t1.x, cy + t1.y);
      ctx.lineTo(cx + b1.x, cy + b1.y);
      ctx.lineTo(cx + b2.x, cy + b2.y);
      ctx.lineTo(cx + t2.x, cy + t2.y);
      ctx.closePath();
      ctx.fill();

      // Front-left face (darker)
      ctx.fillStyle = colors.dark;
      ctx.beginPath();
      const b0 = rotate(col.xc - half, col.yc - half, 0, yaw, pitch);
      ctx.moveTo(cx + t0.x, cy + t0.y);
      ctx.lineTo(cx + b0.x, cy + b0.y);
      ctx.lineTo(cx + b1.x, cy + b1.y);
      ctx.lineTo(cx + t1.x, cy + t1.y);
      ctx.closePath();
      ctx.fill();
    }
  }, [grid, max, weekCount]);

  // RAF render loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [render]);

  // Auto-rotate
  useEffect(() => {
    const tick = () => {
      if (dragRef.current) return;
      angleRef.current.yaw += 0.003;
    };
    const id = setInterval(tick, 16);
    return () => clearInterval(id);
  }, []);

  // Mouse drag
  const onPointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, yaw: angleRef.current.yaw, pitch: angleRef.current.pitch };
    velocityRef.current = { x: 0, y: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    velocityRef.current = { x: -dx * 0.005, y: -dy * 0.005 };
    angleRef.current.yaw = dragRef.current.yaw - dx * 0.005;
    angleRef.current.pitch = Math.max(-1.2, Math.min(1.2, dragRef.current.pitch - dy * 0.005));
  };
  const onPointerUp = () => {
    dragRef.current = null;
    // Inertia
    const decay = () => {
      if (dragRef.current) return;
      velocityRef.current.x *= 0.94;
      velocityRef.current.y *= 0.94;
      if (Math.abs(velocityRef.current.x) < 0.0002 && Math.abs(velocityRef.current.y) < 0.0002) return;
      angleRef.current.yaw += velocityRef.current.x;
      angleRef.current.pitch = Math.max(-1.2, Math.min(1.2, angleRef.current.pitch + velocityRef.current.y));
      requestAnimationFrame(() => { decay(); });
    };
    requestAnimationFrame(decay);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
