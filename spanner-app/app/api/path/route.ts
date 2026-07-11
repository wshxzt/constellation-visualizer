import { NextRequest, NextResponse } from 'next/server';
import { findShortestPath } from '@/lib/spanner';

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
    const result = await findShortestPath(start, end);

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
