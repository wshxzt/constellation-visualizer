'use client';

import { useState, useEffect } from 'react';
import { Starfield } from './Starfield';
import { ConstellationCanvas } from './ConstellationCanvas';

export interface Star {
  id: number;
  name: string;
  x: number;
  y: number;
}

export interface Connection {
  from: { name: string; x: number; y: number };
  to: { name: string; x: number; y: number };
}

export interface PathResult {
  path?: { name: string; x: number; y: number }[];
  hops?: number;
  error?: string;
}

export interface ConstellationVisualizerProps {
  /** Optional subtitle shown under the title (e.g. backend name). */
  backendLabel?: string;
}

export function ConstellationVisualizer({
  backendLabel,
}: ConstellationVisualizerProps) {
  const [stars, setStars] = useState<Star[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<PathResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/stars')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch stars');
        return res.json();
      })
      .then((data) => setStars(data))
      .catch((err) => console.error(err));

    fetch('/api/connections')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch connections');
        return res.json();
      })
      .then((data) => setConnections(data))
      .catch((err) => console.error(err));
  }, []);

  const findPathBetween = async (startName: string, endName: string) => {
    if (!startName || !endName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/path?start=${startName}&end=${endName}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Failed to fetch path' });
    }
    setLoading(false);
  };

  const findPath = () => findPathBetween(start, end);

  const handleStarClick = (starName: string) => {
    if (!start) {
      setStart(starName);
      setEnd('');
      setResult(null);
      return;
    }

    if (!end) {
      if (starName === start) {
        setStart('');
        setResult(null);
        return;
      }
      setEnd(starName);
      findPathBetween(start, starName);
      return;
    }

    setStart(starName);
    setEnd('');
    setResult(null);
  };

  return (
    <div className="cv-shell relative min-h-screen overflow-hidden">
      <Starfield />

      <div className="cv-atmosphere pointer-events-none absolute inset-0 -z-[5]" />

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6 py-10 md:px-10 md:py-14">
        <header className="cv-fade-in mb-10">
          <p className="cv-kicker mb-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.35em] text-[color:var(--cv-muted)]">
            Mission Control
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-[-0.03em] text-[color:var(--cv-text)] md:text-6xl">
            Constellation
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[color:var(--cv-muted)] md:text-lg">
            Trace the shortest route between stars across a living 3D globe.
          </p>
          {backendLabel ? (
            <p className="mt-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.22em] text-[color:var(--cv-accent)]">
              {backendLabel}
            </p>
          ) : null}
        </header>

        <section className="cv-fade-in-delay mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-2">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-[color:var(--cv-muted)]">
              Origin
            </span>
            <select
              className="cv-select"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            >
              <option value="">Select start star</option>
              {stars.map((star) => (
                <option key={star.id} value={star.name}>
                  {star.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[12rem] flex-1 flex-col gap-2">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-[color:var(--cv-muted)]">
              Destination
            </span>
            <select
              className="cv-select"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            >
              <option value="">Select end star</option>
              {stars.map((star) => (
                <option key={star.id} value={star.name}>
                  {star.name}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={findPath}
            disabled={loading || !start || !end}
            className="cv-button"
          >
            {loading ? 'Plotting…' : 'Find Path'}
          </button>
        </section>

        <div className="cv-panel cv-fade-in-late overflow-hidden">
          <ConstellationCanvas
            stars={stars}
            connections={connections}
            path={result?.path}
            start={start || undefined}
            end={end || undefined}
            onStarActivate={handleStarClick}
          />
        </div>

        {result && !result.error && result.path && (
          <div className="cv-result mt-6">
            <p className="mb-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.28em] text-[color:var(--cv-muted)]">
              Shortest path · {result.hops} hops
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {result.path.map((node, index) => (
                <span key={index} className="contents">
                  <span className="cv-chip">{node.name}</span>
                  {index < result.path!.length - 1 ? (
                    <span className="text-[color:var(--cv-accent)]" aria-hidden>
                      →
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        )}

        {result?.error && (
          <div className="cv-error mt-6">{result.error}</div>
        )}
      </main>
    </div>
  );
}
