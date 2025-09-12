'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { AppHeader } from '@/components/app-header';
import { FileUploader } from '@/components/file-uploader';
import { DataTable } from '@/components/data-table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { FileJson, RotateCcw } from 'lucide-react';

type Row = Record<string, string | number | boolean | null>;

export default function Home() {
  const [fileData, setFileData] = React.useState<{ headers: string[]; rows: Row[] } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleFileParse = async (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file.');
        
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length < 2) {
          throw new Error('No data found in the spreadsheet or file is empty.');
        }

        const headers = jsonData[0].map(String);
        const rows: Row[] = jsonData.slice(1).map((rowArray) => {
          const row: Row = {};
          headers.forEach((header, index) => {
            row[header] = rowArray[index] ?? null;
          });
          return row;
        });

        setFileData({ headers, rows });
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({
          variant: 'destructive',
          title: 'Error processing file',
          description: errorMessage,
        });
        handleReset();
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "File Reading Error",
            description: "Could not read the selected file."
        });
        setIsLoading(false);
    }

    reader.readAsArrayBuffer(file);
  };
  
  const handleFilterChange = React.useCallback((column: string, value: string) => {
    setFilters((prev) => ({ ...prev, [column]: value }));
  }, []);

  const filteredRows = React.useMemo(() => {
    if (!fileData) return [];
    return fileData.rows.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const rowValue = String(row[key] ?? '').toLowerCase();
        return rowValue.includes(value.toLowerCase());
      });
    });
  }, [fileData, filters]);

  const handleExport = () => {
    const jsonString = JSON.stringify(filteredRows, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
        title: "Export Successful",
        description: "Your filtered data has been exported as JSON."
    });
  };

  const handleReset = () => {
    setFileData(null);
    setFilters({});
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <AppHeader />

      {!fileData && (
        <div className="mt-8 animate-in fade-in-50 duration-500">
          <FileUploader onFileSelected={handleFileParse} isLoading={isLoading} />
        </div>
      )}

      {fileData && (
        <div className="mt-8 space-y-8 animate-in fade-in-50 duration-500">
          <div className="flex flex-wrap gap-4 items-center justify-between">
             <h2 className="text-2xl font-semibold tracking-tight">Data Preview & Analysis</h2>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4" />New File</Button>
                <Button onClick={handleExport}><FileJson className="mr-2 h-4 w-4" />Export JSON</Button>
            </div>
          </div>

          <section>
             <h3 className="text-xl font-semibold mb-4">Data Explorer</h3>
             <DataTable
                headers={fileData.headers}
                rows={filteredRows}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
          </section>
        </div>
      )}
    </div>
  );
}
