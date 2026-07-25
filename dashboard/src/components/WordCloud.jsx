import React, { useEffect, useRef, useState } from "react";
import WordCloudLib from "wordcloud";

const DEFAULT_PALETTE = [
  "#c45c26", "#d97706", "#b45309", "#8b5a2b", "#6b6560",
  "#5b8cff", "#23d6a5", "#e07a3a", "#f0c14a", "#ff5a1f",
];

function stableColor(term, palette) {
  let hash = 0;
  for (const character of String(term || "")) {
    hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Word cloud via wordcloud2.
 * DPR note: enlarge the canvas buffer and scale gridSize/weightFactor —
 * do NOT ctx.scale(dpr). Pre-scaling the context double-offsets placement
 * into the bottom-right (library coords already use canvas.width/height).
 */
export default function WordCloud({
  words,
  width: widthProp = 600,
  height: heightProp = 400,
  className = "",
  gridSize = null,
  weightDivisor = 5.5,
  rotateRatio = 0.18,
  minRotation = -0.35,
  maxRotation = 0.35,
  shape = "circle",
  ellipticity = 0.72,
  minSize = 9,
  colors = null,
  fontFamily = "Outfit, system-ui, sans-serif",
  fillContainer = true,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: widthProp, height: heightProp });

  useEffect(() => {
    if (!fillContainer) {
      setSize({ width: widthProp, height: heightProp });
      return undefined;
    }
    const el = wrapRef.current;
    if (!el) return undefined;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(180, Math.floor(rect.width) || widthProp);
      const h = Math.max(120, Math.floor(rect.height) || heightProp);
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [widthProp, heightProp, fillContainer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const draw = WordCloudLib?.default || WordCloudLib || window.WordCloud;
    if (!canvas || !words?.length || typeof draw !== "function") return undefined;

    const { width, height } = size;
    if (width < 2 || height < 2) return undefined;

    const list = words
      .map(({ term, weight, count }) => [
        String(term || "").trim(),
        Math.max(1, Number(weight ?? count) || 1),
      ])
      .filter(([term]) => term.length > 0);
    if (!list.length) return undefined;

    const max = Math.max(...list.map(([, c]) => c), 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const palette = colors?.length ? colors : DEFAULT_PALETTE;
    const baseGrid = gridSize ?? Math.max(5, Math.round(Math.min(width, height) / 48));
    const span = Math.min(width, height);

    const weightFactor = (w) => {
      const t = w / max;
      // Soft curve keeps mid-weight terms readable without crushing the top.
      const px = 10 + Math.pow(t, 0.62) * (span / weightDivisor);
      return px * dpr;
    };

    draw(canvas, {
      list,
      gridSize: Math.max(3, Math.round(baseGrid * dpr)),
      weightFactor,
      fontFamily,
      fontWeight: "700",
      color: (term) => stableColor(term, palette),
      rotateRatio,
      minRotation,
      maxRotation,
      rotationSteps: 2,
      backgroundColor: "transparent",
      shuffle: false,
      shape,
      ellipticity,
      minSize: Math.max(1, minSize * dpr),
      drawOutOfBound: false,
      // wordcloud2 recursively shrinks until placement succeeds. Our weight
      // factor has a deliberate minimum, so an unplaceable long term can
      // otherwise recurse forever in narrow mobile containers.
      shrinkToFit: false,
      clearCanvas: true,
    });

    return () => {
      if (typeof draw.stop === "function") draw.stop();
    };
  }, [
    words,
    size,
    gridSize,
    weightDivisor,
    rotateRatio,
    minRotation,
    maxRotation,
    shape,
    ellipticity,
    minSize,
    colors,
    fontFamily,
  ]);

  if (!words || words.length === 0) {
    return <p className="text-body-sm text-oai-gray-500">No terms to display</p>;
  }

  return (
    <div
      ref={wrapRef}
      className={`relative flex h-full w-full min-h-[120px] items-center justify-center overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block max-w-full" aria-hidden="true" />
      <ul className="sr-only">
        {words.map(({ term, prompt_count: promptCount, count }) => (
          <li key={term}>
            {term}: {promptCount ?? count}
          </li>
        ))}
      </ul>
    </div>
  );
}
