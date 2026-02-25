import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { DateTime } from 'luxon';
import { APP_CONFIG } from './config';
import type { DailyRollup, Settings, TickEvent } from './types';

const POSTGRES_URL = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
const isPostgres = !!POSTGRES_URL && POSTGRES_URL.startsWith('postgres');

const sqlitePath = path.join(process.cwd(), 'data', 'dashboard.db');
fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

const sqlite = !isPostgres ? new Database(sqlitePath) : null;
const pool = isPostgres ? new Pool({ connectionString: POSTGRES_URL }) : null;

function toISO() {
  return DateTime.utc().toISO() as string;
}

export async function ensureSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      timezone TEXT NOT NULL,
      day_reset_hour INTEGER NOT NULL,
      scenario TEXT NOT NULL,
      include_owner_salary INTEGER NOT NULL,
      initial_capital_cost REAL NOT NULL,
      avg_ticket REAL NOT NULL,
      cogs_rate REAL NOT NULL,
      fee_percent REAL NOT NULL,
      fee_fixed REAL NOT NULL,
      monthly_fixed_costs_json TEXT NOT NULL,
      wage_barista REAL NOT NULL,
      wage_lead REAL NOT NULL,
      tip_model_json TEXT NOT NULL,
      owner_salary_daily REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS days (
      business_date TEXT PRIMARY KEY,
      day_of_week INTEGER NOT NULL,
      scenario_used TEXT NOT NULL,
      day_modifier REAL NOT NULL,
      open_ticks_count INTEGER NOT NULL,
      last_tick_at TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tick_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_date TEXT NOT NULL,
      ts TEXT NOT NULL,
      transactions_delta INTEGER NOT NULL,
      revenue_delta REAL NOT NULL,
      cogs_delta REAL NOT NULL,
      fees_delta REAL NOT NULL,
      wages_delta REAL NOT NULL,
      tips_delta REAL NOT NULL,
      fixed_delta REAL NOT NULL,
      profit_delta REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS daily_rollups (
      business_date TEXT PRIMARY KEY,
      transactions INTEGER NOT NULL DEFAULT 0,
      revenue REAL NOT NULL DEFAULT 0,
      cogs REAL NOT NULL DEFAULT 0,
      fees REAL NOT NULL DEFAULT 0,
      wages REAL NOT NULL DEFAULT 0,
      tips REAL NOT NULL DEFAULT 0,
      fixed REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS all_time_rollup (
      id INTEGER PRIMARY KEY,
      cumulative_profit REAL NOT NULL DEFAULT 0,
      cumulative_transactions INTEGER NOT NULL DEFAULT 0,
      cumulative_revenue REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )`
  ];

  if (sqlite) {
    statements.forEach((s) => sqlite.prepare(s).run());
  } else if (pool) {
    for (const s of statements) {
      const normalized = s.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY');
      await pool.query(normalized);
    }
  }

  await ensureDefaults();
}

async function ensureDefaults() {
  const settings = await getSettings();
  if (!settings) {
    const now = toISO();
    const fixedJson = JSON.stringify(APP_CONFIG.monthlyFixedCosts);
    const tipJson = JSON.stringify(APP_CONFIG.tips);
    if (sqlite) {
      sqlite.prepare(`INSERT INTO settings VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        APP_CONFIG.timezone,
        APP_CONFIG.dayResetHour,
        'Base+',
        0,
        APP_CONFIG.initialCapitalCost,
        APP_CONFIG.avgTicketWeekday,
        APP_CONFIG.cogsRate,
        APP_CONFIG.feePercent,
        APP_CONFIG.feeFixed,
        fixedJson,
        APP_CONFIG.wageBarista,
        APP_CONFIG.wageLead,
        tipJson,
        APP_CONFIG.ownerSalaryDaily,
        now,
        now,
      );
    } else if (pool) {
      await pool.query(
        `INSERT INTO settings (id, timezone, day_reset_hour, scenario, include_owner_salary, initial_capital_cost, avg_ticket, cogs_rate, fee_percent, fee_fixed, monthly_fixed_costs_json, wage_barista, wage_lead, tip_model_json, owner_salary_daily, created_at, updated_at)
         VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING`,
        [APP_CONFIG.timezone, APP_CONFIG.dayResetHour, 'Base+', 0, APP_CONFIG.initialCapitalCost, APP_CONFIG.avgTicketWeekday, APP_CONFIG.cogsRate, APP_CONFIG.feePercent, APP_CONFIG.feeFixed, fixedJson, APP_CONFIG.wageBarista, APP_CONFIG.wageLead, tipJson, APP_CONFIG.ownerSalaryDaily, now, now]
      );
    }
  }

  if (sqlite) {
    sqlite.prepare(`INSERT OR IGNORE INTO all_time_rollup VALUES (1,0,0,0,?)`).run(toISO());
  } else if (pool) {
    await pool.query(`INSERT INTO all_time_rollup (id, cumulative_profit, cumulative_transactions, cumulative_revenue, updated_at) VALUES (1,0,0,0,$1) ON CONFLICT (id) DO NOTHING`, [toISO()]);
  }
}

export async function getSettings(): Promise<Settings | null> {
  if (sqlite) return (sqlite.prepare(`SELECT * FROM settings WHERE id=1`).get() as Settings) ?? null;
  if (pool) return ((await pool.query(`SELECT * FROM settings WHERE id=1`)).rows[0] as Settings) ?? null;
  return null;
}

export async function updateSettings(partial: { scenario?: string; include_owner_salary?: number }) {
  const now = toISO();
  if (sqlite) {
    if (partial.scenario !== undefined) sqlite.prepare(`UPDATE settings SET scenario=?, updated_at=? WHERE id=1`).run(partial.scenario, now);
    if (partial.include_owner_salary !== undefined) sqlite.prepare(`UPDATE settings SET include_owner_salary=?, updated_at=? WHERE id=1`).run(partial.include_owner_salary, now);
  } else if (pool) {
    if (partial.scenario !== undefined) await pool.query(`UPDATE settings SET scenario=$1, updated_at=$2 WHERE id=1`, [partial.scenario, now]);
    if (partial.include_owner_salary !== undefined) await pool.query(`UPDATE settings SET include_owner_salary=$1, updated_at=$2 WHERE id=1`, [partial.include_owner_salary, now]);
  }
}

export async function getDay(businessDate: string) {
  if (sqlite) return sqlite.prepare(`SELECT * FROM days WHERE business_date=?`).get(businessDate) as { day_modifier: number; scenario_used: string; last_tick_at: string | null } | undefined;
  if (pool) return (await pool.query(`SELECT * FROM days WHERE business_date=$1`, [businessDate])).rows[0] as { day_modifier: number; scenario_used: string; last_tick_at: string | null } | undefined;
}

export async function ensureDay(params: { businessDate: string; scenario: string; dayOfWeek: number; openTicksCount: number; }) {
  const modifier = 0.93 + Math.random() * 0.18;
  const created = toISO();
  if (sqlite) {
    sqlite.prepare(`INSERT OR IGNORE INTO days (business_date, day_of_week, scenario_used, day_modifier, open_ticks_count, last_tick_at, created_at) VALUES (?,?,?,?,?,?,?)`)
      .run(params.businessDate, params.dayOfWeek, params.scenario, modifier, params.openTicksCount, null, created);
    sqlite.prepare(`INSERT OR IGNORE INTO daily_rollups (business_date) VALUES (?)`).run(params.businessDate);
  } else if (pool) {
    await pool.query(`INSERT INTO days (business_date, day_of_week, scenario_used, day_modifier, open_ticks_count, last_tick_at, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (business_date) DO NOTHING`, [params.businessDate, params.dayOfWeek, params.scenario, modifier, params.openTicksCount, null, created]);
    await pool.query(`INSERT INTO daily_rollups (business_date) VALUES ($1) ON CONFLICT (business_date) DO NOTHING`, [params.businessDate]);
  }
}

export async function updateDayLastTick(businessDate: string, tickAt: string) {
  if (sqlite) sqlite.prepare(`UPDATE days SET last_tick_at=? WHERE business_date=?`).run(tickAt, businessDate);
  if (pool) await pool.query(`UPDATE days SET last_tick_at=$1 WHERE business_date=$2`, [tickAt, businessDate]);
}

export async function insertTickAndRollup(businessDate: string, delta: Omit<TickEvent, 'id' | 'business_date' | 'ts'> & { ts: string }) {
  if (sqlite) {
    sqlite.prepare(`INSERT INTO tick_events (business_date, ts, transactions_delta, revenue_delta, cogs_delta, fees_delta, wages_delta, tips_delta, fixed_delta, profit_delta)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(businessDate, delta.ts, delta.transactions_delta, delta.revenue_delta, delta.cogs_delta, delta.fees_delta, delta.wages_delta, delta.tips_delta, delta.fixed_delta, delta.profit_delta);
    sqlite.prepare(`UPDATE daily_rollups SET
      transactions = transactions + ?,
      revenue = revenue + ?,
      cogs = cogs + ?,
      fees = fees + ?,
      wages = wages + ?,
      tips = tips + ?,
      fixed = fixed + ?,
      profit = profit + ?
      WHERE business_date = ?`).run(delta.transactions_delta, delta.revenue_delta, delta.cogs_delta, delta.fees_delta, delta.wages_delta, delta.tips_delta, delta.fixed_delta, delta.profit_delta, businessDate);
    sqlite.prepare(`UPDATE all_time_rollup SET cumulative_profit = cumulative_profit + ?, cumulative_transactions = cumulative_transactions + ?, cumulative_revenue = cumulative_revenue + ?, updated_at=? WHERE id=1`)
      .run(delta.profit_delta, delta.transactions_delta, delta.revenue_delta, delta.ts);
  } else if (pool) {
    await pool.query(`INSERT INTO tick_events (business_date, ts, transactions_delta, revenue_delta, cogs_delta, fees_delta, wages_delta, tips_delta, fixed_delta, profit_delta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [businessDate, delta.ts, delta.transactions_delta, delta.revenue_delta, delta.cogs_delta, delta.fees_delta, delta.wages_delta, delta.tips_delta, delta.fixed_delta, delta.profit_delta]);
    await pool.query(`UPDATE daily_rollups SET transactions=transactions+$1, revenue=revenue+$2, cogs=cogs+$3, fees=fees+$4, wages=wages+$5, tips=tips+$6, fixed=fixed+$7, profit=profit+$8 WHERE business_date=$9`, [delta.transactions_delta, delta.revenue_delta, delta.cogs_delta, delta.fees_delta, delta.wages_delta, delta.tips_delta, delta.fixed_delta, delta.profit_delta, businessDate]);
    await pool.query(`UPDATE all_time_rollup SET cumulative_profit = cumulative_profit + $1, cumulative_transactions = cumulative_transactions + $2, cumulative_revenue = cumulative_revenue + $3, updated_at=$4 WHERE id=1`, [delta.profit_delta, delta.transactions_delta, delta.revenue_delta, delta.ts]);
  }
}

export async function getDailyRollup(businessDate: string): Promise<DailyRollup | null> {
  if (sqlite) return (sqlite.prepare(`SELECT * FROM daily_rollups WHERE business_date=?`).get(businessDate) as DailyRollup) ?? null;
  if (pool) return ((await pool.query(`SELECT * FROM daily_rollups WHERE business_date=$1`, [businessDate])).rows[0] as DailyRollup) ?? null;
  return null;
}

export async function getTickEvents(businessDate: string): Promise<TickEvent[]> {
  if (sqlite) return sqlite.prepare(`SELECT * FROM tick_events WHERE business_date=? ORDER BY ts`).all(businessDate) as TickEvent[];
  if (pool) return (await pool.query(`SELECT * FROM tick_events WHERE business_date=$1 ORDER BY ts`, [businessDate])).rows as TickEvent[];
  return [];
}

export async function getAllTimeRollup() {
  if (sqlite) return sqlite.prepare(`SELECT * FROM all_time_rollup WHERE id=1`).get() as { cumulative_profit: number; cumulative_transactions: number; cumulative_revenue: number; updated_at: string; };
  if (pool) return (await pool.query(`SELECT * FROM all_time_rollup WHERE id=1`)).rows[0] as { cumulative_profit: number; cumulative_transactions: number; cumulative_revenue: number; updated_at: string; };
}

export async function getRecentDailyProfits(limit: number): Promise<Array<{ business_date: string; profit: number }>> {
  if (sqlite) return sqlite.prepare(`SELECT business_date, profit FROM daily_rollups ORDER BY business_date DESC LIMIT ?`).all(limit) as Array<{ business_date: string; profit: number }>;
  if (pool) return (await pool.query(`SELECT business_date, profit FROM daily_rollups ORDER BY business_date DESC LIMIT $1`, [limit])).rows;
  return [];
}
