import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Template, TemplateType } from './entities/template.entity'
import { DEFAULT_TEMPLATES, templateProfessionFor } from './templates.seed'
import { CreateTemplateDto } from './dto/create-template.dto'

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(@InjectRepository(Template) private readonly repo: Repository<Template>) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults()
  }

  /**
   * `profession` vem do usuário autenticado. Ausente cai em psicologia, que é
   * o comportamento histórico — conta antiga continua vendo os mesmos templates.
   */
  findAll(type?: TemplateType, profession?: string | null): Promise<Template[]> {
    return this.repo.find({
      where: {
        profession: templateProfessionFor(profession),
        ...(type ? { type } : {}),
      },
      order: { type: 'ASC', name: 'ASC' },
    })
  }

  async findByType(type: TemplateType, profession?: string | null): Promise<Template | null> {
    return this.repo.findOne({
      where: { type, isDefault: true, profession: templateProfessionFor(profession) },
      order: { createdAt: 'ASC' },
    })
  }

  create(dto: CreateTemplateDto): Promise<Template> {
    return this.repo.save(this.repo.create({
      ...dto,
      tags: dto.tags ?? [],
      isDefault: dto.isDefault ?? false,
    }))
  }

  async seedDefaults(): Promise<void> {
    for (const template of DEFAULT_TEMPLATES) {
      const exists = await this.repo.findOne({
        where: { type: template.type, isDefault: true, profession: template.profession },
        order: { createdAt: 'ASC' },
      })
      if (exists) {
        await this.repo.save(this.repo.merge(exists, template))
        continue
      }
      await this.repo.save(this.repo.create({ ...template, isDefault: true }))
    }
  }
}
