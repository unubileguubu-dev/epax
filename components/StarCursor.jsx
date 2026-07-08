'use client';

import { useEffect, useRef } from 'react';

/**
 * EPAX cursor star trail.
 *
 * One fixed canvas + one requestAnimationFrame loop. Particles chase the
 * pointer with lerp (0.12 at the head easing to 0.08 at the tail) so the
 * trail flows behind the cursor instead of snapping to it. The pointermove
 * listener does nothing but record the latest target — all animation happens
 * inside the RAF loop.
 *
 * Usage: render once, anywhere (e.g. app/layout.jsx): <StarCursor />
 */
export default function StarCursor({
  count = 16,
  colors = ['#C9A84C', '#4a8fdd', '#85B7EB', '#0d3f74'],
  zIndex = 300,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip touch devices and users who prefer reduced motion.
    const fine = matchMedia('(pointer: fine)').matches;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    const ctx = canvas.getContext('2d');
    const pointer = { x: innerWidth / 2, y: innerHeight / 2, seen: false, last: 0 };
    const parts = Array.from({ length: count }, () => ({ x: pointer.x, y: pointer.y }));
    let dpr = 1;
    let rafId = 0;

    const onMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
      pointer.last = performance.now();
    };

    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };

    const drawStar = (x, y, s, rot, color, alpha) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, s * 0.3);
      ctx.lineCap = 'round';
      const d = s * 0.5;
      ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
      ctx.moveTo(0, -s); ctx.lineTo(0, s);
      ctx.moveTo(-d, -d); ctx.lineTo(d, d);
      ctx.moveTo(d, -d); ctx.lineTo(-d, d);
      ctx.stroke();
      ctx.restore();
    };

    const frame = () => {
      rafId = requestAnimationFrame(frame);
      const now = performance.now();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      if (!pointer.seen) return;

      // Fade the whole trail out ~0.4s after the pointer stops moving.
      const idle = now - pointer.last;
      const fade = Math.max(0, 1 - Math.max(0, idle - 400) / 600);
      if (fade === 0) return;

      let tx = pointer.x;
      let ty = pointer.y;
      for (let i = 0; i < count; i++) {
        const p = parts[i];
        const t = i / (count - 1);
        const k = 0.12 - t * 0.04; // lerp factor: 0.12 head → 0.08 tail
        p.x += (tx - p.x) * k;
        p.y += (ty - p.y) * k;
        drawStar(
          p.x, p.y,
          (1 - t) * 6.5 + 2,
          now * 0.0012 * (i % 2 ? 1 : -1) + i,
          colors[i % colors.length],
          (1 - t) * 0.8 * fade
        );
        tx = p.x;
        ty = p.y;
      }
    };

    size();
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('resize', size);
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      removeEventListener('pointermove', onMove);
      removeEventListener('resize', size);
    };
  }, [count, colors, zIndex]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}
    />
  );
}
