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
      "The Excel or CSV file containing container capacities and numbers to distribute, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
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

    // 2. Parse the file using XLSX, converting to an array of objects
    const workbook = XLSX.read(fileData, {type: 'buffer'});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);
    
    if (data.length < 1) {
      throw new Error('The file must contain at least one row of data.');
    }

    // 3. Extract capacities and numbers to distribute
    const capacities: number[] = data.map(row => row.Capacity).filter(c => c !== undefined && !isNaN(c));
    const numbersToDistribute: number[] = data.map(row => row.ToDistribute).filter(n => n !== undefined && !isNaN(n));
    
    if (capacities.length === 0 || numbersToDistribute.length === 0) {
        throw new Error("File must contain 'Capacity' and 'ToDistribute' columns with numeric data.");
    }
    
    // 4. Perform the allocation
    const allocationResults: any[] = [];
    for (const number of numbersToDistribute) {
        const allocatedRow: {[key: string]: number} = {};
        capacities.forEach((_, index) => {
            allocatedRow[`Container ${index + 1}`] = 0;
        });

        let remainingToDistribute = number;
        while(remainingToDistribute > 0) {
            let distributedInCycle = false;
            for (let i = 0; i < capacities.length; i++) {
                if (remainingToDistribute <= 0) break;

                if (allocatedRow[`Container ${i + 1}`] < capacities[i]) {
                    allocatedRow[`Container ${i + 1}`]++;
                    remainingToDistribute--;
                    distributedInCycle = true;
                }
            }
            if (!distributedInCycle) break; // Avoid infinite loops if all capacities are filled
        }
        allocationResults.push(allocatedRow);
    }
    
    // 5. Create a new Excel workbook with the updated data
    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.json_to_sheet(allocationResults);
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
