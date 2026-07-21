function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const next = new Date(Date.UTC(year, month, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * A agenda publica abre apenas o mes atual. O mes seguinte depende de uma
 * permissao explicita do profissional; meses posteriores nunca sao liberados.
 */
export function isPublicBookingMonthAllowed(
  targetDateOrMonth: string,
  todayDate: string,
  allowNextMonthBooking: boolean,
): boolean {
  const targetMonth = targetDateOrMonth.slice(0, 7)
  const currentMonth = todayDate.slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(targetMonth) || !/^\d{4}-\d{2}$/.test(currentMonth)) {
    return false
  }

  return targetMonth === currentMonth
    || (allowNextMonthBooking && targetMonth === nextMonthKey(currentMonth))
}
