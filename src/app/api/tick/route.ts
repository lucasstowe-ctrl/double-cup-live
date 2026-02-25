import { NextResponse } from 'next/server';
import { processTick } from '@/lib/service';

export async function POST() {
  try {
    const result = await processTick();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Tick failed', detail: (error as Error).message }, { status: 500 });
  }
}
