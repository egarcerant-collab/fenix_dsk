import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  className?: string;
}

export function Loader({ className }: LoaderProps) {
  return (
    <Loader2 className={cn('h-8 w-8 animate-spin text-primary', className)} />
  );
}
