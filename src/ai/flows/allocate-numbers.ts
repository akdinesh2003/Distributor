'use server';
/**
 * @fileOverview Allocates numbers to containers based on capacity and distribution numbers from an Excel or CSV file.
 *
 * - allocateNumbers - A function that takes the file as input and returns the updated Excel file with allocations.
 * - AllocateNumbersInput - The input type for the allocateNumbers function, which is the file as a data URI.
 * - AllocateNumbersOutput - The return type for the allocateNumbers function, which is the updated Excel file as a data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as XLSX from 'xlsx';

const AllocateNumbersInputSchema = z.object({
  excelFile: z
    .string()
    .describe(
      'The Excel or CSV file containing container capacities and numbers to distribute, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type AllocateNumbersInput = z.infer<typeof AllocateNumbersInputSchema>;

const AllocateNumbersOutputSchema = z.object({
  updatedExcelFile: z
    .string()
    .describe(
      'The updated Excel file with allocated numbers for each container, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type AllocateNumbersOutput = z.infer<typeof AllocateNumbersOutputSchema>;

export async function allocateNumbers(input: AllocateNumbersInput): Promise<AllocateNumbersOutput> {
  return allocateNumbersFlow(input);
}

const allocateNumbersFlow = ai.defineFlow(
  {
    name: 'allocateNumbersFlow',
    inputSchema: AllocateNumbersInputSchema,
    outputSchema: AllocateNumbersOutputSchema,
  },
  async input => {
    // 1. Read the file from the data URI
    const fileData = Buffer.from(
      input.excelFile.substring(input.excelFile.indexOf(',') + 1),
      'base64'
    );

    // 2. Parse the file using XLSX, converting to an array of arrays
    const workbook = XLSX.read(fileData, {type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 2) {
      throw new Error("The file must contain at least two rows: one for headers/capacities and one for data.");
    }
    
    // 3. Extract capacities and headers
    const headers = data[0];
    const capacities: {[key: string]: number} = {};
    const capacityRow = data[0]; // Capacities are in the first row
    
    headers.forEach((header, index) => {
        const capacity = Number(capacityRow[index]);
        if (!isNaN(capacity)) {
            capacities[header] = capacity;
        }
    });

    const toDistributeColumn = headers[headers.length - 1];
    const containerColumns = headers.slice(0, -1);

    // 4. Process the data rows
    const dataRows = data.slice(1);
    const updatedData = dataRows.map(row => {
        let numberToDistribute = Number(row[headers.indexOf(toDistributeColumn)]);
        if (isNaN(numberToDistribute)) return row; // Skip if not a valid number

        const newRow: any = {};
        headers.forEach(header => newRow[header] = ""); // Initialize row
        newRow[toDistributeColumn] = numberToDistribute;

        // Distribute the number
        containerColumns.forEach(col => {
            const capacity = capacities[col] || 0;
            const valueToAllocate = Math.min(numberToDistribute, capacity);
            newRow[col] = valueToAllocate;
            numberToDistribute -= valueToAllocate;
        });

        return newRow;
    });

    // Add headers back for the new sheet
    const finalData = [headers, ...updatedData.map(row => headers.map(h => row[h] !== undefined ? row[h] : ""))];

    // 5. Create a new Excel workbook with the updated data
    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.aoa_to_sheet(finalData);
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Allocations');

    // 6. Convert the new Excel workbook to a data URI
    const newFileData = XLSX.write(newWorkbook, {
      bookType: 'xlsx',
      type: 'base64',
    });
    const updatedExcelFile = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${newFileData}`;

    return {updatedExcelFile};
  }
);
