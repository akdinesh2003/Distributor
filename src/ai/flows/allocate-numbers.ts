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

    // 2. Parse the file using XLSX, converting to an array of arrays
    const workbook = XLSX.read(fileData, {type: 'buffer'});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, {header: 1});

    if (data.length < 2) {
      throw new Error(
        'The file must contain at least two rows: one for headers and one for data.'
      );
    }

    // 3. Extract headers and capacities from the first two rows.
    const headers = data[0].map(h => String(h));
    const capacityData = data[1];

    if (headers.length < 2) {
        throw new Error('File must have at least two columns: one for capacity and one for the number to distribute.');
    }

    const toDistributeColumn = headers[headers.length - 1];
    const containerColumns = headers.slice(0, -1);
    
    const capacities: {[key: string]: number} = {};
    containerColumns.forEach((header, index) => {
        const capacity = Number(capacityData[index]);
        if (!isNaN(capacity)) {
            capacities[header] = capacity;
        } else {
            capacities[header] = 0; // Default capacity to 0 if not a valid number
        }
    });


    // 4. Process the data rows starting from the second row (index 1)
    const dataRows = data.slice(1);
    const updatedData = dataRows.map(row => {
      let numberToDistribute = Number(
        row[headers.indexOf(toDistributeColumn)]
      );
      if (isNaN(numberToDistribute)) return row.reduce((acc, val, idx) => ({...acc, [headers[idx]]: val}), {});

      const newRow: any = {};
      headers.forEach(header => (newRow[header] = '')); // Initialize row with empty strings
      newRow[toDistributeColumn] = numberToDistribute;
      
      // Initialize allocated values to 0 for container columns
      containerColumns.forEach(col => {
        newRow[col] = 0;
      });

      // Distribute the number using round-robin
      let remainingToDistribute = numberToDistribute;
      
      while (remainingToDistribute > 0) {
        let distributedInCycle = false;
        for (const col of containerColumns) {
          if (remainingToDistribute <= 0) break;
          
          const capacity = capacities[col] || 0;
          if (newRow[col] < capacity) {
            newRow[col]++;
            remainingToDistribute--;
            distributedInCycle = true;
          }
        }
        // If a full cycle completes with no distribution, break to prevent infinite loops
        if (!distributedInCycle) {
          break;
        }
      }

      return newRow;
    });

    // Add headers back for the new sheet
    const finalData = [
      headers,
      ...updatedData.map(row =>
        headers.map(h => (row[h] !== undefined ? row[h] : ''))
      ),
    ];

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
