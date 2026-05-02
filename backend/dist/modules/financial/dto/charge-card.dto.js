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
exports.ChargeCardDto = exports.CreditCardHolderInfoDto = exports.CreditCardDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
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
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardDto.prototype, "number", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0[1-9]|1[0-2])$/, { message: 'expiryMonth inválido (01-12)' }),
    __metadata("design:type", String)
], CreditCardDto.prototype, "expiryMonth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}$/, { message: 'expiryYear inválido (ex: 2027)' }),
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
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{11}(\d{3})?$/, { message: 'cpfCnpj deve ter 11 (CPF) ou 14 (CNPJ) dígitos' }),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "cpfCnpj", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{8}$/, { message: 'postalCode deve ter 8 dígitos' }),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "addressNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "addressComplement", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{10,11}$/, { message: 'phone inválido' }),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreditCardHolderInfoDto.prototype, "mobilePhone", void 0);
class ChargeCardDto {
}
exports.ChargeCardDto = ChargeCardDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreditCardDto),
    __metadata("design:type", CreditCardDto)
], ChargeCardDto.prototype, "creditCard", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CreditCardHolderInfoDto),
    __metadata("design:type", CreditCardHolderInfoDto)
], ChargeCardDto.prototype, "creditCardHolderInfo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ChargeCardDto.prototype, "saveCustomer", void 0);
//# sourceMappingURL=charge-card.dto.js.map