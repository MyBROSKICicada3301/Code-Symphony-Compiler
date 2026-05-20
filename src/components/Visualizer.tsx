import { useEffect, useRef } from "react";

interface Props {
  analyser: AnalyserNode | null;
  active: boolean;
}

// Restrained oscilloscope-style visualization: thin waveform + tick bars.
export function Visualizer({ analyser }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    let bars = new Uint8Array(256);
    let wave = new Uint8Array(256);

    const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = c.getBoundingClientRect();
      c.width = r.width * dpr; c.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight;
      const bg = cssVar("--card");
      const fg = cssVar("--foreground");
      const border = cssVar("--border");
      const signal = cssVar("--signal");

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // grid — engineered, sparse
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cols = 12, rows = 6;
      for (let i = 1; i < cols; i++) {
        const x = Math.floor((w / cols) * i) + 0.5;
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let i = 1; i < rows; i++) {
        const y = Math.floor((h / rows) * i) + 0.5;
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();

      // baseline
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.moveTo(0, h / 2 + 0.5);
      ctx.lineTo(w, h / 2 + 0.5);
      ctx.stroke();

      if (analyser) {
        if (bars.length !== analyser.frequencyBinCount) {
          bars = new Uint8Array(analyser.frequencyBinCount);
          wave = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(bars);
        analyser.getByteTimeDomainData(wave);
      } else {
        bars.fill(0); wave.fill(128);
      }

      // thin spectrum ticks along the bottom
      const n = 96;
      const tickW = w / n;
      ctx.fillStyle = fg;
      for (let i = 0; i < n; i++) {
        const v = bars[Math.floor(i * (bars.length / n))] / 255;
        const bh = Math.max(1, v * h * 0.42);
        ctx.fillRect(Math.floor(i * tickW) + 0.5, h - bh, 1, bh);
      }

      // waveform line — single hairline, signal color
      ctx.strokeStyle = signal;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let i = 0; i < wave.length; i++) {
        const x = (i / wave.length) * w;
        const y = (wave[i] / 255) * h * 0.5 + h * 0.25;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, [analyser]);

  return <canvas ref={ref} className="h-full w-full border border-border bg-card" />;
}
