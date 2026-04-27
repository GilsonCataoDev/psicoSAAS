export declare class CreateFinancialDto {
    patientId: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    sessionId?: string;
    dueDate?: string;
    method?: string;
}
