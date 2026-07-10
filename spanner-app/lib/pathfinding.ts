export interface PathNode {
  name: string;
  x: number;
  y: number;
}

export interface StarWithId extends PathNode {
  id: number;
}

export function findShortestPath(
  stars: StarWithId[],
  adjacency: Map<number, number[]>,
  startName: string,
  endName: string,
): { path: PathNode[]; hops: number } | null {
  const starsByName = new Map(stars.map((star) => [star.name, star]));
  const start = starsByName.get(startName);
  const end = starsByName.get(endName);

  if (!start || !end) {
    return null;
  }

  if (start.id === end.id) {
    return {
      path: [{ name: start.name, x: start.x, y: start.y }],
      hops: 0,
    };
  }

  const queue = [start.id];
  const visited = new Set<number>([start.id]);
  const parent = new Map<number, number>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === end.id) {
      break;
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) {
        continue;
      }

      visited.add(neighbor);
      parent.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  if (!visited.has(end.id)) {
    return null;
  }

  const pathIds: number[] = [];
  let cursor: number | undefined = end.id;

  while (cursor !== undefined) {
    pathIds.unshift(cursor);
    cursor = parent.get(cursor);
  }

  const starsById = new Map(stars.map((star) => [star.id, star]));

  return {
    path: pathIds.map((id) => {
      const star = starsById.get(id)!;
      return { name: star.name, x: star.x, y: star.y };
    }),
    hops: pathIds.length - 1,
  };
}
