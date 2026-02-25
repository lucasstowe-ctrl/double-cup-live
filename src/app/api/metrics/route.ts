import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/service';

export async function GET() {
  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metrics', detail: (error as Error).message }, { status: 500 });
  }
}
