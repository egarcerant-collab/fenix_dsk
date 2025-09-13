
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from "lucide-react";

interface PdfViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
}

export default function PdfViewer({ isOpen, onClose, pdfUrl }: PdfViewerProps) {
  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = "reporte_indicadores.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
    
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Visualizador de PDF</DialogTitle>
          <DialogDescription>
            Reporte de indicadores generado. Puedes descargarlo si lo deseas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow border rounded-md overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Reporte de Indicadores"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando PDF...</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleDownload} disabled={!pdfUrl}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

