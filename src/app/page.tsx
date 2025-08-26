"use client";

import { useState, useRef, type FormEvent, type DragEvent } from "react";
import { allocateNumbers } from "@/ai/flows/allocate-numbers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, FileSpreadsheet, Loader2, Download, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Status = 'idle' | 'processing' | 'success' | 'error';

export default function DistributorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setStatus('idle');
        setMessage(null);
      } else {
        toast({
          variant: 'destructive',
          title: "Invalid File Type",
          description: "Please upload a valid Excel or CSV file (.xlsx, .xls, .csv).",
        });
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files ? event.target.files[0] : null);
  };
  
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFileSelect(event.dataTransfer.files ? event.dataTransfer.files[0] : null);
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setMessage(null);
    setResultUrl(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
          variant: 'destructive',
          title: "No File Selected",
          description: "Please select an Excel or CSV file to process.",
        });
      return;
    }

    setStatus('processing');
    setMessage('Reading your file...');
    setResultUrl(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setMessage('Processing numbers. This may take a moment...');
        const base64File = reader.result as string;
        const result = await allocateNumbers({ excelFile: base64File });
        setResultUrl(result.updatedExcelFile);
        setStatus('success');
        setMessage('Allocation complete! You can now download the updated file.');
      } catch (error) {
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during processing.";
        setMessage(`An error occurred: ${errorMessage}. Please ensure your file has 'Capacity' and 'ToDistribute' columns.`);
        setResultUrl(null);
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setMessage('Failed to read the file. Please try again.');
      setResultUrl(null);
    };
  };

  const statusIcons = {
    processing: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
  };
  
  const statusBorderColor = {
    idle: 'border-border',
    processing: 'border-primary/50',
    success: 'border-green-500/50',
    error: 'border-destructive/50',
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 font-body">
      <Card className="w-full max-w-lg shadow-2xl shadow-primary/5 dark:shadow-primary/10 overflow-hidden">
        <CardHeader className="text-center bg-secondary/50 p-6">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Distributor
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Upload a file with 'Capacity' and 'ToDistribute' columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors duration-300 ease-in-out",
                isDragging ? "border-primary bg-primary/10" : "bg-background hover:border-primary/50 hover:bg-primary/5",
                statusBorderColor[status]
              )}
            >
              <Label htmlFor="file-upload" className="absolute inset-0 cursor-pointer" aria-label="Upload file"></Label>
              <Input
                id="file-upload"
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                disabled={status === 'processing'}
              />
              <div className="flex flex-col items-center justify-center space-y-2 text-center pointer-events-none">
                <UploadCloud className={cn("h-12 w-12", isDragging ? "text-primary" : "text-muted-foreground")} />
                <p className="text-lg text-foreground">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">Supports: .xlsx, .xls, .csv</p>
              </div>
            </div>
            
            {file && (
              <div className="mt-4 flex items-center justify-between rounded-lg border bg-secondary/30 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleReset} type="button" className="h-7 w-7" aria-label="Remove file">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}

            <Button type="submit" disabled={!file || status === 'processing'} className="w-full mt-6 text-base py-6">
              {status === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process File"
              )}
            </Button>
          </form>
        </CardContent>
        
        {status !== 'idle' && (
          <CardFooter className="flex flex-col gap-4 p-6 border-t bg-secondary/20">
            <div className="w-full">
              <Alert variant={status === 'error' ? 'destructive' : 'default'} className="bg-background">
                <div className="flex items-start gap-3">
                    {statusIcons[status]}
                    <div className="flex-1">
                      <AlertTitle className="font-semibold text-base">
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </AlertTitle>
                      <AlertDescription className="text-muted-foreground">
                        {message}
                      </AlertDescription>
                    </div>
                </div>
              </Alert>
            </div>
            
            {status === 'success' && resultUrl && (
              <Button asChild className="w-full text-base py-6">
                <a href={resultUrl} download={`${file?.name.replace(/\.[^/.]+$/, "") || 'allocations'}_processed.xlsx`}>
                  <Download className="mr-2 h-5 w-5" />
                  Download Allocated File
                </a>
              </Button>
            )}

            {(status === 'success' || status === 'error') && (
               <Button variant="outline" onClick={handleReset} className="w-full">
                  Start Over
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </main>
  );
}
