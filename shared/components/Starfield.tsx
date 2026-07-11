'use client';

import { useEffect, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  driftX: number;
  driftY: number;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
};

function createStars(width: number, height: number, count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.4 + 0.3,
    baseAlpha: Math.random() * 0.55 + 0.2,
    twinkleSpeed: Math.random() * 1.8 + 0.6,
    twinklePhase: Math.random() * Math.PI * 2,
    driftX: (Math.random() - 0.5) * 0.03,
    driftY: (Math.random() - 0.5) * 0.02,
  }));
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];
    let raf = 0;
    let lastSpawn = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(width, height, Math.floor((width * height) / 4500));
    };

    const spawnShootingStar = () => {
      const fromTop = Math.random() > 0.35;
      shooting.push({
        x: fromTop ? Math.random() * width : -20,
        y: fromTop ? -20 : Math.random() * height * 0.5,
        vx: 4.5 + Math.random() * 3.5,
        vy: 2.2 + Math.random() * 2.2,
        life: 0,
        maxLife: 55 + Math.random() * 35,
        length: 60 + Math.random() * 80,
      });
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Deep space wash
      const wash = ctx.createRadialGradient(
        width * 0.5,
        height * 0.2,
        0,
        width * 0.5,
        height * 0.55,
        Math.max(width, height) * 0.85,
      );
      wash.addColorStop(0, 'rgba(18, 32, 58, 0.35)');
      wash.addColorStop(0.45, 'rgba(6, 12, 24, 0.15)');
      wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, width, height);

      const t = time * 0.001;

      for (const star of stars) {
        if (!reducedMotion) {
          star.x += star.driftX;
          star.y += star.driftY;
          if (star.x < 0) star.x = width;
          if (star.x > width) star.x = 0;
          if (star.y < 0) star.y = height;
          if (star.y > height) star.y = 0;
        }

        const twinkle = reducedMotion
          ? 1
          : 0.55 +
            0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.baseAlpha * twinkle;

        ctx.beginPath();
        ctx.fillStyle = `rgba(235, 242, 255, ${alpha})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();

        if (star.r > 1.1) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 214, 140, ${alpha * 0.35})`;
          ctx.arc(star.x, star.y, star.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reducedMotion) {
        if (time - lastSpawn > 2800 + Math.random() * 4200) {
          spawnShootingStar();
          lastSpawn = time;
        }

        shooting = shooting.filter((s) => s.life < s.maxLife);
        for (const s of shooting) {
          s.life += 1;
          s.x += s.vx;
          s.y += s.vy;
          const fade = 1 - s.life / s.maxLife;
          const tailX = s.x - s.vx * (s.length / 8);
          const tailY = s.y - s.vy * (s.length / 8);

          const streak = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
          streak.addColorStop(0, 'rgba(255,255,255,0)');
          streak.addColorStop(0.55, `rgba(180, 220, 255, ${0.25 * fade})`);
          streak.addColorStop(1, `rgba(255, 245, 220, ${0.9 * fade})`);

          ctx.beginPath();
          ctx.strokeStyle = streak;
          ctx.lineWidth = 1.5;
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
