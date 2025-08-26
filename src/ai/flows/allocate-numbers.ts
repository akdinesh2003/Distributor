'use server';
/**
 * @fileOverview Allocates numbers to containers based on capacity and distribution numbers from an Excel file.
 *
 * - allocateNumbers - A function that takes the Excel file as input and returns the updated Excel file with allocations.
 * - AllocateNumbersInput - The input type for the allocateNumbers function, which is the Excel file as a data URI.
 * - AllocateNumbersOutput - The return type for the allocateNumbers function, which is the updated Excel file as a data URI.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as XLSX from 'xlsx';

const AllocateNumbersInputSchema = z.object({
  excelFile: z
    .string()
    .describe(
      'The Excel file containing container capacities and numbers to distribute, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
    ),
});
export type AllocateNumbersInput = z.infer<typeof AllocateNumbersInputSchema>;

const AllocateNumbersOutputSchema = z.object({
  updatedExcelFile: z
    .string()
    .describe(
      'The updated Excel file with allocated numbers for each container, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
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
    // 1. Read the Excel file from the data URI
    const fileData = Buffer.from(
      input.excelFile.substring(input.excelFile.indexOf(',') + 1),
      'base64'
    );

    // 2. Parse the Excel file using XLSX
    const workbook = XLSX.read(fileData, {type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // Assuming the Excel file has columns like 'Capacity' and 'ToDistribute'
    // and the goal is to add a column 'Allocated'

    interface DataRow {
      Capacity?: number;
      ToDistribute?: number;
      Allocated?: number;
    }

    const updatedJsonData: DataRow[] = jsonData.map((row: any) => {
      const capacity = Number(row.Capacity) || 0;
      const toDistribute = Number(row.ToDistribute) || 0;
      let allocated = 0;

      // Basic allocation logic: allocate up to the capacity
      if (toDistribute > 0) {
        allocated = Math.min(capacity, toDistribute);
      }

      return {...row, Allocated: allocated};
    });

    // 4. Create a new Excel workbook with the updated data
    const newWorkbook = XLSX.utils.book_new();
    const newSheet = XLSX.utils.json_to_sheet(updatedJsonData);
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Allocations');

    // 5. Convert the new Excel workbook to a data URI
    const newFileData = XLSX.write(newWorkbook, {
      bookType: 'xlsx',
      type: 'base64',
    });
    const updatedExcelFile = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${newFileData}`;

    return {updatedExcelFile};
  }
);
