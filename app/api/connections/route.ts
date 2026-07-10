import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';
export async function GET() {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (a:Star)-[:CONNECTED_TO]->(b:Star)
      RETURN 
        a.name AS fromName, a.x AS fromX, a.y AS fromY,
        b.name AS toName, b.x AS toX, b.y AS toY
    `);
    const connections = result.records.map(record => ({
      from: {
        name: record.get('fromName'),
        x: record.get('fromX'),
        y: record.get('fromY'),
      },
      to: {
        name: record.get('toName'),
        x: record.get('toX'),
        y: record.get('toY'),
      },
    }));
    return NextResponse.json(connections);
  } catch (error) {
    console.error('Connections API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections', details: String(error) },
      { status: 500 }
    );
  } finally {
    await session.close();
    await driver.close();
  }
}
