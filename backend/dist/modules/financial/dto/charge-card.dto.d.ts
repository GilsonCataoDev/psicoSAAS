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
    addressComplement?: string;
    phone: string;
    mobilePhone?: string;
}
export declare class ChargeCardDto {
    creditCard: CreditCardDto;
    creditCardHolderInfo: CreditCardHolderInfoDto;
    saveCustomer?: boolean;
}
