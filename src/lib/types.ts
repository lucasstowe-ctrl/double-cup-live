import type { Scenario } from './config';

export type Settings = {
  id: number;
  timezone: string;
  day_reset_hour: number;
  scenario: Scenario;
  include_owner_salary: number;
  initial_capital_cost: number;
  avg_ticket: number;
  cogs_rate: number;
  fee_percent: number;
  fee_fixed: number;
  monthly_fixed_costs_json: string;
  wage_barista: number;
  wage_lead: number;
  tip_model_json: string;
  owner_salary_daily: number;
  created_at: string;
  updated_at: string;
};

export type DailyRollup = {
  business_date: string;
  transactions: number;
  revenue: number;
  cogs: number;
  fees: number;
  wages: number;
  tips: number;
  fixed: number;
  profit: number;
};

export type TickEvent = {
  id: number;
  business_date: string;
  ts: string;
  transactions_delta: number;
  revenue_delta: number;
  cogs_delta: number;
  fees_delta: number;
  wages_delta: number;
  tips_delta: number;
  fixed_delta: number;
  profit_delta: number;
};
