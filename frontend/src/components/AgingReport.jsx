import { useQuery } from '@tanstack/react-query';
import { getAgingReport, getApiBaseUrl } from '../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, CheckCircle } from 'lucide-react';

export default function AgingReport() {
  const { data: aging = [], isLoading } = useQuery({
    queryKey: ['agingReport'],
    queryFn: getAgingReport,
  });

  if (isLoading) {
    return (
      <Card className="py-6">
        <CardContent className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (aging.length === 0) {
    return (
      <Card className="py-8">
        <CardContent className="flex flex-col items-center">
          <CheckCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <span className="text-sm text-muted-foreground">No outstanding invoices</span>
        </CardContent>
      </Card>
    );
  }

  const totals = aging.reduce((acc, row) => ({
    current: acc.current + (row.current || 0),
    days_1_30: acc.days_1_30 + (row.days_1_30 || 0),
    days_31_60: acc.days_31_60 + (row.days_31_60 || 0),
    days_61_90: acc.days_61_90 + (row.days_61_90 || 0),
    days_90_plus: acc.days_90_plus + (row.days_90_plus || 0),
    total: acc.total + (row.total || 0),
  }), { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 });

  const fmt = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Aging Report
        </div>
        <a
          href={`${getApiBaseUrl()}/invoices/aging?format=csv&token=${localStorage.getItem('access_token')}`}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="ghost" size="xs" className="text-amber-600 hover:text-amber-700">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </a>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">1-30 Days</TableHead>
            <TableHead className="text-right">31-60 Days</TableHead>
            <TableHead className="text-right">61-90 Days</TableHead>
            <TableHead className="text-right">90+ Days</TableHead>
            <TableHead className="text-right font-bold">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aging.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{row.customer_name}</TableCell>
              <TableCell className="text-right text-muted-foreground">{fmt(row.current)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{fmt(row.days_1_30)}</TableCell>
              <TableCell className="text-right text-yellow-600 font-medium">{fmt(row.days_31_60)}</TableCell>
              <TableCell className="text-right text-orange-600 font-medium">{fmt(row.days_61_90)}</TableCell>
              <TableCell className="text-right text-red-600 font-medium">{fmt(row.days_90_plus)}</TableCell>
              <TableCell className="text-right font-bold">{fmt(row.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.current)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.days_1_30)}</TableCell>
            <TableCell className="text-right font-bold text-yellow-600">{fmt(totals.days_31_60)}</TableCell>
            <TableCell className="text-right font-bold text-orange-600">{fmt(totals.days_61_90)}</TableCell>
            <TableCell className="text-right font-bold text-red-600">{fmt(totals.days_90_plus)}</TableCell>
            <TableCell className="text-right font-bold">{fmt(totals.total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
