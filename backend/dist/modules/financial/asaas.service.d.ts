export declare class PatientAsaasService {
    private readonly logger;
    private buildApi;
    findOrCreateCustomer(apiKey: string, patientId: string, name: string, cpfCnpj: string, email?: string): Promise<string>;
    tokenizeCard(apiKey: string, customerId: string, card: {
        holderName: string;
        number: string;
        expiryMonth: string;
        expiryYear: string;
        ccv: string;
    }, holderInfo: {
        name: string;
        email: string;
        cpfCnpj: string;
        postalCode: string;
        addressNumber: string;
        addressComplement?: string;
        phone: string;
        mobilePhone?: string;
    }, remoteIp: string): Promise<string>;
    createInvoicePayment(apiKey: string, customerId: string, params: {
        value: number;
        dueDate: string;
        description: string;
        externalRef: string;
    }): Promise<{
        id: string;
        invoiceUrl?: string;
        status: string;
    }>;
    createCardPayment(apiKey: string, customerId: string, params: {
        value: number;
        dueDate: string;
        description: string;
        externalRef: string;
        creditCardToken: string;
        holderInfo: {
            name: string;
            email: string;
            cpfCnpj: string;
            postalCode: string;
            addressNumber: string;
            addressComplement?: string;
            phone: string;
            mobilePhone?: string;
        };
    }): Promise<{
        id: string;
        status: string;
        invoiceUrl?: string;
    }>;
}
