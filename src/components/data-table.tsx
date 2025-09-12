import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type Row = Record<string, string | number | boolean | null>;

interface DataTableProps {
  headers: string[];
  rows: Row[];
  filters: Record<string, string>;
  onFilterChange: (column: string, value: string) => void;
}

const PREVIEW_ROW_COUNT = 50;

export function DataTable({ headers, rows, filters, onFilterChange }: DataTableProps) {
  const visibleRows = rows.slice(0, PREVIEW_ROW_COUNT);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <ScrollArea className="h-[600px] w-full">
            <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                    {headers.map((header) => (
                    <TableHead key={header} className="p-2">
                        <div className="flex flex-col gap-2">
                        <span className="font-semibold">{header}</span>
                        <Input
                            placeholder={`Filter ${header}...`}
                            value={filters[header] || ''}
                            onChange={(e) => onFilterChange(header, e.target.value)}
                            className="h-8"
                        />
                        </div>
                    </TableHead>
                    ))}
                </TableRow>
                </TableHeader>
                <TableBody>
                {visibleRows.length > 0 ? (
                    visibleRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                        {headers.map((header) => (
                        <TableCell key={`${rowIndex}-${header}`} className="max-w-[250px] truncate">
                            {String(row[header] ?? '')}
                        </TableCell>
                        ))}
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                    <TableCell colSpan={headers.length} className="h-24 text-center">
                        No results found for your filter criteria.
                    </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </ScrollArea>
        <div className="p-4 border-t text-sm text-muted-foreground">
            Showing {Math.min(visibleRows.length, PREVIEW_ROW_COUNT)} of {rows.length} rows.
        </div>
    </div>
  );
}
