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
exports.AvailabilityController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const availability_service_1 = require("./availability.service");
let AvailabilityController = class AvailabilityController {
    constructor(svc) {
        this.svc = svc;
    }
    getSlots(req) { return this.svc.findAll(req.user.id); }
    saveSlots(req, body) {
        return this.svc.saveSlots(req.user.id, body.slots);
    }
    getBlocked(req) { return this.svc.getBlockedDates(req.user.id); }
    addBlocked(req, body) {
        return this.svc.addBlockedDate(req.user.id, body.date, body.reason);
    }
    removeBlocked(id, req) {
        return this.svc.removeBlockedDate(id, req.user.id);
    }
};
exports.AvailabilityController = AvailabilityController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "getSlots", null);
__decorate([
    (0, common_1.Post)('slots'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "saveSlots", null);
__decorate([
    (0, common_1.Get)('blocked'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "getBlocked", null);
__decorate([
    (0, common_1.Post)('blocked'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "addBlocked", null);
__decorate([
    (0, common_1.Delete)('blocked/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AvailabilityController.prototype, "removeBlocked", null);
exports.AvailabilityController = AvailabilityController = __decorate([
    (0, common_1.Controller)('availability'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [availability_service_1.AvailabilityService])
], AvailabilityController);
//# sourceMappingURL=availability.controller.js.map