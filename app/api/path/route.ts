import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!start || !end) {
    return NextResponse.json(
      { error: 'Missing start or end star name' },
      { status: 400 }
    );
  }
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH path = shortestPath(
        (a:Star {name: $start})-[:CONNECTED_TO*]-(b:Star {name: $end})
      )
      RETURN [node IN nodes(path) | 
        { name: node.name, x: node.x, y: node.y }
      ] AS path,
      length(path) AS hops
      `,
      { start, end }
    );
    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'No path found between the two stars' },
        { status: 404 }
      );
    }
    const record = result.records[0];
    return NextResponse.json({
      path: record.get('path'),
      hops: record.get('hops').toNumber(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to query database' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
