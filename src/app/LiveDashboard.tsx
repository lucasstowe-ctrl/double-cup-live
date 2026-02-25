'use client';

import { useEffect, useMemo, useState } from 'react';

type Metrics = {
  now?: string;
  today?: {
    drinks: number;
    revenue: number;
    profit: number;
    labor: number;
    fees: number;
    cogs: number;
  };
  breakeven?: {
    remainingCapital: number;
    etaDays: number | null;
  };
};

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseMetrics(value: unknown): Metrics | null {
  if (!isRecord(value)) return null;

  // We only need a couple fields; keep parsing tolerant.
  const todayRaw = value['today'];
  const breakevenRaw = value['breakeven'];

  const today =
    isRecord(todayRaw) &&
    typeof todayRaw['drinks'] === 'number' &&
    typeof todayRaw['revenue'] === 'number' &&
    typeof todayRaw['profit'] === 'number' &&
    typeof todayRaw['labor'] === 'number' &&
    typeof todayRaw['fees'] === 'number' &&
    typeof todayRaw['cogs'] === 'number'
      ? {
          drinks: todayRaw['drinks'],
          revenue: todayRaw['revenue'],
          profit: todayRaw['profit'],
          labor: todayRaw['labor'],
          fees: todayRaw['fees'],
          cogs: todayRaw['cogs'],
        }
      : undefined;

  const breakeven =
    isRecord(breakevenRaw) &&
    typeof breakevenRaw['remainingCapital'] === 'number' &&
    (typeof breakevenRaw['etaDays'] === 'number' || breakevenRaw['etaDays'] === null)
      ? {
          remainingCapital: breakevenRaw['remainingCapital'],
          etaDays: breakevenRaw['etaDays'] as number | null,
        }
      : undefined;

  const now = typeof value['now'] === 'string' ? value['now'] : undefined;

  return { now, today, breakeven };
}

export default function LiveDashboard() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    try {
      setError(null);
      const res = await fetch('/api/metrics', { cache: 'no-store' });
      if (!res.ok) throw new Error(`metrics fetch failed: ${res.status}`);
      const raw: unknown = await res.json();
      const parsed = parseMetrics(raw);
      if (!parsed) throw new Error('metrics response was not valid JSON object');
      setData(parsed);
      setLastUpdated(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      setError(msg);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return '—';
    return lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, [lastUpdated]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <p>
          <strong>Dashboard error:</strong> {error}
        </p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  if (!data || !data.today) {
    return <div style={{ padding: 16 }}>Loading live metrics…</div>;
  }

  const drinks = data.today.drinks;
  const revenue = data.today.revenue;
  const profit = data.today.profit;

  const remainingCapital = data.breakeven?.remainingCapital;
  const etaDays = data.breakeven?.etaDays;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>
        Last updated: <strong>{lastUpdatedText}</strong> (auto refreshes every 60s)
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.75 }}>Drinks sold today</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{drinks}</div>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.75 }}>Revenue today</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{formatMoney(revenue)}</div>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.75 }}>Profit today (net)</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{formatMoney(profit)}</div>
        </div>

        <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14 }}>
          <div style={{ opacity: 0.75 }}>Break-even</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            Remaining: {remainingCapital == null ? '—' : formatMoney(remainingCapital)}
          </div>
          <div style={{ opacity: 0.8 }}>ETA: {etaDays == null ? '—' : `${etaDays} days`}</div>
        </div>
      </div>
    </div>
  );
}
