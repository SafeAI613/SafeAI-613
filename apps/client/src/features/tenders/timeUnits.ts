import type { TFunction } from 'i18next'
import type { TenderTime, TenderTimeUnit } from './types'

/**
 * Time units are stored on the server as Hebrew values (see TenderTimeUnit).
 * The stored value stays as-is; only the label shown to the user is
 * translated, through a stable English key per unit.
 */
export const TIME_UNIT_KEYS: Record<TenderTimeUnit, string> = {
  'שעות': 'hours',
  'ימים': 'days',
  'שבועות': 'weeks',
  'חודשים': 'months',
  'שנים': 'years',
}

export const TIME_UNITS = Object.keys(TIME_UNIT_KEYS) as TenderTimeUnit[]

/** Label for a unit in a picker, e.g. "Days". Unknown units are shown as-is. */
export function timeUnitLabel(t: TFunction, unit: string): string {
  const key = TIME_UNIT_KEYS[unit as TenderTimeUnit]
  return key ? t(`tenders.timeUnits.${key}`) : unit
}

/** A duration for display, e.g. "3 weeks" / "1 week". Returns "—" when missing. */
export function formatTenderTime(t: TFunction, time?: TenderTime): string {
  if (!time) return '—'
  const key = TIME_UNIT_KEYS[time.unit as TenderTimeUnit]
  if (!key) return t('tenders.timeValue', { value: time.value, unit: time.unit })
  return time.value === 1
    ? t(`tenders.timeOne.${key}`)
    : t(`tenders.timeMany.${key}`, { value: time.value })
}
