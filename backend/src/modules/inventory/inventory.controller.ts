import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { InventoryService } from './inventory.service'
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto'
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto'

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.svc.findAll(req.user.id)
  }

  @Post()
  create(@Body() dto: CreateInventoryItemDto, @Request() req: any) {
    return this.svc.create(req.user.id, dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto, @Request() req: any) {
    return this.svc.update(req.user.id, id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(req.user.id, id)
  }
}
