import { Injectable } from '@nestjs/common'
import { ProspectSourceType } from '../entities/prospect.entity'

export interface QueryBuilderInput {
  profession?: string
  city: string
  state?: string
  approach?: string
  modality?: 'online' | 'presencial' | 'ambos'
  sources: ProspectSourceType[]
}

export const NEGATIVE_TERMS = [
  'paciente', 'tratamento', 'consulta gratuita', 'concurso', 'vaga', 'emprego',
  'faculdade', 'hospital', 'notícia', 'PDF', 'CRP', 'CFP', 'curso', 'salário',
]

/**
 * Monta as strings de busca a partir dos filtros do administrador. Os termos
 * negativos são aplicados como exclusões `-termo` diretamente na query (em vez
 * de um filtro pós-busca) porque a maioria de APIs de busca web suporta esse
 * operador nativamente e reduz o número de resultados irrelevantes cobrados.
 */
@Injectable()
export class QueryBuilderService {
  build(input: QueryBuilderInput): string[] {
    const profession = input.profession?.trim() || 'psicóloga clínica'
    const city = input.city.trim()
    const state = input.state?.trim()
    const location = state ? `"${city}" "${state}"` : `"${city}"`
    const negatives = NEGATIVE_TERMS.map(term => `-${term.includes(' ') ? `"${term}"` : term}`).join(' ')

    const queries: string[] = []

    for (const source of input.sources) {
      queries.push(...this.buildForSource(source, { profession, location, city, approach: input.approach, modality: input.modality, negatives }))
    }

    return Array.from(new Set(queries))
  }

  private buildForSource(
    source: ProspectSourceType,
    ctx: { profession: string; location: string; city: string; approach?: string; modality?: string; negatives: string },
  ): string[] {
    const approachTerm = ctx.approach ? `"${ctx.approach}"` : ''
    const modalityTerm = ctx.modality === 'online' ? 'atendimento online' : ctx.modality === 'presencial' ? 'consultório particular' : ''

    switch (source) {
      case 'linkedin_search':
        return [`site:linkedin.com/in "${ctx.profession}" ${ctx.location}`]
      case 'psymeet_search':
        return [
          `site:psymeetsocial.com "${ctx.profession}" ${ctx.location}`,
          `site:psymeet.com.br "${ctx.profession}" ${ctx.location}`,
        ]
      case 'directory_search':
        return [`"${ctx.profession}" ${ctx.location} diretório psicólogos ${ctx.negatives}`]
      case 'own_site':
      default:
        return [
          [`"${ctx.profession}"`, ctx.location, approachTerm, modalityTerm, 'contato', ctx.negatives]
            .filter(Boolean).join(' '),
          [`agendamento pelo WhatsApp`, `"${ctx.profession}"`, ctx.location, ctx.negatives]
            .filter(Boolean).join(' '),
        ]
    }
  }
}
