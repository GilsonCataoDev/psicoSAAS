import { Injectable, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Template, TemplateType } from './entities/template.entity'
import { DEFAULT_TEMPLATES } from './templates.seed'
import { CreateTemplateDto } from './dto/create-template.dto'

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

  async findByType(type: TemplateType): Promise<Template | null> {
    return this.repo.findOne({
      where: { type, isDefault: true },
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
      const exists = await this.repo.findOne({ where: { type: template.type, name: template.name, isDefault: true } })
      if (exists) continue
      await this.repo.save(this.repo.create({ ...template, isDefault: true }))
    }
  }
}
