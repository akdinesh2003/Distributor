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
      "The Excel or CSV file containing container capacities and numbers to distribute, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
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
    const workbook = XLSX.read(fileData, {type: 'buffer'});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error('The file must contain at least two rows of data: one for capacities and at least one for numbers to distribute.');
    }

    // 3. Extract capacities and numbers to distribute
    const capacities: number[] = data[0].slice(0, -1).filter(c => typeof c === 'number');
    const numbersToDistribute: number[] = data.slice(1).map(row => row[row.length - 1]).filter(n => typeof n === 'number');

    if (capacities.length === 0) {
      throw new Error("The first row must contain numeric capacity values.");
    }
    if (numbersToDistribute.length === 0) {
      throw new Error("No numeric values to distribute found in the last column of the subsequent rows.");
    }
    
    // 4. Perform the allocation for each number
    const allocationResults: any[] = [];
    for (const numberToDistribute of numbersToDistribute) {
        const currentAllocation = new Array(capacities.length).fill(0);

        let remainingToDistribute = numberToDistribute;
        while (remainingToDistribute > 0) {
            let distributedInCycle = false;
            for (let i = 0; i < capacities.length; i++) {
                if (remainingToDistribute <= 0) break;

                if (currentAllocation[i] < capacities[i]) {
                    currentAllocation[i]++;
                    remainingToDistribute--;
                    distributedInCycle = true;
                }
            }
            if (!distributedInCycle) break; 
        }
        
        const allocatedRow: {[key: string]: number} = {};
        capacities.forEach((_, index) => {
            allocatedRow[`Container ${index + 1}`] = currentAllocation[index];
        });
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
