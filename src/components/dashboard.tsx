'use client';

import { useEffect, useState } from 'react';

type Metrics = {
  today: {
    drinks: number;
    revenue: number;
    profit: number;
  };
  breakeven: {
    remainingCapital: number;
    etaDays: number | null;
  };
};

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export default function Dashboard() {
  const [data, setData] = useState<Metrics | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchMetrics() {
    const res = await fetch('/api/metrics', { cache: 'no-store' });
    const json = await res.json();
    setData(json);
    setLastUpdated(new Date());
  }

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div style={{ padding: 20 }}>Loading live metrics...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16, opacity: 0.7 }}>
        Last updated: {lastUpdated?.toLocaleTimeString()}
      </div>

      <div>
        <h2>Drinks Sold Today</h2>
        <p>{data.today?.drinks ?? 0}</p>
      </div>

      <div>
        <h2>Revenue Today</h2>
        <p>{formatMoney(data.today?.revenue ?? 0)}</p>
      </div>

      <div>
        <h2>Profit Today (Net)</h2>
        <p>{formatMoney(data.today?.profit ?? 0)}</p>
      </div>

      <div>
        <h2>Break-even</h2>
        <p>
          Remaining: {formatMoney(data.breakeven?.remainingCapital ?? 0)}
        </p>
        <p>
          ETA: {data.breakeven?.etaDays ?? '—'} days
        </p>
      </div>
    </div>
  );
}
