import React, { useEffect, useRef } from "react";
import WordCloudLib from "wordcloud";

export default function WordCloud({ words, width = 600, height = 400, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const draw = WordCloudLib?.default || WordCloudLib || window.WordCloud;
    if (!canvas || !words || words.length === 0 || typeof draw !== "function") return;

    const list = words.map(({ term, count }) => [term, count]);
    const max = list[0]?.[1] || 1;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    draw(canvas, {
      list,
      gridSize: Math.round((16 * width) / 1024),
      weightFactor: (w) => (w / max) * (Math.min(width, height) / 8),
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: () => {
        const colors = [
          "#059669", "#10b981", "#34d399", "#047857", "#065f46",
          "#8b5cf6", "#6366f1", "#3b82f6", "#f59e0b", "#ec4899",
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      },
      rotateRatio: 0.3,
      minRotation: -0.5,
      maxRotation: 0.5,
      backgroundColor: "transparent",
      shuffle: false,
      shape: "circle",
      ellipticity: 1.0,
      clearCanvas: true,
    });

    return () => {
      const dpr = window.devicePixelRatio || 1;
      ctx && ctx.clearRect(0, 0, width * dpr, height * dpr);
    };
  }, [words, width, height]);

  if (!words || words.length === 0) {
    return <p className="text-body-sm text-neutral-500">No terms to display</p>;
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  );
}
