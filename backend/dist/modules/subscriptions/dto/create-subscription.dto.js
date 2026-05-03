"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSubscriptionDto = exports.CreditCardHolderInfoDto = exports.CreditCardDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreditCardDto {
}
exports.CreditCardDto = CreditCardDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardDto.prototype, "holderName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(13, 19),
    __metadata("design:type", String)
], CreditCardDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0[1-9]|1[0-2])$/),
    __metadata("design:type", String)
], CreditCardDto.prototype, "expiryMonth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{2,4}$/),
    __metadata("design:type", String)
], CreditCardDto.prototype, "expiryYear", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(3, 4),
    __metadata("design:type", String)
], CreditCardDto.prototype, "ccv", void 0);
class CreditCardHolderInfoDto {
}
exports.CreditCardHolderInfoDto = CreditCardHolderInfoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{11,14}$/, { message: 'CPF/CNPJ inválido (somente dígitos)' }),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "cpfCnpj", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "addressNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "phone", void 0);
class CreateSubscriptionDto {
}
exports.CreateSubscriptionDto = CreateSubscriptionDto;
__decorate([
    (0, class_validator_1.IsEnum)(['essencial', 'pro', 'premium']),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "planId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['CREDIT_CARD', 'PIX', 'BOLETO']),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "billingType", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateSubscriptionDto.prototype, "yearly", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{11}$/, { message: 'CPF inválido (somente 11 dígitos)' }),
    __metadata("design:type", String)
], CreateSubscriptionDto.prototype, "cpfCnpj", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreditCardDto),
    __metadata("design:type", CreditCardDto)
], CreateSubscriptionDto.prototype, "creditCard", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreditCardHolderInfoDto),
    __metadata("design:type", CreditCardHolderInfoDto)
], CreateSubscriptionDto.prototype, "creditCardHolderInfo", void 0);
//# sourceMappingURL=create-subscription.dto.js.map