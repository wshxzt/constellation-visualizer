import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';
export async function GET() {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (s:Star)
      RETURN s.id AS id, s.name AS name, s.x AS x, s.y AS y
      ORDER BY s.id
    `);
    const stars = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      x: record.get('x'),
      y: record.get('y'),
    }));
    return NextResponse.json(stars);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stars' }, { status: 500 });
  } finally {
    await session.close();
  }
}
