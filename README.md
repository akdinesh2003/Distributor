# Distributor: Intelligent Number Allocation

A sleek and intelligent tool to effortlessly distribute numbers into containers based on defined capacities. Upload your Excel or CSV file, and let the Distributor handle the complex allocation logic for you, providing a perfectly formatted output file in seconds.

---

## ✨ Features

*   **Smart Allocation Engine**: Utilizes a round-robin algorithm to distribute numbers as evenly as possible across all containers.
*   **Capacity-Aware**: Strictly respects the maximum capacity of each container, ensuring no container is overfilled.
*   **Simple File Upload**: A clean drag-and-drop interface for uploading your `.xlsx`, `.xls`, or `.csv` files.
*   **Instant Download**: Get your processed file with the final allocations immediately after processing.

---

## ⚙️ How It Works: File Structure

To use the Distributor, your Excel or CSV file **must** be structured in a specific way:

1.  **Container Capacities (First Row)**: The very first row of your file must contain the maximum numeric capacity for each container. These will be your column headers in the final output file.

2.  **Numbers to Distribute (Last Column)**: The values that you want to allocate must be in the **last column** of your sheet. Each number in this column will be processed and will result in a corresponding row in the output file.

### Example File (`input.xlsx`)

Here is an example of a correctly formatted input file. The values `20, 20, 10...` in the first row are the capacities, and `100, 81, 63...` in the last column are the numbers to be distributed.

| A  | B  | C  | D  | E  | F  | G   |
|----|----|----|----|----|----|-----|
| 20 | 20 | 10 | 30 | 10 | 10 | 100 |
|    |    |    |    |    |    | 81  |
|    |    |    |    |    |    | 63  |
|    |    |    |    |    |    | 44  |
|    |    |    |    |    |    | 21  |
|    |    |    |    |    |    | 10  |

---

## 🚀 How to Use

1.  **Prepare Your File**: Make sure your Excel or CSV file is structured according to the rules above.
2.  **Upload**: Drag and drop your file onto the upload area, or click to select it from your computer.
3.  **Process**: Click the "Process File" button. The application will read your capacities and numbers, and perform the smart allocation.
4.  **Download**: Once processing is complete, a "Download Allocated File" button will appear. Click it to save your new Excel file with the results.

---

## 💻 Tech Stack

*   **Framework**: Next.js
*   **AI/Logic**: Genkit
*   **Styling**: Tailwind CSS & shadcn/ui
*   **File Processing**: `xlsx` library

---

## 👤 Author

*   AK DINESH - https://github.com/akdinesh2003

