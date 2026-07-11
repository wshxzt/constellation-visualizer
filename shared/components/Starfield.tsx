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

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
  width: number;
  hue: 'warm' | 'cool' | 'amber';
  sparks: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[];
};

type RocketKind = 'falcon' | 'starship';

type Rocket = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  scale: number;
  kind: RocketKind;
  life: number;
  maxLife: number;
  plume: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number }[];
};

type SatelliteKind = 'starlink' | 'classic';

type Satellite = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  scale: number;
  kind: SatelliteKind;
  life: number;
  maxLife: number;
  glintPhase: number;
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

function meteorColors(hue: Meteor['hue'], fade: number) {
  if (hue === 'amber') {
    return {
      mid: `rgba(255, 196, 110, ${0.7 * fade})`,
      head: `rgba(255, 236, 190, ${fade})`,
      core: `rgba(255, 255, 255, ${fade})`,
    };
  }
  if (hue === 'cool') {
    return {
      mid: `rgba(140, 200, 255, ${0.65 * fade})`,
      head: `rgba(210, 235, 255, ${fade})`,
      core: `rgba(255, 255, 255, ${fade})`,
    };
  }
  return {
    mid: `rgba(200, 220, 255, ${0.6 * fade})`,
    head: `rgba(255, 248, 230, ${fade})`,
    core: `rgba(255, 255, 255, ${fade})`,
  };
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
    let meteors: Meteor[] = [];
    let rockets: Rocket[] = [];
    let satellites: Satellite[] = [];
    let raf = 0;
    let lastSpawn = 0;
    let nextSpawnDelay = 1200;
    let lastRocketSpawn = 0;
    let nextRocketDelay = 800;
    let lastSatSpawn = 0;
    let nextSatDelay = 1500;

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

    const spawnMeteor = (big = false) => {
      const fromTop = Math.random() > 0.25;
      const speed = big ? 9 + Math.random() * 5 : 6.5 + Math.random() * 4.5;
      const angle = Math.PI / 6 + Math.random() * (Math.PI / 5);
      const hueRoll = Math.random();
      const hue: Meteor['hue'] =
        hueRoll > 0.7 ? 'amber' : hueRoll > 0.35 ? 'cool' : 'warm';

      meteors.push({
        x: fromTop ? Math.random() * width * 0.9 : -60,
        y: fromTop ? -40 - Math.random() * 60 : Math.random() * height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: big ? 90 + Math.random() * 50 : 60 + Math.random() * 40,
        length: big ? 180 + Math.random() * 120 : 110 + Math.random() * 90,
        width: big ? 3.2 + Math.random() * 1.6 : 2 + Math.random() * 1.4,
        hue,
        sparks: [],
      });
    };

    const spawnRocket = () => {
      const fromLeft = Math.random() > 0.5;
      const kind: RocketKind = Math.random() > 0.45 ? 'falcon' : 'starship';
      const angle = fromLeft
        ? -Math.PI / 2 + (0.25 + Math.random() * 0.5)
        : -Math.PI / 2 - (0.25 + Math.random() * 0.5);
      const speed = 2.2 + Math.random() * 2.2;
      const scale =
        kind === 'starship' ? 0.75 + Math.random() * 0.45 : 0.6 + Math.random() * 0.45;

      rockets.push({
        x: Math.random() * width * 0.92 + width * 0.04,
        y: height + 30 + Math.random() * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        scale,
        kind,
        life: 0,
        maxLife: 200 + Math.random() * 120,
        plume: [],
      });
    };

    const spawnSatellite = (overrides?: Partial<Satellite>) => {
      const fromLeft = Math.random() > 0.5;
      const kind: SatelliteKind = Math.random() > 0.4 ? 'starlink' : 'classic';
      const speed = 0.55 + Math.random() * 0.85;
      const angle = fromLeft
        ? -0.12 + Math.random() * 0.24
        : Math.PI - 0.12 + Math.random() * 0.24;
      const y = height * (0.08 + Math.random() * 0.55);

      satellites.push({
        x: fromLeft ? -40 : width + 40,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.35,
        angle: fromLeft ? 0.08 : Math.PI - 0.08,
        spin: (Math.random() - 0.5) * 0.012,
        scale: kind === 'starlink' ? 0.55 + Math.random() * 0.35 : 0.7 + Math.random() * 0.4,
        kind,
        life: 0,
        maxLife: 500 + Math.random() * 300,
        glintPhase: Math.random() * Math.PI * 2,
        ...overrides,
      });
    };

    const spawnStarlinkTrain = () => {
      const fromLeft = Math.random() > 0.5;
      const count = 4 + Math.floor(Math.random() * 5);
      const y = height * (0.12 + Math.random() * 0.4);
      const speed = 0.7 + Math.random() * 0.5;
      const angle = fromLeft ? 0.05 : Math.PI - 0.05;
      const spacing = 22 + Math.random() * 10;

      for (let i = 0; i < count; i++) {
        const offset = i * spacing;
        spawnSatellite({
          kind: 'starlink',
          x: fromLeft ? -40 - offset : width + 40 + offset,
          y: y + (Math.random() - 0.5) * 4,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.15,
          angle,
          spin: 0,
          scale: 0.5 + Math.random() * 0.2,
          maxLife: 550 + Math.random() * 200,
        });
      }
    };

    const drawMeteor = (m: Meteor) => {
      const fadeIn = Math.min(1, m.life / 8);
      const fadeOut = Math.max(0, 1 - m.life / m.maxLife);
      const fade = fadeIn * fadeOut;
      if (fade <= 0) return;
      const colors = meteorColors(m.hue, fade);

      const speed = Math.hypot(m.vx, m.vy) || 1;
      const ux = m.vx / speed;
      const uy = m.vy / speed;
      const tailX = m.x - ux * m.length;
      const tailY = m.y - uy * m.length;

      const bloomRadius = Math.max(0.01, m.width * 14);
      const bloom = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, bloomRadius);
      bloom.addColorStop(0, `rgba(255, 255, 255, ${0.45 * fade})`);
      bloom.addColorStop(0.3, colors.mid);
      bloom.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.fillStyle = bloom;
      ctx.arc(m.x, m.y, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      const soft = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      soft.addColorStop(0, 'rgba(255,255,255,0)');
      soft.addColorStop(0.5, colors.mid);
      soft.addColorStop(1, colors.head);
      ctx.beginPath();
      ctx.strokeStyle = soft;
      ctx.lineWidth = m.width * 2.4;
      ctx.lineCap = 'round';
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      const streak = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      streak.addColorStop(0, 'rgba(255,255,255,0)');
      streak.addColorStop(0.4, colors.mid);
      streak.addColorStop(0.8, colors.head);
      streak.addColorStop(1, colors.core);
      ctx.beginPath();
      ctx.strokeStyle = streak;
      ctx.lineWidth = m.width;
      ctx.lineCap = 'round';
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = colors.core;
      ctx.arc(m.x, m.y, Math.max(0.01, m.width * 1.6), 0, Math.PI * 2);
      ctx.fill();

      for (const spark of m.sparks) {
        const sFade = Math.max(0, 1 - spark.life / spark.maxLife);
        const radius = 1.1 * sFade;
        if (radius <= 0) continue;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 230, 180, ${0.7 * sFade * fade})`;
        ctx.arc(spark.x, spark.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawFalcon = (s: number, fade: number) => {
      // Body
      ctx.fillStyle = `rgba(236, 240, 245, ${0.95 * fade})`;
      ctx.beginPath();
      ctx.moveTo(-4 * s, 18 * s);
      ctx.lineTo(-4 * s, -14 * s);
      ctx.quadraticCurveTo(0, -22 * s, 4 * s, -14 * s);
      ctx.lineTo(4 * s, 18 * s);
      ctx.closePath();
      ctx.fill();

      // Interstage band
      ctx.fillStyle = `rgba(28, 32, 40, ${0.9 * fade})`;
      ctx.fillRect(-4 * s, -2 * s, 8 * s, 3 * s);

      // Octaweb / engine section
      ctx.fillStyle = `rgba(55, 60, 70, ${0.95 * fade})`;
      ctx.fillRect(-4.2 * s, 14 * s, 8.4 * s, 5 * s);

      // Grid fins
      ctx.fillStyle = `rgba(40, 44, 52, ${0.85 * fade})`;
      ctx.fillRect(-9 * s, 2 * s, 5 * s, 2.2 * s);
      ctx.fillRect(4 * s, 2 * s, 5 * s, 2.2 * s);

      // Landing legs (folded silhouette)
      ctx.strokeStyle = `rgba(180, 186, 196, ${0.7 * fade})`;
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(-4 * s, 18 * s);
      ctx.lineTo(-8 * s, 22 * s);
      ctx.moveTo(4 * s, 18 * s);
      ctx.lineTo(8 * s, 22 * s);
      ctx.stroke();
    };

    const drawStarship = (s: number, fade: number) => {
      // Stainless body
      const body = ctx.createLinearGradient(-6 * s, 0, 6 * s, 0);
      body.addColorStop(0, `rgba(150, 156, 165, ${0.95 * fade})`);
      body.addColorStop(0.45, `rgba(220, 224, 230, ${0.98 * fade})`);
      body.addColorStop(1, `rgba(140, 146, 155, ${0.95 * fade})`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-5.5 * s, 20 * s);
      ctx.lineTo(-5.5 * s, -8 * s);
      ctx.quadraticCurveTo(0, -26 * s, 5.5 * s, -8 * s);
      ctx.lineTo(5.5 * s, 20 * s);
      ctx.closePath();
      ctx.fill();

      // Forward flaps
      ctx.fillStyle = `rgba(120, 126, 136, ${0.9 * fade})`;
      ctx.beginPath();
      ctx.moveTo(-5.5 * s, -4 * s);
      ctx.lineTo(-11 * s, 2 * s);
      ctx.lineTo(-5.5 * s, 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5.5 * s, -4 * s);
      ctx.lineTo(11 * s, 2 * s);
      ctx.lineTo(5.5 * s, 4 * s);
      ctx.closePath();
      ctx.fill();

      // Aft flaps
      ctx.fillStyle = `rgba(100, 106, 116, ${0.9 * fade})`;
      ctx.fillRect(-10 * s, 12 * s, 4.5 * s, 2.5 * s);
      ctx.fillRect(5.5 * s, 12 * s, 4.5 * s, 2.5 * s);

      // Heat-shield hint (darker leading edge)
      ctx.strokeStyle = `rgba(70, 74, 82, ${0.55 * fade})`;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(-5.5 * s, 18 * s);
      ctx.lineTo(-5.5 * s, -6 * s);
      ctx.stroke();
    };

    const drawRocket = (r: Rocket) => {
      const fadeIn = Math.min(1, r.life / 18);
      const fadeOut = Math.max(0, 1 - Math.max(0, r.life - r.maxLife + 40) / 40);
      const fade = fadeIn * fadeOut;
      if (fade <= 0) return;

      const s = r.scale;

      // Exhaust plume glow behind the vehicle
      const backX = r.x - Math.cos(r.angle) * 10 * s;
      const backY = r.y - Math.sin(r.angle) * 10 * s;
      const plumeGlow = ctx.createRadialGradient(backX, backY, 0, backX, backY, 28 * s);
      plumeGlow.addColorStop(0, `rgba(255, 220, 140, ${0.55 * fade})`);
      plumeGlow.addColorStop(0.35, `rgba(255, 120, 40, ${0.35 * fade})`);
      plumeGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.fillStyle = plumeGlow;
      ctx.arc(backX, backY, 28 * s, 0, Math.PI * 2);
      ctx.fill();

      // Engine flame cone
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle + Math.PI / 2);

      const flicker = 0.85 + 0.15 * Math.sin(r.life * 0.7);
      const flame = ctx.createLinearGradient(0, 18 * s, 0, 48 * s * flicker);
      flame.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
      flame.addColorStop(0.25, `rgba(255, 210, 90, ${0.9 * fade})`);
      flame.addColorStop(0.55, `rgba(255, 110, 30, ${0.65 * fade})`);
      flame.addColorStop(1, `rgba(255, 40, 10, 0)`);
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-3.5 * s, 18 * s);
      ctx.quadraticCurveTo(0, 52 * s * flicker, 3.5 * s, 18 * s);
      ctx.closePath();
      ctx.fill();

      // Secondary blue-ish core (Merlin / Raptor look)
      const core = ctx.createLinearGradient(0, 18 * s, 0, 36 * s);
      core.addColorStop(0, `rgba(180, 220, 255, ${0.85 * fade})`);
      core.addColorStop(1, `rgba(80, 140, 255, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(-1.4 * s, 18 * s);
      ctx.quadraticCurveTo(0, 38 * s * flicker, 1.4 * s, 18 * s);
      ctx.closePath();
      ctx.fill();

      if (r.kind === 'falcon') drawFalcon(s, fade);
      else drawStarship(s, fade);

      ctx.restore();

      // Exhaust particles
      for (const p of r.plume) {
        const pFade = Math.max(0, 1 - p.life / p.maxLife) * fade;
        const radius = Math.max(0.01, p.r * pFade);
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, ${140 + Math.floor(80 * pFade)}, 60, ${0.55 * pFade})`;
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawStarlink = (s: number, fade: number) => {
      // Flat-panel bus
      ctx.fillStyle = `rgba(210, 216, 225, ${0.92 * fade})`;
      ctx.fillRect(-5 * s, -1.6 * s, 10 * s, 3.2 * s);

      // Phased-array face (darker)
      ctx.fillStyle = `rgba(40, 48, 62, ${0.9 * fade})`;
      ctx.fillRect(-4.2 * s, -1.1 * s, 8.4 * s, 2.2 * s);

      // Single solar wing
      const wing = ctx.createLinearGradient(5 * s, 0, 18 * s, 0);
      wing.addColorStop(0, `rgba(50, 70, 120, ${0.85 * fade})`);
      wing.addColorStop(1, `rgba(90, 140, 210, ${0.75 * fade})`);
      ctx.fillStyle = wing;
      ctx.fillRect(5 * s, -0.9 * s, 13 * s, 1.8 * s);
      ctx.strokeStyle = `rgba(180, 200, 230, ${0.35 * fade})`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(5 * s, -0.9 * s, 13 * s, 1.8 * s);
    };

    const drawClassicSat = (s: number, fade: number) => {
      // Central bus
      ctx.fillStyle = `rgba(200, 206, 216, ${0.95 * fade})`;
      ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
      ctx.fillStyle = `rgba(70, 78, 92, ${0.85 * fade})`;
      ctx.fillRect(-2 * s, -2 * s, 4 * s, 4 * s);

      // Antenna
      ctx.strokeStyle = `rgba(220, 225, 235, ${0.8 * fade})`;
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(0, -3 * s);
      ctx.lineTo(0, -8 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -8 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Dual solar panels
      const left = ctx.createLinearGradient(-16 * s, 0, -3 * s, 0);
      left.addColorStop(0, `rgba(70, 110, 190, ${0.8 * fade})`);
      left.addColorStop(1, `rgba(40, 60, 110, ${0.85 * fade})`);
      ctx.fillStyle = left;
      ctx.fillRect(-16 * s, -2.2 * s, 12 * s, 4.4 * s);

      const right = ctx.createLinearGradient(3 * s, 0, 16 * s, 0);
      right.addColorStop(0, `rgba(40, 60, 110, ${0.85 * fade})`);
      right.addColorStop(1, `rgba(70, 110, 190, ${0.8 * fade})`);
      ctx.fillStyle = right;
      ctx.fillRect(4 * s, -2.2 * s, 12 * s, 4.4 * s);

      ctx.strokeStyle = `rgba(160, 190, 230, ${0.3 * fade})`;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) {
        const x = -15 * s + i * 4 * s;
        ctx.beginPath();
        ctx.moveTo(x, -2.2 * s);
        ctx.lineTo(x, 2.2 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(5 * s + i * 4 * s, -2.2 * s);
        ctx.lineTo(5 * s + i * 4 * s, 2.2 * s);
        ctx.stroke();
      }
    };

    const drawSatellite = (sat: Satellite) => {
      const fadeIn = Math.min(1, sat.life / 25);
      const fadeOut = Math.max(0, 1 - Math.max(0, sat.life - sat.maxLife + 50) / 50);
      const fade = fadeIn * fadeOut;
      if (fade <= 0) return;

      const s = sat.scale;
      const glint = Math.pow(Math.max(0, Math.sin(sat.life * 0.04 + sat.glintPhase)), 12);

      ctx.save();
      ctx.translate(sat.x, sat.y);
      ctx.rotate(sat.angle);

      // Soft presence glow
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18 * s);
      glow.addColorStop(0, `rgba(180, 210, 255, ${0.18 * fade})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
      ctx.fill();

      if (sat.kind === 'starlink') drawStarlink(s, fade);
      else drawClassicSat(s, fade);

      // Specular sun glint
      if (glint > 0.05) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 14 * s);
        g.addColorStop(0, `rgba(255, 255, 255, ${0.95 * glint * fade})`);
        g.addColorStop(0.35, `rgba(200, 230, 255, ${0.45 * glint * fade})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

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
          : 0.55 + 0.45 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
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
        if (time - lastSpawn > nextSpawnDelay) {
          const burst = Math.random() > 0.65;
          spawnMeteor(Math.random() > 0.7);
          if (burst) {
            spawnMeteor(false);
            if (Math.random() > 0.4) spawnMeteor(false);
          }
          lastSpawn = time;
          nextSpawnDelay = 500 + Math.random() * 1400;
        }

        if (time - lastRocketSpawn > nextRocketDelay) {
          const count = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) spawnRocket();
          lastRocketSpawn = time;
          nextRocketDelay = 900 + Math.random() * 1800;
        }

        if (time - lastSatSpawn > nextSatDelay) {
          if (Math.random() > 0.55) {
            spawnStarlinkTrain();
          } else {
            const count = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < count; i++) spawnSatellite();
          }
          lastSatSpawn = time;
          nextSatDelay = 2200 + Math.random() * 3500;
        }

        meteors = meteors.filter((m) => m.life < m.maxLife);
        for (const m of meteors) {
          m.life += 1;
          m.x += m.vx;
          m.y += m.vy;

          if (m.life % 2 === 0 && m.life < m.maxLife * 0.85) {
            m.sparks.push({
              x: m.x - m.vx * (0.2 + Math.random() * 0.8),
              y: m.y - m.vy * (0.2 + Math.random() * 0.8),
              vx: -m.vx * 0.08 + (Math.random() - 0.5) * 1.4,
              vy: -m.vy * 0.08 + (Math.random() - 0.5) * 1.4,
              life: 0,
              maxLife: 10 + Math.random() * 14,
            });
          }

          for (const spark of m.sparks) {
            spark.life += 1;
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.vy += 0.04;
          }
          m.sparks = m.sparks.filter((s) => s.life < s.maxLife);

          drawMeteor(m);
        }

        rockets = rockets.filter(
          (r) =>
            r.life < r.maxLife &&
            r.y > -80 &&
            r.x > -80 &&
            r.x < width + 80,
        );
        for (const r of rockets) {
          r.life += 1;
          r.x += r.vx;
          r.y += r.vy;
          // Slight acceleration as it climbs
          r.vx *= 1.0015;
          r.vy *= 1.0015;

          if (r.life % 2 === 0) {
            const bx = r.x - Math.cos(r.angle) * 14 * r.scale;
            const by = r.y - Math.sin(r.angle) * 14 * r.scale;
            for (let i = 0; i < 2; i++) {
              r.plume.push({
                x: bx + (Math.random() - 0.5) * 6,
                y: by + (Math.random() - 0.5) * 6,
                vx: -r.vx * 0.2 + (Math.random() - 0.5) * 0.8,
                vy: -r.vy * 0.2 + (Math.random() - 0.5) * 0.8,
                life: 0,
                maxLife: 18 + Math.random() * 16,
                r: 1.5 + Math.random() * 2.5,
              });
            }
          }

          for (const p of r.plume) {
            p.life += 1;
            p.x += p.vx;
            p.y += p.vy;
            p.r *= 0.97;
          }
          r.plume = r.plume.filter((p) => p.life < p.maxLife);

          drawRocket(r);
        }

        satellites = satellites.filter(
          (sat) =>
            sat.life < sat.maxLife &&
            sat.x > -100 &&
            sat.x < width + 100 &&
            sat.y > -60 &&
            sat.y < height + 60,
        );
        for (const sat of satellites) {
          sat.life += 1;
          sat.x += sat.vx;
          sat.y += sat.vy;
          sat.angle += sat.spin;
          drawSatellite(sat);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    if (!reducedMotion) {
      spawnMeteor(true);
      spawnMeteor(false);
      spawnRocket();
      spawnRocket();
      spawnRocket();
      spawnStarlinkTrain();
      spawnSatellite();
      spawnSatellite();
    }
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
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    />
  );
}
