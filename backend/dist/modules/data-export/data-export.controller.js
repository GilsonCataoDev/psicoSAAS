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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const data_export_service_1 = require("./data-export.service");
let DataExportController = class DataExportController {
    constructor(dataExport) {
        this.dataExport = dataExport;
    }
    async download(req, res) {
        const payload = await this.dataExport.buildExport(req.user.id);
        const stamp = new Date().toISOString().slice(0, 10);
        const filename = `usecognia-dados-${stamp}.json`;
        const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
        res.set({
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
            'Cache-Control': 'private, no-store',
        });
        res.end(buffer);
    }
};
exports.DataExportController = DataExportController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DataExportController.prototype, "download", null);
exports.DataExportController = DataExportController = __decorate([
    (0, common_1.Controller)('data-export'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [data_export_service_1.DataExportService])
], DataExportController);
//# sourceMappingURL=data-export.controller.js.map