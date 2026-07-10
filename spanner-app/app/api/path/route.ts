import { NextRequest, NextResponse } from 'next/server';
import { getAdjacencyList, getStars } from '@/lib/spanner';
import { findShortestPath } from '@/lib/pathfinding';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Missing start or end star name' },
      { status: 400 },
    );
  }

  try {
    const [stars, adjacency] = await Promise.all([getStars(), getAdjacencyList()]);
    const result = findShortestPath(stars, adjacency, start, end);

    if (!result) {
      return NextResponse.json(
        { error: 'No path found between the two stars' },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to query database' },
      { status: 500 },
    );
  }
}
