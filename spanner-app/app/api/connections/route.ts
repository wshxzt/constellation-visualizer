import { NextResponse } from 'next/server';
import { getConnections } from '@/lib/spanner';

export async function GET() {
  try {
    const connections = await getConnections();
    return NextResponse.json(connections);
  } catch (error) {
    console.error('Connections API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections', details: String(error) },
      { status: 500 },
    );
  }
}
