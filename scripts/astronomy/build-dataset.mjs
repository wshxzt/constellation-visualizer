import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_W = 900;
const SOURCE_H = 650;
const MAX_LAT = (Math.PI / 2) * 0.92;
const KNN_K = 2;
const MIN_DEGREE = 2;

const brightStars = JSON.parse(
  readFileSync(join(__dirname, 'data/bright_stars.json'), 'utf8'),
);
const constellationLines = JSON.parse(
  readFileSync(join(__dirname, 'data/constellation_lines.json'), 'utf8'),
);

function raDecToXY(raHours, decDeg) {
  // Match ConstellationCanvas.projectToSphere inverse mapping.
  const lon = (raHours / 12 - 1) * Math.PI;
  const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, (decDeg * Math.PI) / 180));
  const x = ((lon / Math.PI + 1) / 2) * SOURCE_W;
  const y = ((-lat / MAX_LAT + 1) / 2) * SOURCE_H;
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

function angularDistanceRad(a, b) {
  const ra1 = (a.raHours / 12) * Math.PI;
  const ra2 = (b.raHours / 12) * Math.PI;
  const d1 = (a.decDeg * Math.PI) / 180;
  const d2 = (b.decDeg * Math.PI) / 180;
  const cosAngle =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(ra1 - ra2);
  return Math.acos(Math.min(1, Math.max(-1, cosAngle)));
}

function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const stars = brightStars.map((star, index) => {
  const { x, y } = raDecToXY(star.raHours, star.decDeg);
  return {
    id: index + 1,
    name: star.name,
    x,
    y,
    raHours: star.raHours,
    decDeg: star.decDeg,
  };
});

const byName = new Map(stars.map((s) => [s.name, s]));
const missingLineStars = new Set();
const edgeSet = new Set();

for (const [fromName, toName] of constellationLines) {
  if (!byName.has(fromName) || !byName.has(toName)) {
    if (!byName.has(fromName)) missingLineStars.add(fromName);
    if (!byName.has(toName)) missingLineStars.add(toName);
    continue;
  }
  edgeSet.add(edgeKey(fromName, toName));
}

if (missingLineStars.size > 0) {
  console.warn(
    'Skipping constellation lines with unknown stars:',
    [...missingLineStars].join(', '),
  );
}

const degree = new Map(stars.map((s) => [s.name, 0]));
for (const key of edgeSet) {
  const [a, b] = key.split('|');
  degree.set(a, (degree.get(a) ?? 0) + 1);
  degree.set(b, (degree.get(b) ?? 0) + 1);
}

let knnAdded = 0;
for (const star of stars) {
  const currentDegree = degree.get(star.name) ?? 0;
  if (currentDegree >= MIN_DEGREE) continue;

  const neighbors = stars
    .filter((other) => other.name !== star.name)
    .map((other) => ({
      other,
      dist: angularDistanceRad(star, other),
    }))
    .sort((a, b) => a.dist - b.dist);

  let added = 0;
  for (const { other } of neighbors) {
    if ((degree.get(star.name) ?? 0) >= MIN_DEGREE) break;
    if (added >= KNN_K) break;
    const key = edgeKey(star.name, other.name);
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    degree.set(star.name, (degree.get(star.name) ?? 0) + 1);
    degree.set(other.name, (degree.get(other.name) ?? 0) + 1);
    added += 1;
    knnAdded += 1;
  }
}

function connectedComponents() {
  const adj = new Map(stars.map((s) => [s.name, []]));
  for (const key of edgeSet) {
    const [a, b] = key.split('|');
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  const seen = new Set();
  const comps = [];
  for (const star of stars) {
    if (seen.has(star.name)) continue;
    const queue = [star.name];
    seen.add(star.name);
    const comp = [];
    while (queue.length > 0) {
      const name = queue.pop();
      comp.push(name);
      for (const next of adj.get(name) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    comps.push(comp);
  }
  return comps;
}

let bridgeAdded = 0;
let comps = connectedComponents();
while (comps.length > 1) {
  let best = null;
  for (let i = 0; i < comps.length; i++) {
    for (let j = i + 1; j < comps.length; j++) {
      for (const aName of comps[i]) {
        for (const bName of comps[j]) {
          const a = byName.get(aName);
          const b = byName.get(bName);
          const dist = angularDistanceRad(a, b);
          if (!best || dist < best.dist) {
            best = { a, b, dist };
          }
        }
      }
    }
  }
  if (!best) break;
  const key = edgeKey(best.a.name, best.b.name);
  edgeSet.add(key);
  degree.set(best.a.name, (degree.get(best.a.name) ?? 0) + 1);
  degree.set(best.b.name, (degree.get(best.b.name) ?? 0) + 1);
  bridgeAdded += 1;
  comps = connectedComponents();
}

const connections = [...edgeSet]
  .map((key) => {
    const [a, b] = key.split('|');
    const from = byName.get(a);
    const to = byName.get(b);
    const [left, right] =
      from.id < to.id ? [from, to] : [to, from];
    return { fromStarId: left.id, toStarId: right.id };
  })
  .sort((a, b) => a.fromStarId - b.fromStarId || a.toStarId - b.toStarId);

const outStars = stars.map(({ id, name, x, y }) => ({ id, name, x, y }));

const outDir = join(__dirname, '../data');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'stars.json'), `${JSON.stringify(outStars, null, 2)}\n`);
writeFileSync(
  join(outDir, 'connections.json'),
  `${JSON.stringify(connections, null, 2)}\n`,
);

console.log(
  `Built ${outStars.length} stars, ${connections.length} connections (${knnAdded} kNN bridges, ${bridgeAdded} component bridges)`,
);
console.log(`Wrote ${join(outDir, 'stars.json')}`);
console.log(`Wrote ${join(outDir, 'connections.json')}`);
