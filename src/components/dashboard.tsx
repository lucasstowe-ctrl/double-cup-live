'use client';

import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type Metrics = {
  businessDate: string;
  lastUpdated: string;
  settings: { scenario: string; include_owner_salary: number };
  today: {
    transactions: number;
    revenue: number;
    cogs: number;
    fees: number;
    wages: number;
    tips: number;
    fixed: number;
    profit: number;
    drinkMix: { coffee: number; tea: number; other: number };
  };
  allTime: { remainingCapital: number; recoveredCapital: number; recoveryPercent: number };
  breakEven: {
    etaDays: number | null;
    etaDate: string | null;
    onTrack: boolean;
    neededDailyFor12Months: number;
  };
  series: Array<{ ts: string; revenue: number; profit: number; transactions: number }>;
};

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white/90 p-4 shadow-card border border-cafe-latte">
      <p className="text-xs uppercase tracking-wide text-cafe-mocha/80">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="text-sm text-cafe-mocha/75 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Metrics | null>(null);

  async function load() {
    const res = await fetch('/api/metrics', { cache: 'no-store' });
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const recovery = useMemo(() => Math.max(0, Math.min(100, data?.allTime.recoveryPercent ?? 0)), [data]);

  async function updateSettings(next: { scenario?: string; includeOwnerSalary?: boolean }) {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    await load();
  }

  if (!data) return <main className="p-8">Loading dashboard…</main>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Double Cup Live</h1>
          <p className="text-cafe-mocha/80">Live dashboard for simulated café operations.</p>
        </div>
        <div className="text-sm text-cafe-mocha/80">Last updated: {new Date(data.lastUpdated).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Drinks Sold Today" value={data.today.transactions.toLocaleString()} sub={`Coffee ${data.today.drinkMix.coffee} • Tea ${data.today.drinkMix.tea} • Other ${data.today.drinkMix.other}`} />
        <Card title="Revenue Today" value={currency.format(data.today.revenue)} sub={`Transactions: ${data.today.transactions}`} />
        <Card title="Net Profit Today" value={currency.format(data.today.profit)} sub={`COGS ${currency.format(data.today.cogs)} • Fees ${currency.format(data.today.fees)}`} />
        <Card title="Employee Pay Today" value={currency.format(data.today.wages + data.today.tips)} sub={`Wages ${currency.format(data.today.wages)} + Tips ${currency.format(data.today.tips)}`} />
        <Card title="Tips Collected Today" value={currency.format(data.today.tips)} sub="Tips are paid out and excluded from shop revenue" />
        <Card title="Capital Remaining" value={currency.format(data.allTime.remainingCapital)} sub={`${currency.format(data.allTime.recoveredCapital)} recovered`} />
        <Card title="Break-even ETA" value={data.breakEven.onTrack ? `~${data.breakEven.etaDays} days` : 'Not currently on track'} sub={data.breakEven.onTrack ? `${data.breakEven.etaDate}` : `Need ${currency.format(data.breakEven.neededDailyFor12Months)}/day for 12 months`} />
        <Card title="Fixed Costs Today" value={currency.format(data.today.fixed)} sub={`Business date: ${data.businessDate}`} />
      </section>

      <section className="mb-6 rounded-2xl border border-cafe-latte bg-white/85 p-5 shadow-card">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium">Capital Recovery</span>
          <span>{recovery.toFixed(2)}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-cafe-latte">
          <div className="h-3 rounded-full bg-cafe-sage transition-all" style={{ width: `${recovery}%` }} />
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-cafe-latte bg-white/90 p-4 shadow-card lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Today&apos;s Trends (Chicago Time)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8c5e3c" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#8c5e3c" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7a8e73" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#7a8e73" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#d5bca0" />
                <XAxis dataKey="ts" minTickGap={18} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="transactions" stroke="#4b2e20" fill="#e9d7c0" name="Transactions" />
                <Area type="monotone" dataKey="revenue" stroke="#8c5e3c" fill="url(#rev)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#7a8e73" fill="url(#prof)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-cafe-latte bg-white/90 p-4 shadow-card">
          <h2 className="mb-3 text-lg font-semibold">Controls</h2>
          <label className="mb-4 block text-sm">Scenario
            <select
              className="mt-1 w-full rounded-xl border border-cafe-latte bg-cafe-cream px-3 py-2"
              value={data.settings.scenario}
              onChange={(e) => updateSettings({ scenario: e.target.value })}
            >
              <option>Conservative</option>
              <option>Base</option>
              <option>Base+</option>
              <option>Optimistic</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.settings.include_owner_salary === 1}
              onChange={(e) => updateSettings({ includeOwnerSalary: e.target.checked })}
            />
            Include owner salary in labor
          </label>
        </div>
      </section>

      <footer className="text-sm text-cafe-mocha/80">Simulated live data • Updates every 15 minutes • Chicago time</footer>
    </main>
  );
}
