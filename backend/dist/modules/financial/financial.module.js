"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const financial_controller_1 = require("./financial.controller");
const financial_service_1 = require("./financial.service");
const financial_record_entity_1 = require("./entities/financial-record.entity");
let FinancialModule = class FinancialModule {
};
exports.FinancialModule = FinancialModule;
exports.FinancialModule = FinancialModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([financial_record_entity_1.FinancialRecord])],
        controllers: [financial_controller_1.FinancialController],
        providers: [financial_service_1.FinancialService],
    })
], FinancialModule);
//# sourceMappingURL=financial.module.js.map