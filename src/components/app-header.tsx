import { Sheet } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-accent text-accent-foreground">
            <Sheet className="w-6 h-6" />
        </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">XLS Detective</h1>
        <p className="text-muted-foreground">
          Upload an Excel file to explore its data.
        </p>
      </div>
    </header>
  );
}
