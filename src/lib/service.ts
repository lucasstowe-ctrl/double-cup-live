import { DateTime } from 'luxon';
import { APP_CONFIG, type Scenario } from './config';
import {
  ensureDay,
  ensureSchema,
  getAllTimeRollup,
  getDailyRollup,
  getDay,
  getRecentDailyProfits,
  getSettings,
  getTickEvents,
  insertTickAndRollup,
  updateDayLastTick,
  updateSettings,
} from './db';
import { projectedDailyProfit, simulateTick } from './sim';
import { getBusinessDate, nowChicago, ticksPerBusinessDay } from './time';

export async function processTick() {
  await ensureSchema();
  const settings = await getSettings();
  if (!settings) throw new Error('Settings missing');

  const now = nowChicago();
  const businessDate = getBusinessDate(now);
  await ensureDay({ businessDate, scenario: settings.scenario, dayOfWeek: now.weekday, openTicksCount: ticksPerBusinessDay(now) });
  const day = await getDay(businessDate);

  if (day?.last_tick_at) {
    const diff = now.diff(DateTime.fromISO(day.last_tick_at).setZone(APP_CONFIG.timezone), 'minutes').minutes;
    if (diff < 14) {
      return { status: 'skipped', reason: 'Tick already processed in last 14 minutes.' };
    }
  }

  const sim = simulateTick({
    now,
    scenario: settings.scenario as Scenario,
    dayModifier: day?.day_modifier ?? 1,
    includeOwnerSalary: settings.include_owner_salary === 1,
  });
  const ts = now.toUTC().toISO() as string;

  await insertTickAndRollup(businessDate, {
    ts,
    transactions_delta: sim.transactions,
    revenue_delta: sim.revenue,
    cogs_delta: sim.cogs,
    fees_delta: sim.fees,
    wages_delta: sim.wages,
    tips_delta: sim.tips,
    fixed_delta: sim.fixed,
    profit_delta: sim.profit,
  });
  await updateDayLastTick(businessDate, now.toISO() as string);

  return { status: 'ok', businessDate, sim };
}

export async function getDashboardMetrics() {
  await ensureSchema();
  const now = nowChicago();
  const businessDate = getBusinessDate(now);
  const settings = await getSettings();

  if (!settings) throw new Error('settings missing');

  await ensureDay({ businessDate, scenario: settings.scenario, dayOfWeek: now.weekday, openTicksCount: ticksPerBusinessDay(now) });
  const day = await getDay(businessDate);

  const rollup = await getDailyRollup(businessDate);
  const events = await getTickEvents(businessDate);
  const allTime = await getAllTimeRollup();
  const recentProfits = await getRecentDailyProfits(7);

 const cumulativeProfit = Number(allTime?.cumulative_profit ?? 0);
const remainingCapital = Math.max(0, Number(settings.initial_capital_cost) - cumulativeProfit);
  const avgDaily = recentProfits.length >= 3
    ? recentProfits.reduce((sum, d) => sum + Number(d.profit), 0) / recentProfits.length
    : projectedDailyProfit(settings.scenario as Scenario);

  const etaDays = avgDaily > 0 ? Math.ceil(remainingCapital / avgDaily) : null;
  const etaDate = etaDays ? now.plus({ days: etaDays }).toISODate() : null;

  const needed12Month = remainingCapital / 365;

  const cum = { rev: 0, profit: 0, tx: 0 };
  const series = events.map((e) => {
    cum.rev += Number(e.revenue_delta);
    cum.profit += Number(e.profit_delta);
    cum.tx += Number(e.transactions_delta);
    return {
      ts: DateTime.fromISO(e.ts).setZone(APP_CONFIG.timezone).toFormat('h:mm a'),
      revenue: cum.rev,
      profit: cum.profit,
      transactions: cum.tx,
    };
  });

  const totalDrinks = rollup?.transactions ?? 0;
  const coffee = Math.round(totalDrinks * APP_CONFIG.mixModel.coffee);
  const tea = Math.round(totalDrinks * APP_CONFIG.mixModel.tea);
  const other = Math.max(0, totalDrinks - coffee - tea);

  return {
    businessDate,
    lastUpdated: day?.last_tick_at ?? now.toISO(),
    settings,
    today: {
      ...(rollup ?? { transactions: 0, revenue: 0, cogs: 0, fees: 0, wages: 0, tips: 0, fixed: 0, profit: 0 }),
      drinkMix: { coffee, tea, other },
    },
    allTime: {
      ...allTime,
      remainingCapital,
      recoveredCapital: settings.initial_capital_cost - remainingCapital,
      recoveryPercent: ((settings.initial_capital_cost - remainingCapital) / settings.initial_capital_cost) * 100,
    },
    breakEven: {
      etaDays,
      etaDate,
      avgDailyProfit: avgDaily,
      onTrack: avgDaily > 0,
      neededDailyFor12Months: needed12Month,
    },
    series,
  };
}

export async function patchSettings(data: { scenario?: Scenario; includeOwnerSalary?: boolean }) {
  await ensureSchema();
  await updateSettings({
    scenario: data.scenario,
    include_owner_salary: data.includeOwnerSalary === undefined ? undefined : data.includeOwnerSalary ? 1 : 0,
  });
  return getSettings();
}
