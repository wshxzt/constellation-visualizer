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

export async function getStars(): Promise<StarRecord[]> {
  const [rows] = await getDatabase().run({
    sql: `
      SELECT StarId, Name, X, Y
      FROM Stars
      ORDER BY StarId
    `,
  });

  return rows.map((row) => {
    const json = row.toJSON() as {
      StarId: string;
      Name: string;
      X: number;
      Y: number;
    };

    return {
      id: Number(json.StarId),
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
      SELECT
        s1.Name AS FromName,
        s1.X AS FromX,
        s1.Y AS FromY,
        s2.Name AS ToName,
        s2.X AS ToX,
        s2.Y AS ToY
      FROM Connections c
      JOIN Stars s1 ON c.FromStarId = s1.StarId
      JOIN Stars s2 ON c.ToStarId = s2.StarId
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

export async function getAdjacencyList(): Promise<Map<number, number[]>> {
  const [rows] = await getDatabase().run({
    sql: `
      SELECT FromStarId, ToStarId
      FROM Connections
    `,
  });

  const adjacency = new Map<number, number[]>();

  const addEdge = (from: number, to: number) => {
    const neighbors = adjacency.get(from) ?? [];
    neighbors.push(to);
    adjacency.set(from, neighbors);
  };

  for (const row of rows) {
    const json = row.toJSON() as { FromStarId: string; ToStarId: string };
    const from = Number(json.FromStarId);
    const to = Number(json.ToStarId);
    addEdge(from, to);
    addEdge(to, from);
  }

  return adjacency;
}
