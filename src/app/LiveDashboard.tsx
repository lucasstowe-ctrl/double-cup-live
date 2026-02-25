'use client';

import { useEffect, useMemo, useState } from 'react';

type Metrics = {
  now: string;
  today?: {
    drinks: number;
    revenue: number;
    profit: number;
    labor: number;
    fees: number;
    cogs: number;
  };
  allTime?: {
    cumulative_profit: number;
  };
  breakeven?: {
    remainingCapital: number;
    etaDays: number | null;
  };
  // allow extra fields without breaking
  [key: string]: any;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
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
      const json = (await res.json()) as Metrics;
      setData(json);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.message ?? 'unknown error');
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // refresh UI every 60s
    return () => clearInterval(id);
  }, []);

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdated) return '—';
    return lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, [lastUpdated]);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <p><strong>Dashboard error:</strong> {error}</p>
        <button onClick={load}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: 16 }}>Loading live metrics…</div>;
  }

  // If your API uses different keys, we can map them once you show me the JSON.
  const drinks = data?.today?.drinks ?? data?.today?.drinksSold ?? 0;
  const revenue = data?.today?.revenue ?? 0;
  const profit = data?.today?.profit ?? 0;

  const remainingCapital =
    data?.breakeven?.remainingCapital ??
    data?.breakEven?.remainingCapital ??
    null;

  const etaDays =
    data?.breakeven?.etaDays ??
    data?.breakEven?.etaDays ??
    null;

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
          <div style={{ opacity: 0.8 }}>
            ETA: {etaDays == null ? '—' : `${etaDays} days`}
          </div>
        </div>
      </div>
    </div>
  );
}
