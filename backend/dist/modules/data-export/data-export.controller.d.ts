import { Response } from 'express';
import { DataExportService } from './data-export.service';
export declare class DataExportController {
    private readonly dataExport;
    constructor(dataExport: DataExportService);
    download(req: any, res: Response): Promise<void>;
}
