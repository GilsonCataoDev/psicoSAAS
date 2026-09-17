import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { InventoryItem } from './entities/inventory-item.entity'
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto'
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto'

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly repo: Repository<InventoryItem>,
  ) {}

  findAll(userId: string): Promise<InventoryItem[]> {
    return this.repo.find({
      where: { userId },
      order: { name: 'ASC' },
    })
  }

  async create(userId: string, dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const item = this.repo.create({
      ...dto,
      quantity: dto.quantity ?? 0,
      userId,
    })
    return this.repo.save(item)
  }

  async update(userId: string, id: string, dto: UpdateInventoryItemDto): Promise<InventoryItem> {
    const item = await this.findOwned(userId, id)
    Object.assign(item, dto)
    return this.repo.save(item)
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const item = await this.findOwned(userId, id)
    await this.repo.remove(item)
    return { id }
  }

  private async findOwned(userId: string, id: string): Promise<InventoryItem> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) throw new NotFoundException('Produto não encontrado')
    if (item.userId !== userId) throw new ForbiddenException()
    return item
  }
}
