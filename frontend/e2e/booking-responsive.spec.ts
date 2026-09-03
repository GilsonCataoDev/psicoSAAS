import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

test('agenda pública mantém contexto e controles legíveis no celular', async ({ page }) => {
  await page.route('**/api/public/booking/responsivo**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/dates') || url.pathname.endsWith('/slots')) {
      await route.fulfill({ json: [] })
      return
    }

    await route.fulfill({
      json: {
        id: 'booking-page-responsive',
        slug: 'responsivo',
        isActive: true,
        description: 'Atendimento psicológico com acolhimento e segurança.',
        psychologistName: 'Dra. Responsiva',
        psychologistCrp: '02/12345',
        sessionPrice: 150,
        sessionDuration: 50,
        presencialSessionDuration: 50,
        onlineSessionDuration: 50,
        slotInterval: 50,
        presencialSlotInterval: 50,
        onlineSlotInterval: 50,
        allowPresencial: true,
        allowOnline: true,
        minAdvanceDays: 0,
        allowNextMonthBooking: false,
        requirePaymentUpfront: false,
      },
    })
  })

  await page.goto('/agendar/responsivo')
  await page.getByRole('button', { name: 'Escolher horário' }).click()

  await expect(page.getByText('Escolher data', { exact: true })).toBeVisible()
  await expect(page.getByText('Escolher horário', { exact: true })).toBeVisible()
  await expect(page.getByText('Seus dados', { exact: true })).toBeVisible()

  const presencial = page.getByRole('button', { name: 'presencial' })
  const presencialBox = await presencial.boundingBox()
  expect(presencialBox?.width).toBeGreaterThan(250)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(page.getByText('Escolher data', { exact: true })).toBeVisible()
  const tabletOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(tabletOverflow).toBeLessThanOrEqual(0)
})
