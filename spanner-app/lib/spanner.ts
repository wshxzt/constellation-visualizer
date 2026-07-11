import { Spanner, Database } from '@google-cloud/spanner';

let database: Database | null = null;

export function getDatabase(): Database {
  if (!database) {
    const projectId = process.env.SPANNER_PROJECT_ID;
    const instanceId = process.env.SPANNER_INSTANCE;
    const databaseId = process.env.SPANNER_DATABASE;

    if (!projectId || !instanceId || !databaseId) {
      throw new Error(
        'Missing Spanner configuration. Set SPANNER_PROJECT_ID, SPANNER_INSTANCE, and SPANNER_DATABASE.',
      );
    }

    const spanner = new Spanner({ projectId });
    database = spanner.instance(instanceId).database(databaseId);
  }

  return database;
}

export interface StarRecord {
  id: number;
  name: string;
  x: number;
  y: number;
}

export interface PathNode {
  name: string;
  x: number;
  y: number;
}

interface GraphNodeJson {
  properties?: {
    StarId?: string | number;
    Name?: string;
    X?: number;
    Y?: number;
  };
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (value && typeof value === 'object' && 'value' in value) {
    return Number((value as { value: string | number }).value);
  }
  return Number(value);
}

export async function getStars(): Promise<StarRecord[]> {
  const [rows] = await getDatabase().run({
    sql: `
      GRAPH ConstellationGraph
      MATCH (s:Star)
      RETURN s.StarId AS StarId, s.Name AS Name, s.X AS X, s.Y AS Y
      ORDER BY StarId
    `,
  });

  return rows.map((row) => {
    const json = row.toJSON() as {
      StarId: string | number;
      Name: string;
      X: number;
      Y: number;
    };

    return {
      id: toNumber(json.StarId),
      name: json.Name,
      x: json.X,
      y: json.Y,
    };
  });
}

export async function getConnections(): Promise<
  {
    from: { name: string; x: number; y: number };
    to: { name: string; x: number; y: number };
  }[]
> {
  const [rows] = await getDatabase().run({
    sql: `
      GRAPH ConstellationGraph
      MATCH (a:Star)-[:ConnectedTo]->(b:Star)
      RETURN
        a.Name AS FromName,
        a.X AS FromX,
        a.Y AS FromY,
        b.Name AS ToName,
        b.X AS ToX,
        b.Y AS ToY
    `,
  });

  return rows.map((row) => {
    const json = row.toJSON() as {
      FromName: string;
      FromX: number;
      FromY: number;
      ToName: string;
      ToX: number;
      ToY: number;
    };

    return {
      from: { name: json.FromName, x: json.FromX, y: json.FromY },
      to: { name: json.ToName, x: json.ToX, y: json.ToY },
    };
  });
}

export async function findShortestPath(
  startName: string,
  endName: string,
): Promise<{ path: PathNode[]; hops: number } | null> {
  if (startName === endName) {
    const stars = await getStars();
    const star = stars.find((s) => s.name === startName);
    if (!star) return null;
    return {
      path: [{ name: star.name, x: star.x, y: star.y }],
      hops: 0,
    };
  }

  // Undirected ANY SHORTEST over ConnectedTo edges (matches Neo4j shortestPath semantics).
  // Quantifier upper bound covers the full 20-star constellation diameter.
  const [rows] = await getDatabase().run({
    sql: `
      GRAPH ConstellationGraph
      MATCH p = ANY SHORTEST
        (a:Star {Name: @start})-[:ConnectedTo]-{1,80}(b:Star {Name: @end})
      RETURN TO_JSON(NODES(p)) AS path_nodes, PATH_LENGTH(p) AS hops
    `,
    params: { start: startName, end: endName },
    types: { start: 'string', end: 'string' },
  });

  if (rows.length === 0) {
    return null;
  }

  const json = rows[0].toJSON() as {
    path_nodes: GraphNodeJson[] | string;
    hops: string | number;
  };

  const nodes: GraphNodeJson[] =
    typeof json.path_nodes === 'string'
      ? (JSON.parse(json.path_nodes) as GraphNodeJson[])
      : json.path_nodes;

  const path = nodes.map((node) => ({
    name: String(node.properties?.Name ?? ''),
    x: toNumber(node.properties?.X),
    y: toNumber(node.properties?.Y),
  }));

  return {
    path,
    hops: toNumber(json.hops),
  };
}
