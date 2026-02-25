export const SCENARIOS = {
  Conservative: 0.82,
  Base: 1,
  'Base+': 1.12,
  Optimistic: 1.26,
} as const;

export type Scenario = keyof typeof SCENARIOS;

export const APP_CONFIG = {
  timezone: 'America/Chicago',
  dayResetHour: 4,

  avgTicketWeekday: 8.5,
  avgTicketWeekend: 9.25,
  ticketVariance: 2.0,

  cogsRate: 0.30,
  feePercent: 0.029,
  feeFixed: 0.30,

  initialCapitalCost: 75000,

  monthlyFixedCosts: {
    utilities: 1200,
    trash: 250,
    cleaning: 250,
    toastSoftware: 450,
    insurance: 300,
    quickbooks: 40,
    internet: 120,
    maintenanceReserve: 400,
    miscSupplies: 300,
    marketing: 250,
  },

  wageBarista: 13.5,
  wageLead: 23,
  payrollBurden: 0.12,
  ownerSalaryDaily: 210,

  tips: {
    baseMin: 0.75,
    baseMax: 1.75,
    rushMultiplier: 1.15,
  },

  mixModel: {
    coffee: 0.7,
    tea: 0.1,
    food: 0.2,
  },

  openHours: {
    weekday: { open: '06:30', close: '20:00' },
    saturday: { open: '07:30', close: '16:00' },
    sunday: { open: '08:00', close: '18:00' },
  },
} as const;

export const monthlyFixedTotal = Object.values(APP_CONFIG.monthlyFixedCosts).reduce((a, b) => a + b, 0);
