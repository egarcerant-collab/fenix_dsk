'use client';

import * as React from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Loader } from './loader';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export function FileUploader({ onFileSelected, isLoading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File | null) => {
    if (file) {
      if (file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        onFileSelected(file);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload a valid .xls or .xlsx file.',
        });
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={cn(
        'relative flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center transition-colors duration-200',
        isDragging && 'border-primary bg-primary/10'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
            <Loader />
            <p className="text-muted-foreground">Analyzing your file... this may take a moment.</p>
        </div>
      ) : (
        <>
          <UploadCloud className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Upload your Excel file</h3>
          <p className="mt-2 text-muted-foreground">
            Drag and drop your .xls or .xlsx file here, or click to browse.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
          <Button onClick={handleClick} className="mt-6">
            Browse Files
          </Button>
        </>
      )}
    </div>
  );
}
