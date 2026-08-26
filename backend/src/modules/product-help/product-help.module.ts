import { Module } from '@nestjs/common'
import { ProductHelpController } from './product-help.controller'
import { ProductHelpService } from './product-help.service'
import { GeminiProductHelpClient } from './gemini-product-help.client'
import { PRODUCT_HELP_AI_CLIENT } from './product-help-ai.client'

@Module({
  controllers: [ProductHelpController],
  providers: [
    ProductHelpService,
    GeminiProductHelpClient,
    { provide: PRODUCT_HELP_AI_CLIENT, useExisting: GeminiProductHelpClient },
  ],
})
export class ProductHelpModule {}
