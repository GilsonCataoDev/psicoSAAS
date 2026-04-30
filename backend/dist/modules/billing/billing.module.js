"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const asaas_service_1 = require("./asaas.service");
const billing_webhook_service_1 = require("./billing-webhook.service");
const billing_trial_email_job_1 = require("./billing-trial-email.job");
const billing_controller_1 = require("./billing.controller");
const billing_service_1 = require("./billing.service");
const subscription_entity_1 = require("./entities/subscription.entity");
const webhook_event_entity_1 = require("./entities/webhook-event.entity");
const user_entity_1 = require("../auth/entities/user.entity");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([subscription_entity_1.Subscription, webhook_event_entity_1.WebhookEvent, user_entity_1.User])],
        controllers: [billing_controller_1.BillingController],
        providers: [asaas_service_1.AsaasService, billing_service_1.BillingService, billing_webhook_service_1.BillingWebhookService, billing_trial_email_job_1.BillingTrialEmailJob],
        exports: [billing_service_1.BillingService],
    })
], BillingModule);
//# sourceMappingURL=billing.module.js.map