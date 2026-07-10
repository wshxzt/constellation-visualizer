'use client';
import { useState, useEffect } from 'react';
interface Star {
  id: number;
  name: string;
  x: number;
  y: number;
}
interface PathResult {
  path?: { name: string; x: number; y: number }[];
  hops?: number;
  error?: string;
}
export default function ConstellationVisualizer() {
  const [stars, setStars] = useState<Star[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<PathResult | null>(null);
  const [loading, setLoading] = useState(false);
  // Fetch all stars on load
  useEffect(() => {
    fetch('/api/stars')
      .then(res => res.json())
      .then(setStars);
  }, []);
  const findPath = async () => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/path?start=${start}&end=${end}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: 'Failed to fetch path' });
    }
    setLoading(false);
  };
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Constellation Visualizer</h1>
      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <select 
          className="border p-2 rounded w-64" 
          value={start} 
          onChange={(e) => setStart(e.target.value)}
        >
          <option value="">Select Start Star</option>
          {stars.map(star => (
            <option key={star.id} value={star.name}>{star.name}</option>
          ))}
        </select>
        <select 
          className="border p-2 rounded w-64" 
          value={end} 
          onChange={(e) => setEnd(e.target.value)}
        >
          <option value="">Select End Star</option>
          {stars.map(star => (
            <option key={star.id} value={star.name}>{star.name}</option>
          ))}
        </select>
        <button 
          onClick={findPath} 
          disabled={loading || !start || !end}
          className="bg-black text-white px-8 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Searching...' : 'Find Path'}
        </button>
      </div>
      {/* SVG Visualization */}
      <div className="border rounded-lg bg-black p-4">
        <svg width="900" height="650" className="bg-[#0a0a0a]">
          {/* Draw all connections (light gray) */}
          {stars.map((starA, i) =>
            stars.slice(i + 1).map((starB, j) => (
              <line
                key={`${i}-${j}`}
                x1={starA.x}
                y1={starA.y}
                x2={starB.x}
                y2={starB.y}
                stroke="#333"
                strokeWidth="1"
              />
            ))
          )}
          {/* Draw the shortest path (bright line) */}
          {result?.path && result.path.length > 1 && (
            result.path.slice(0, -1).map((node, index) => {
              const next = result.path![index + 1];
              return (
                <line
                  key={index}
                  x1={node.x}
                  y1={node.y}
                  x2={next.x}
                  y2={next.y}
                  stroke="#00ff88"
                  strokeWidth="3"
                />
              );
            })
          )}
          {/* Draw all stars */}
          {stars.map((star) => (
            <g key={star.id}>
              <circle
                cx={star.x}
                cy={star.y}
                r="6"
                fill={start === star.name ? "#ffcc00" : end === star.name ? "#ff6666" : "#aaa"}
                stroke="#fff"
                strokeWidth="1"
              />
              <text
                x={star.x}
                y={star.y - 12}
                fill="#ccc"
                fontSize="11"
                textAnchor="middle"
              >
                {star.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {/* Result */}
      {result && !result.error && result.path && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <p className="font-semibold mb-2">
            Shortest path found ({result.hops} hops):
          </p>
          <div className="flex flex-wrap gap-2">
            {result.path.map((node, index) => (
              <span key={index} className="bg-black text-white px-3 py-1 rounded text-sm">
                {node.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Error message */}
      {result?.error && (
        <div className="mt-6 p-4 border rounded bg-red-50 text-red-600">
          {result.error}
        </div>
      )}
    </div>
  );
}
