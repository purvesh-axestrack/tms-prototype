import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettlementById, approveSettlement, paySettlement, exportSettlementCSV } from '../services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Check, Wallet, Download, DollarSign, MinusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DriverDeductionsEditor from './DriverDeductionsEditor';
import { SETTLEMENT_STATUS_COLORS as STATUS_COLORS } from '@/lib/constants';

export default function SettlementDetail({ settlementId, onClose, onUpdate }) {
  const queryClient = useQueryClient();

  const { data: settlement, isLoading } = useQuery({
    queryKey: ['settlement', settlementId],
    queryFn: () => getSettlementById(settlementId),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveSettlement(settlementId),
    onSuccess: () => {
      toast.success('Settlement approved');
      queryClient.invalidateQueries({ queryKey: ['settlement', settlementId] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      onUpdate?.();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to approve'),
  });

  const payMutation = useMutation({
    mutationFn: () => paySettlement(settlementId),
    onSuccess: () => {
      toast.success('Settlement marked as paid');
      queryClient.invalidateQueries({ queryKey: ['settlement', settlementId] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      onUpdate?.();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to process payment'),
  });

  const handleExport = () => {
    window.open(exportSettlementCSV(settlementId), '_blank');
  };

  if (isLoading) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!settlement) return null;

  const earnings = settlement.line_items?.filter(li => li.line_type === 'LOAD_PAY') || [];
  const deductions = settlement.line_items?.filter(li => li.line_type === 'DEDUCTION') || [];

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="bg-navy-900 text-white p-6">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-3 mb-1">
              <SheetTitle className="text-2xl font-display font-bold text-white">{settlement.settlement_number}</SheetTitle>
              <Badge className={STATUS_COLORS[settlement.status]}>{settlement.status}</Badge>
            </div>
            <SheetDescription className="text-slate-400">
              {settlement.driver_name} &middot; {settlement.period_start} &mdash; {settlement.period_end}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-end gap-2">
            {settlement.status === 'DRAFT' && (
              <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} className="bg-amber-500 hover:bg-amber-600">
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {settlement.status === 'APPROVED' && (
              <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                {payMutation.isPending ? 'Processing...' : 'Mark Paid'}
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="py-4">
              <CardContent>
                <div className="text-xs text-muted-foreground mb-1">Gross Pay</div>
                <div className="text-2xl font-bold">${Number(settlement.gross_pay).toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">{settlement.total_loads} loads &middot; {Number(settlement.total_miles).toLocaleString()} miles</div>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent>
                <div className="text-xs text-muted-foreground mb-1">Deductions</div>
                <div className="text-2xl font-bold text-red-600">-${Number(settlement.total_deductions).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="py-4 bg-green-50">
              <CardContent>
                <div className="text-xs text-muted-foreground mb-1">Net Pay</div>
                <div className="text-2xl font-bold text-green-700">${Number(settlement.net_pay).toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          {settlement.driver && (
            <Card className="py-4">
              <CardContent>
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Driver Details</div>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                      {settlement.driver_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{settlement.driver_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {settlement.driver.pay_model} @ ${settlement.driver.pay_rate}
                      {settlement.driver.minimum_per_mile ? ` (min $${settlement.driver.minimum_per_mile}/mi)` : ''}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border overflow-hidden">
            <div className="bg-green-50 px-4 py-3 text-[11px] font-semibold text-green-700 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Earnings ({earnings.length} loads)
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Miles</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">#{item.load_id}</TableCell>
                    <TableCell className="text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{item.miles}</TableCell>
                    <TableCell className="text-right font-semibold text-green-700">${Number(item.amount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {deductions.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-red-50 px-4 py-3 text-[11px] font-semibold text-red-700 uppercase tracking-wider flex items-center gap-2">
                <MinusCircle className="w-4 h-4" />
                Deductions ({deductions.length})
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{item.description}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">${Number(Math.abs(item.amount)).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {settlement.status === 'DRAFT' && settlement.driver_id && (
            <>
              <Separator />
              <DriverDeductionsEditor driverId={settlement.driver_id} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
