export declare class CreditCardDto {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
}
export declare class CreditCardHolderInfoDto {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
}
export declare class CreateSubscriptionDto {
    planId: 'essencial' | 'pro';
    billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO';
    yearly: boolean;
    cpfCnpj: string;
    creditCard?: CreditCardDto;
    creditCardHolderInfo?: CreditCardHolderInfoDto;
}
