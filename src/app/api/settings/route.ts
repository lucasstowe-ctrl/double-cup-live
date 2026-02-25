import { NextResponse } from 'next/server';
import { patchSettings } from '@/lib/service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await patchSettings({
      scenario: body.scenario,
      includeOwnerSalary: body.includeOwnerSalary,
    });
    return NextResponse.json({ status: 'ok', settings: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings', detail: (error as Error).message }, { status: 500 });
  }
}
