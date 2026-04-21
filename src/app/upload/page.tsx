"use client";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileJson, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
import { listFiles } from '@/ai/actions';
import { CheckCircle2 } from 'lucide-react';

export default function UploadPage() {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [xlsxLoaded, setXlsxLoaded] = useState(false);
    const [convertedFiles, setConvertedFiles] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchConvertedFiles = async () => {
        try {
            const files = await listFiles();
            setConvertedFiles(files.filter(f => f.toLowerCase().endsWith('.json')));
        } catch (error) {
            console.error("Error fetching converted files:", error);
        }
    };

    useEffect(() => {
        fetchConvertedFiles();
        const interval = setInterval(() => {
          if (typeof window !== 'undefined' && (window as any).XLSX) {
            setXlsxLoaded(true);
            clearInterval(interval);
          }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUploadAndConvert = async () => {
        if (!file) {
            toast({ title: 'Error', description: 'Seleccione un archivo primero.', variant: 'destructive' });
            return;
        }

        if (!xlsxLoaded) {
            toast({ title: 'Error', description: 'La librería de Excel aún no ha cargado. Espere un momento.', variant: 'destructive' });
            return;
        }

        setIsConverting(true);
        toast({ title: 'Convirtiendo...', description: 'Leyendo archivo Excel y convirtiendo a JSON. Por favor espere.' });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const XLSX = (window as any).XLSX;
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    // Obtenemos el JSON conservando el formato de array de arrays (header=1)
                    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

                    const monthName = file.name.replace(/\.xlsx$/i, '').toUpperCase();
                    const targetFilename = `${year}/${monthName}.json`;

                    toast({ title: 'Subiendo...', description: `Enviando el JSON optimizado (${targetFilename}) al servidor.` });

                    const response = await fetch('/api/upload-json', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: targetFilename, data: json }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error al subir el archivo JSON.');
                    }

                    setSuccessMessage(`El archivo ${targetFilename} fue guardado correctamente en formato JSON.`);
                    toast({ title: '¡Éxito!', description: `El archivo ${targetFilename} fue guardado correctamente en formato JSON.` });
                    setFile(null);
                    await fetchConvertedFiles();
                } catch (error: any) {
                    console.error(error);
                    toast({ title: 'Error', description: error.message, variant: 'destructive' });
                } finally {
                    setIsConverting(false);
                }
            };
            reader.onerror = () => {
                toast({ title: 'Error', description: 'No se pudo leer el archivo.', variant: 'destructive' });
                setIsConverting(false);
            };
            reader.readAsArrayBuffer(file);
        } catch (error: any) {
             console.error(error);
             toast({ title: 'Error', description: error.message, variant: 'destructive' });
             setIsConverting(false);
        }
    };

    return (
        <>
            <Script
                src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
                strategy="lazyOnload"
                onLoad={() => setXlsxLoaded(true)}
            />
            <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
                <Link href="/">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
                    </Button>
                </Link>
                
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileJson className="h-6 w-6 text-primary"/> Conversor de Excel a JSON</CardTitle>
                            <CardDescription>Sube un archivo Excel (.xlsx) pesado para convertirlo automáticamente en un JSON super ligero. Se guardará directamente en la carpeta del sistema para ser usado inmediatamente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="year">Año correspondiente al archivo</Label>
                                <Input id="year" type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="Ej: 2026" />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="file">Archivo Excel (Ej: ENERO.xlsx)</Label>
                                <Input id="file" type="file" accept=".xlsx" onChange={handleFileChange} />
                                <p className="text-sm text-muted-foreground">El nombre del archivo original (sin extensión) se usará como nombre del mes para el nuevo JSON.</p>
                            </div>

                            <Button onClick={handleUploadAndConvert} disabled={!file || isConverting || !xlsxLoaded} className="w-full">
                                {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {isConverting ? 'Convirtiendo y Subiendo...' : 'Convertir a JSON y Subir'}
                            </Button>

                            {successMessage && (
                                <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-md flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span>{successMessage}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="mt-8">
                        <CardHeader>
                            <CardTitle>Archivos JSON Convertidos</CardTitle>
                            <CardDescription>Estos son los archivos que ya están optimizados y listos para usarse instantáneamente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {convertedFiles.length > 0 ? (
                                <ul className="list-disc pl-5 space-y-1">
                                    {convertedFiles.map(f => (
                                        <li key={f} className="text-sm font-medium text-primary">{f}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">Aún no hay archivos JSON convertidos. ¡Sube uno arriba!</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
