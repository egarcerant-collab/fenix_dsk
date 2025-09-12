import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryCardProps {
  title: string;
  content: string;
}

export function SummaryCard({ title, content }: SummaryCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow whitespace-pre-wrap text-sm">
        {content}
      </CardContent>
    </Card>
  );
}
