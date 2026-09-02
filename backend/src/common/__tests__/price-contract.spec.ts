import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { PLAN_PRICES, PLAN_LIMITS } from '../plans'

/**
 * O preço que efetivamente cobra é PLAN_PRICES (asaas.service o usa para criar
 * a cobrança). Mas o valor está repetido, em texto, no e-mail de upsell, no
 * banner do app, na página de preços e no catálogo do frontend.
 *
 * Sem esta trava, mudar o preço em plans.ts faz o Asaas cobrar o valor novo
 * enquanto todo o resto continua anunciando o antigo — anunciar um preço e
 * cobrar outro é problema de CDC, não só bug.
 *
 * Este teste não elimina a duplicação: ele garante que ela não passe
 * despercebida. Ao mudar um preço, o CI quebra e aponta cada arquivo a ajustar.
 */

const REPO = join(__dirname, '..', '..', '..', '..')

/** Valor da oferta de ativação — declarado em billing.service.ts. */
function readActivationOfferValue(): number {
  const source = readFileSync(join(REPO, 'backend/src/modules/billing/billing.service.ts'), 'utf8')
  const match = source.match(/ACTIVATION_OFFER_VALUE\s*=\s*([\d.]+)/)
  if (!match) throw new Error('ACTIVATION_OFFER_VALUE não encontrado em billing.service.ts')
  return Number(match[1])
}

/** Superfícies que exibem preço ao usuário — texto e constantes. */
const PRICE_SURFACES = [
  'backend/src/modules/billing/billing.service.ts',
  'backend/src/modules/email/email.service.ts',
  'frontend/src/config/planCatalog.ts',
  'frontend/src/data/pricingPlans.ts',
  'frontend/src/pages/PricingPage.tsx',
  'frontend/src/components/layout/AppLayout.tsx',
]

/**
 * Extrai valores monetários escritos como "R$ 97,90"/"R$ 97.90" e como número
 * cru com 2 casas (97.90) — as duas formas usadas no código.
 *
 * Números abaixo de 1 são descartados: no frontend a maioria é opacidade,
 * duração de animação ou cor rgba, não preço.
 */
function extractPrices(source: string): number[] {
  const found = new Set<number>()
  for (const m of source.matchAll(/R\$\s*(\d{1,3}(?:[.,]\d{2}))/g)) {
    found.add(Number(m[1].replace(',', '.')))
  }
  for (const m of source.matchAll(/(?<![\w.])(\d{1,3}\.\d{2})(?![\d\w])/g)) {
    found.add(Number(m[1]))
  }
  return [...found].filter(value => value >= 1)
}

describe('contrato de preço entre backend e frontend', () => {
  const activationOffer = readActivationOfferValue()

  it('o catálogo do frontend cobra o mesmo que o backend', () => {
    const catalog = readFileSync(join(REPO, 'frontend/src/config/planCatalog.ts'), 'utf8')

    const proPrice = catalog.match(/id:\s*'pro'[^}]*price:\s*([\d.]+)/)?.[1]
    expect(proPrice).toBeDefined()
    expect(Number(proPrice)).toBe(PLAN_PRICES.pro)

    const freePrice = catalog.match(/id:\s*'free'[^}]*price:\s*([\d.]+)/)?.[1]
    expect(Number(freePrice)).toBe(0)
  })

  it('os limites de paciente do catálogo batem com os do backend', () => {
    const catalog = readFileSync(join(REPO, 'frontend/src/config/planCatalog.ts'), 'utf8')

    const freeMax = catalog.match(/id:\s*'free'[^}]*maxPatients:\s*(-?\d+)/)?.[1]
    const proMax = catalog.match(/id:\s*'pro'[^}]*maxPatients:\s*(-?\d+)/)?.[1]

    expect(Number(freeMax)).toBe(PLAN_LIMITS.free.maxPatients)
    expect(Number(proMax)).toBe(PLAN_LIMITS.pro.maxPatients)
  })

  it('nenhuma superfície anuncia um preço que o backend não pratica', () => {
    // Valores legítimos: o preço do plano, a oferta de ativação e zero.
    const allowed = new Set<number>([...Object.values(PLAN_PRICES), activationOffer, 0])
    const offenders: string[] = []

    for (const relative of PRICE_SURFACES) {
      const path = join(REPO, relative)
      if (!existsSync(path)) continue
      for (const price of extractPrices(readFileSync(path, 'utf8'))) {
        if (!allowed.has(price)) offenders.push(`${relative}: R$ ${price.toFixed(2)}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
