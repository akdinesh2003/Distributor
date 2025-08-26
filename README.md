# Distributor

An intelligent tool to allocate numbers from an Excel file.

This application allows you to upload an Excel file with container capacities and numbers to be distributed. It uses an AI-powered flow to allocate these numbers efficiently and provides a downloadable Excel file with the results.

## How to Use

1.  **Prepare your Excel file**: Ensure your file has at least two columns. The default names are:
    *   `Capacity`: The maximum capacity for each container.
    *   `ToDistribute`: The numbers that need to be distributed among the containers.

2.  **Upload the file**: Drag and drop your Excel file onto the upload area, or click to select it from your computer.

3.  **Process**: Click the "Process File" button. The application will use an AI flow to allocate the numbers to containers, ensuring no capacity is exceeded.

4.  **Download**: Once processing is complete, a download button will appear. Click it to get your updated Excel file with a new `Allocated` column showing the distribution.

## Tech Stack

*   **Framework**: Next.js
*   **AI**: Google Genkit
*   **Styling**: Tailwind CSS & shadcn/ui
*   **Deployment**: Firebase App Hosting
