import { NextResponse } from 'next/server';
import { getStars } from '@/lib/spanner';

export async function GET() {
  try {
    const stars = await getStars();
    return NextResponse.json(stars);
  } catch (error) {
    console.error('Stars API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stars', details: String(error) },
      { status: 500 },
    );
  }
}
