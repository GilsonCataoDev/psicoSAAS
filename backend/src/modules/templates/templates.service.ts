import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Template, TemplateType } from './entities/template.entity'
import { DEFAULT_TEMPLATES } from './templates.seed'

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(@InjectRepository(Template) private readonly repo: Repository<Template>) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults()
  }

  findAll(type?: TemplateType): Promise<Template[]> {
    return this.repo.find({
      where: type ? { type } : {},
      order: { type: 'ASC', name: 'ASC' },
    })
  }

  async seedDefaults(): Promise<void> {
    for (const template of DEFAULT_TEMPLATES) {
      const exists = await this.repo.findOne({ where: { type: template.type, name: template.name, isDefault: true } })
      if (exists) continue
      await this.repo.save(this.repo.create({ ...template, isDefault: true }))
    }
  }
}
