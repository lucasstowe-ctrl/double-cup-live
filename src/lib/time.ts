import { DateTime } from 'luxon';
import { APP_CONFIG } from './config';

export function nowChicago() {
  return DateTime.now().setZone(APP_CONFIG.timezone);
}

export function getBusinessDate(dt = nowChicago()) {
  const shifted = dt.hour < APP_CONFIG.dayResetHour ? dt.minus({ day: 1 }) : dt;
  return shifted.toISODate() as string;
}

export function isOpen(dt: DateTime) {
  const weekday = dt.weekday;
  const { open, close } = weekday <= 5
    ? APP_CONFIG.openHours.weekday
    : weekday === 6
      ? APP_CONFIG.openHours.saturday
      : APP_CONFIG.openHours.sunday;

  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const openMinute = openH * 60 + openM;
  const closeMinute = closeH * 60 + closeM;
  const minute = dt.hour * 60 + dt.minute;
  return minute >= openMinute && minute < closeMinute;
}

export function ticksPerBusinessDay(dt: DateTime) {
  const weekday = dt.weekday;
  const { open, close } = weekday <= 5
    ? APP_CONFIG.openHours.weekday
    : weekday === 6
      ? APP_CONFIG.openHours.saturday
      : APP_CONFIG.openHours.sunday;
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const minutes = closeH * 60 + closeM - (openH * 60 + openM);
  return Math.floor(minutes / 15);
}

export function formatLastUpdated(iso: string) {
  return DateTime.fromISO(iso).setZone(APP_CONFIG.timezone).toFormat('MMM d, h:mm a');
}
