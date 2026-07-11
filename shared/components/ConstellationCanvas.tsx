'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export type CanvasStar = {
  id: number;
  name: string;
  x: number;
  y: number;
};

export type CanvasConnection = {
  from: { name: string; x: number; y: number };
  to: { name: string; x: number; y: number };
};

export type CanvasPathNode = {
  name: string;
  x: number;
  y: number;
};

type ConstellationCanvasProps = {
  stars: CanvasStar[];
  connections: CanvasConnection[];
  path?: CanvasPathNode[];
  start?: string;
  end?: string;
  onStarActivate?: (starName: string) => void;
};

const GLOBE_RADIUS = 42;
const SOURCE_W = 900;
const SOURCE_H = 650;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function projectToSphere(x: number, y: number, radius = GLOBE_RADIUS) {
  const lon = ((x / SOURCE_W) * 2 - 1) * Math.PI;
  const lat = -((y / SOURCE_H) * 2 - 1) * (Math.PI / 2) * 0.92;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    radius * cosLat * Math.sin(lon),
  );
}

function starColor(name: string, start?: string, end?: string, pathNames?: Set<string>) {
  if (name === start) return new THREE.Color('#f0c75e');
  if (name === end) return new THREE.Color('#fb7185');
  if (pathNames?.has(name)) return new THREE.Color('#5eead4');
  return new THREE.Color('#d8e2f0');
}

function createStarTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.15, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(220,235,255,0.45)');
  gradient.addColorStop(0.65, 'rgba(140,180,255,0.12)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function greatCirclePoints(
  a: THREE.Vector3,
  b: THREE.Vector3,
  segments = 48,
  radius = GLOBE_RADIUS * 1.04,
) {
  const points: THREE.Vector3[] = [];
  const angle = a.angleTo(b);
  if (angle < 1e-4) return [a.clone().setLength(radius), b.clone().setLength(radius)];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = new THREE.Vector3().addVectors(
      a.clone().multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle)),
      b.clone().multiplyScalar(Math.sin(t * angle) / Math.sin(angle)),
    );
    point.setLength(radius);
    points.push(point);
  }
  return points;
}

function makeTube(
  points: THREE.Vector3[],
  radius: number,
  color: number,
  opacity = 1,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, Math.max(points.length * 2, 24), radius, 8, false);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
  });
  return new THREE.Mesh(geometry, material);
}

export function ConstellationCanvas({
  stars,
  connections,
  path,
  start,
  end,
  onStarActivate,
}: ConstellationCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onStarActivateRef = useRef(onStarActivate);
  onStarActivateRef.current = onStarActivate;

  const sceneApiRef = useRef<{
    setData: (input: {
      stars: CanvasStar[];
      connections: CanvasConnection[];
      path?: CanvasPathNode[];
      start?: string;
      end?: string;
    }) => void;
    focusStar: (starName: string, opts?: { force?: boolean }) => void;
    reset: () => void;
  } | null>(null);
  const prevSelectionRef = useRef<{ start?: string; end?: string }>({});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 900;
    const height = Math.max(420, Math.round(width * 0.62));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03060d, 0.012);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 18, 118);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(width, height);
    labelRenderer.domElement.className = 'cv-label-layer';
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 70;
    controls.maxDistance = 180;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.rotateSpeed = 0.7;

    const stopAutoRotate = () => {
      controls.autoRotate = false;
      cameraFlight = null;
    };
    controls.addEventListener('start', stopAutoRotate);

    type CameraFlight = {
      fromPos: THREE.Vector3;
      toPos: THREE.Vector3;
      fromTarget: THREE.Vector3;
      toTarget: THREE.Vector3;
      t: number;
      duration: number;
    };
    let cameraFlight: CameraFlight | null = null;

    const isStarFacingCamera = (position: THREE.Vector3) => {
      const camDir = camera.position.clone().normalize();
      return position.clone().normalize().dot(camDir) > 0.12;
    };

    const isStarOnScreen = (position: THREE.Vector3) => {
      if (!isStarFacingCamera(position)) return false;
      const projected = position.clone().project(camera);
      return (
        projected.z < 1 &&
        Math.abs(projected.x) < 0.82 &&
        Math.abs(projected.y) < 0.82
      );
    };

    const focusStar = (starName: string, opts?: { force?: boolean }) => {
      const position = starPositions.get(starName);
      if (!position) return;
      if (!opts?.force && isStarOnScreen(position)) return;

      controls.autoRotate = false;
      const distance = clamp(camera.position.length(), 95, 140);
      const toPos = position.clone().normalize().multiplyScalar(distance);
      // Keep a slight elevation so the view doesn't feel flat-on.
      toPos.y += distance * 0.08;

      cameraFlight = {
        fromPos: camera.position.clone(),
        toPos,
        fromTarget: controls.target.clone(),
        toTarget: position.clone().multiplyScalar(0.15),
        t: 0,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0.01
          : 0.85,
      };
    };

    scene.add(new THREE.AmbientLight(0x9eb6d8, 0.55));
    const key = new THREE.DirectionalLight(0xfff2d6, 1.1);
    key.position.set(40, 50, 30);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5eead4, 0.45);
    rim.position.set(-50, -20, -40);
    scene.add(rim);

    // Globe shell
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x071018,
        metalness: 0.2,
        roughness: 0.65,
        transmission: 0.05,
        thickness: 0.8,
        transparent: true,
        opacity: 0.88,
        clearcoat: 0.25,
        clearcoatRoughness: 0.45,
      }),
    );
    globeGroup.add(globe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.045, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x5eead4,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide,
      }),
    );
    globeGroup.add(atmosphere);

    const grid = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 28, 16)),
      new THREE.LineBasicMaterial({
        color: 0x5b6f8c,
        transparent: true,
        opacity: 0.08,
      }),
    );
    globeGroup.add(grid);

    // Tiny field stars around the globe
    {
      const count = 500;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = 90 + Math.random() * 120;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      scene.add(
        new THREE.Points(
          geo,
          new THREE.PointsMaterial({
            color: 0xdce7ff,
            size: 0.55,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
          }),
        ),
      );
    }

    const contentGroup = new THREE.Group();
    globeGroup.add(contentGroup);

    const starTexture = createStarTexture();
    type StarVisual = {
      core: THREE.Mesh;
      glow: THREE.Sprite;
    };
    const starVisuals = new Map<string, StarVisual>();
    const starPositions = new Map<string, THREE.Vector3>();
    const labelObjects = new Map<string, CSS2DObject>();
    const pickables: THREE.Object3D[] = [];
    const hotRef = {
      start: undefined as string | undefined,
      end: undefined as string | undefined,
      pathNames: new Set<string>(),
    };

    let connectionLines: THREE.Object3D[] = [];
    let pathMeshes: THREE.Object3D[] = [];
    let hitMeshes: THREE.Mesh[] = [];

    const disposeObject = (obj: THREE.Object3D) => {
      contentGroup.remove(obj);
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const material of materials) material.dispose();
        }
      });
    };

    const clearContent = () => {
      for (const line of connectionLines) disposeObject(line);
      connectionLines = [];
      for (const mesh of pathMeshes) disposeObject(mesh);
      pathMeshes = [];
      for (const mesh of hitMeshes) disposeObject(mesh);
      hitMeshes = [];
      for (const [, visual] of starVisuals) {
        contentGroup.remove(visual.core);
        visual.core.geometry.dispose();
        (visual.core.material as THREE.Material).dispose();
        contentGroup.remove(visual.glow);
        visual.glow.material.dispose();
      }
      starVisuals.clear();
      for (const [, label] of labelObjects) {
        contentGroup.remove(label);
      }
      labelObjects.clear();
      starPositions.clear();
      pickables.length = 0;
    };

    const setData = (input: {
      stars: CanvasStar[];
      connections: CanvasConnection[];
      path?: CanvasPathNode[];
      start?: string;
      end?: string;
    }) => {
      clearContent();
      const pathNames = new Set(input.path?.map((n) => n.name) ?? []);
      hotRef.start = input.start;
      hotRef.end = input.end;
      hotRef.pathNames = pathNames;

      for (const star of input.stars) {
        const position = projectToSphere(star.x, star.y).setLength(
          GLOBE_RADIUS * 1.025,
        );
        starPositions.set(star.name, position);

        const color = starColor(star.name, input.start, input.end, pathNames);
        const isEndpoint = star.name === input.start || star.name === input.end;
        const onPath = pathNames.has(star.name);
        const coreRadius = isEndpoint ? 1.55 : onPath ? 1.35 : 1.05;

        const core = new THREE.Mesh(
          new THREE.SphereGeometry(coreRadius, 20, 20),
          new THREE.MeshBasicMaterial({ color }),
        );
        core.position.copy(position);
        core.userData.starName = star.name;
        contentGroup.add(core);
        pickables.push(core);

        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: starTexture,
            color,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: isEndpoint || onPath ? 1 : 0.85,
          }),
        );
        glow.position.copy(position);
        glow.scale.setScalar(isEndpoint ? 14 : onPath ? 11 : 8);
        glow.userData.starName = star.name;
        contentGroup.add(glow);
        starVisuals.set(star.name, { core, glow });

        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(3.4, 10, 10),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        hit.position.copy(position);
        hit.userData.starName = star.name;
        contentGroup.add(hit);
        hitMeshes.push(hit);
        pickables.push(hit);

        const labelEl = document.createElement('div');
        labelEl.className = `cv-star-label${isEndpoint || onPath ? ' is-hot' : ''}`;
        labelEl.textContent = star.name;
        labelEl.style.pointerEvents = 'auto';
        labelEl.style.cursor = 'pointer';
        labelEl.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
        });
        labelEl.addEventListener('click', (event) => {
          event.stopPropagation();
          onStarActivateRef.current?.(star.name);
          focusStar(star.name, { force: true });
        });
        const label = new CSS2DObject(labelEl);
        label.position.copy(position).setLength(GLOBE_RADIUS * 1.12);
        label.userData.starName = star.name;
        contentGroup.add(label);
        labelObjects.set(star.name, label);
      }

      for (const conn of input.connections) {
        const from = starPositions.get(conn.from.name);
        const to = starPositions.get(conn.to.name);
        if (!from || !to) continue;
        const points = greatCirclePoints(from, to, 40, GLOBE_RADIUS * 1.035);
        const tube = makeTube(points, 0.08, 0x6b7c94, 0.35);
        contentGroup.add(tube);
        connectionLines.push(tube);
      }

      if (input.path && input.path.length > 1) {
        for (let i = 0; i < input.path.length - 1; i++) {
          const from = starPositions.get(input.path[i].name);
          const to = starPositions.get(input.path[i + 1].name);
          if (!from || !to) continue;
          const points = greatCirclePoints(from, to, 64, GLOBE_RADIUS * 1.055);
          const glowTube = makeTube(points, 0.55, 0x5eead4, 0.35);
          const coreTube = makeTube(points, 0.22, 0xb8fff4, 1);
          contentGroup.add(glowTube);
          contentGroup.add(coreTube);
          pathMeshes.push(glowTube, coreTube);
        }
      }
    };

    const raycaster = new THREE.Raycaster();
    // Sprites need a larger threshold for picking in some cases
    raycaster.params.Points = { threshold: 1.5 };
    const pointer = new THREE.Vector2();
    let pointerDown = { x: 0, y: 0, t: 0 };

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = { x: event.clientX, y: event.clientY, t: performance.now() };
    };

    const onPointerUp = (event: PointerEvent) => {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      if (Math.hypot(dx, dy) > 5) return;
      if (performance.now() - pointerDown.t > 500) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickables, false);
      const hit = hits.find((h) => h.object.userData.starName);
      if (hit?.object.userData.starName) {
        const name = String(hit.object.userData.starName);
        onStarActivateRef.current?.(name);
        focusStar(name);
      }
    };

    labelRenderer.domElement.addEventListener('pointerdown', onPointerDown);
    labelRenderer.domElement.addEventListener('pointerup', onPointerUp);

    const reset = () => {
      cameraFlight = null;
      controls.reset();
      camera.position.set(0, 18, 118);
      controls.target.set(0, 0, 0);
      controls.autoRotate = true;
      controls.update();
    };

    sceneApiRef.current = { setData, focusStar, reset };

    // Initial data
    setData({ stars, connections, path, start, end });

    let raf = 0;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) controls.autoRotate = false;

    const easeInOutCubic = (x: number) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

    let lastTs = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (cameraFlight) {
        cameraFlight.t = Math.min(1, cameraFlight.t + dt / cameraFlight.duration);
        const e = easeInOutCubic(cameraFlight.t);
        camera.position.lerpVectors(cameraFlight.fromPos, cameraFlight.toPos, e);
        controls.target.lerpVectors(
          cameraFlight.fromTarget,
          cameraFlight.toTarget,
          e,
        );
        if (cameraFlight.t >= 1) {
          cameraFlight = null;
        }
      }

      const t = now * 0.002;
      for (const [name, visual] of starVisuals) {
        const hot = name === hotRef.start || name === hotRef.end;
        const onPath = hotRef.pathNames.has(name);
        const base = hot ? 14 : onPath ? 11 : 8;
        const pulse = hot ? 1 + Math.sin(t * 2.4) * 0.12 : 1;
        visual.glow.scale.setScalar(base * pulse);

        const position = starPositions.get(name);
        const label = labelObjects.get(name);
        if (position && label) {
          const visible = isStarFacingCamera(position);
          const el = label.element as HTMLElement;
          el.style.opacity = visible ? '1' : '0';
          el.style.pointerEvents = visible ? 'auto' : 'none';
        }
      }
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || 900;
      const h = Math.max(420, Math.round(w * 0.62));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', stopAutoRotate);
      labelRenderer.domElement.removeEventListener('pointerdown', onPointerDown);
      labelRenderer.domElement.removeEventListener('pointerup', onPointerUp);
      clearContent();
      starTexture.dispose();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      mount.removeChild(labelRenderer.domElement);
      sceneApiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene bootstraps once; data synced below
  }, []);

  useEffect(() => {
    sceneApiRef.current?.setData({ stars, connections, path, start, end });
  }, [stars, connections, path, start, end]);

  useEffect(() => {
    const prev = prevSelectionRef.current;
    const changed =
      (start && start !== prev.start ? start : null) ||
      (end && end !== prev.end ? end : null);
    prevSelectionRef.current = { start, end };
    if (changed) {
      // Dropdown / selection changes should bring the star into view.
      sceneApiRef.current?.focusStar(changed, { force: true });
    }
  }, [start, end]);

  return (
    <div className="cv-canvas-shell">
      <div className="cv-canvas-toolbar">
        <span className="cv-canvas-hint">
          Drag to orbit · Scroll to zoom · Click a star or name to select
        </span>
        <button
          type="button"
          className="cv-canvas-reset"
          onClick={() => sceneApiRef.current?.reset()}
        >
          Reset view
        </button>
      </div>
      <div ref={mountRef} className="cv-canvas-viewport cv-canvas-viewport-3d" />
    </div>
  );
}
