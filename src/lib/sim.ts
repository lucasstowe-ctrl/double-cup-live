import { DateTime } from 'luxon';
import { APP_CONFIG, SCENARIOS, type Scenario, monthlyFixedTotal } from './config';
import { isOpen, ticksPerBusinessDay } from './time';

type TickInput = {
  now: DateTime;
  scenario: Scenario;
  dayModifier: number;
  includeOwnerSalary: boolean;
};

function seededNoise(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function rushFactor(minuteOfDay: number, weekday: number) {
  const morningPeak = Math.exp(-Math.pow((minuteOfDay - 8 * 60) / 100, 2));
  const afternoonBump = 0.45 * Math.exp(-Math.pow((minuteOfDay - 15 * 60) / 140, 2));
  const middayDip = 0.18 * Math.exp(-Math.pow((minuteOfDay - 12 * 60) / 100, 2));
  const weekendTilt = weekday >= 6 ? 0.92 : 1;
  return Math.max(0.2, (0.55 + morningPeak + afternoonBump - middayDip) * weekendTilt);
}

function expectedTransactions(now: DateTime, scenario: Scenario, dayModifier: number) {
  if (!isOpen(now)) return 0;
  const minuteOfDay = now.hour * 60 + now.minute;
  const curve = rushFactor(minuteOfDay, now.weekday);
  const weekdayBase = now.weekday <= 5 ? 11 : now.weekday === 6 ? 9 : 8;
  const scenarioMult = SCENARIOS[scenario];
  const noise = 0.9 + seededNoise(now.toMillis()) * 0.25;
  return Math.max(0, weekdayBase * curve * scenarioMult * dayModifier * noise);
}

function staffing(now: DateTime) {
  if (!isOpen(now)) return { baristas: 0, leads: 0 };
  const minute = now.hour * 60 + now.minute;
  const openMinute = now.weekday <= 5 ? 6 * 60 : now.weekday === 6 ? 7 * 60 + 30 : 8 * 60;
  const closeMinute = now.weekday <= 5 ? 20 * 60 : now.weekday === 6 ? 16 * 60 : 18 * 60;

  const edgeWindow = minute < openMinute + 60 || minute >= closeMinute - 60;
  return edgeWindow ? { baristas: 1, leads: 1 } : { baristas: 2, leads: 1 };
}

export function simulateTick(input: TickInput) {
  const { now, scenario, dayModifier, includeOwnerSalary } = input;
  const expected = expectedTransactions(now, scenario, dayModifier);
  const whole = Math.floor(expected);
  const fraction = expected - whole;
  const transactions = whole + (Math.random() < fraction ? 1 : 0);

  let revenue = 0;
  for (let i = 0; i < transactions; i += 1) {
  const variance = (Math.random() - 0.5) * APP_CONFIG.ticketVariance * 2;

  const isWeekend = now.weekday === 6 || now.weekday === 7;
  const avgTicket = isWeekend
    ? APP_CONFIG.avgTicketWeekend
    : APP_CONFIG.avgTicketWeekday;

  const isWeekend = now.weekday === 6 || now.weekday === 7;
const avgTicket = isWeekend ? APP_CONFIG.avgTicketWeekend : APP_CONFIG.avgTicketWeekday;
revenue += Math.max(4.5, avgTicket + variance);
}

  const cogs = revenue * APP_CONFIG.cogsRate;
  const fees = revenue * APP_CONFIG.feePercent + transactions * APP_CONFIG.feeFixed;

  const minuteOfDay = now.hour * 60 + now.minute;
  const rush = rushFactor(minuteOfDay, now.weekday) > 1.15;
  const tipPerTx = transactions === 0
    ? 0
    : (APP_CONFIG.tips.baseMin + Math.random() * (APP_CONFIG.tips.baseMax - APP_CONFIG.tips.baseMin)) * (rush ? APP_CONFIG.tips.rushMultiplier : 1);
  const tips = tipPerTx * transactions;

  const workers = staffing(now);
  const wages = (workers.baristas * APP_CONFIG.wageBarista + workers.leads * APP_CONFIG.wageLead) * 0.25;
  const owner = includeOwnerSalary && isOpen(now)
    ? APP_CONFIG.ownerSalaryDaily / ticksPerBusinessDay(now)
    : 0;

  const laborTotal = wages + tips + owner;
  const daysInMonth = now.daysInMonth ?? 30;
const fixed = monthlyFixedTotal / daysInMonth / ticksPerBusinessDay(now);
  const profit = revenue - cogs - fees - fixed - laborTotal;

  return {
    transactions,
    revenue,
    cogs,
    fees,
    wages: wages + owner,
    tips,
    fixed,
    profit,
    mix: {
      coffee: Math.round(transactions * APP_CONFIG.mixModel.coffee),
      tea: Math.round(transactions * APP_CONFIG.mixModel.tea),
      other: Math.max(0, transactions - Math.round(transactions * APP_CONFIG.mixModel.coffee) - Math.round(transactions * APP_CONFIG.mixModel.tea)),
    }
  };
}

export function projectedDailyProfit(scenario: Scenario) {
  const ticks = 56;
  let total = 0;
  for (let i = 0; i < ticks; i += 1) {
    total += (74 * SCENARIOS[scenario]) - (74 * APP_CONFIG.cogsRate) - (74 * APP_CONFIG.feePercent) - 16 - 12;
  }
  return Math.max(120, total / 3);
}
