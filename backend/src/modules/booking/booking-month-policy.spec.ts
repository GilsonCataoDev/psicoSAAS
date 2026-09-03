import { isPublicBookingMonthAllowed } from './booking-month-policy'

describe('isPublicBookingMonthAllowed', () => {
  it('permite o mes atual mesmo sem liberar o proximo', () => {
    expect(isPublicBookingMonthAllowed('2026-07-31', '2026-07-21', false)).toBe(true)
  })

  it('bloqueia o proximo mes por padrao', () => {
    expect(isPublicBookingMonthAllowed('2026-08-01', '2026-07-21', false)).toBe(false)
  })

  it('permite o proximo mes quando o profissional autoriza', () => {
    expect(isPublicBookingMonthAllowed('2026-08', '2026-07-21', true)).toBe(true)
  })

  it('bloqueia meses posteriores mesmo com a autorizacao ativa', () => {
    expect(isPublicBookingMonthAllowed('2026-09-01', '2026-07-21', true)).toBe(false)
  })

  it('bloqueia meses anteriores', () => {
    expect(isPublicBookingMonthAllowed('2026-06-30', '2026-07-21', true)).toBe(false)
  })

  it('trata corretamente a virada do ano', () => {
    expect(isPublicBookingMonthAllowed('2027-01-05', '2026-12-20', true)).toBe(true)
    expect(isPublicBookingMonthAllowed('2027-02-01', '2026-12-20', true)).toBe(false)
  })
})
