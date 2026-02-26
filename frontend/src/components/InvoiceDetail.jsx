import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoiceById, updateInvoiceStatus, recordInvoicePayment, exportInvoiceCSV, deleteInvoice } from '../services/api';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, Download, CreditCard, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { INVOICE_STATUS_COLORS as STATUS_COLORS, INVOICE_LINE_TYPE_COLORS as LINE_TYPE_COLORS } from '@/lib/constants';

export default function InvoiceDetail({ invoiceId, onClose, onUpdate }) {
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoiceById(invoiceId),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateInvoiceStatus(invoiceId, status),
    onSuccess: () => {
      toast.success('Invoice status updated');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const paymentMutation = useMutation({
    mutationFn: (amount) => recordInvoicePayment(invoiceId, { amount }),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setShowPayment(false);
      setPaymentAmount('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Payment failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInvoice(invoiceId),
    onSuccess: () => {
      toast.success('Invoice deleted');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete invoice'),
  });

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    paymentMutation.mutate(amount);
  };

  const handleExport = () => {
    window.open(exportInvoiceCSV(invoiceId), '_blank');
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

  if (!invoice) return null;

  return (
    <>
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="theme-sidebar text-white p-6">
            <SheetHeader className="p-0">
              <div className="flex items-center gap-3 mb-1">
                <SheetTitle className="text-2xl font-display font-bold text-white">{invoice.invoice_number}</SheetTitle>
                <Badge className={STATUS_COLORS[invoice.status]}>{invoice.status}</Badge>
              </div>
              <SheetDescription className="theme-sidebar-text">{invoice.customer_name}</SheetDescription>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Issued: {invoice.issue_date}
                </div>
                <Separator orientation="vertical" className="h-4" />
                <span>Due: {invoice.due_date}</span>
              </div>
              <div className="flex gap-2">
                {invoice.available_transitions?.map(t => (
                  <Button key={t} size="sm" onClick={() => setConfirmStatus(t)} disabled={statusMutation.isPending} className="theme-brand-bg text-white">
                    {statusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    {t}
                  </Button>
                ))}
                {['SENT', 'OVERDUE'].includes(invoice.status) && (
                  <Button size="sm" onClick={() => setShowPayment(!showPayment)} className="bg-green-600 hover:bg-green-700">
                    <CreditCard className="w-3.5 h-3.5" /> Record Payment
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleExport}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
                {invoice.status === 'DRAFT' && (
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                )}
              </div>
            </div>

            {showPayment && (
              <Card className="py-4 bg-green-50 border-green-100">
                <CardContent className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label>Payment Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`Balance: $${Number(invoice.balance_due).toFixed(2)}`}
                      autoFocus
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPaymentAmount(String(invoice.balance_due))}>
                    Pay Full
                  </Button>
                  <Button size="sm" onClick={handlePayment} disabled={!paymentAmount || paymentMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    {paymentMutation.isPending ? 'Processing...' : 'Apply Payment'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-4 gap-3">
              <Card className="py-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Subtotal</div>
                  <div className="text-xl font-bold">${Number(invoice.subtotal).toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className="py-4">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">FSC + Accessorials</div>
                  <div className="text-xl font-bold">
                    ${(parseFloat(invoice.fuel_surcharge_total) + parseFloat(invoice.accessorial_total)).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card className="py-4 bg-muted">
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Total</div>
                  <div className="text-xl font-bold">${Number(invoice.total_amount).toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card className={`py-4 ${parseFloat(invoice.balance_due) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Balance Due</div>
                  <div className={`text-xl font-bold ${parseFloat(invoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${Number(invoice.balance_due).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-lg border">
              <div className="bg-muted px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Line Items ({invoice.line_items?.length || 0})
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.line_items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={LINE_TYPE_COLORS[item.line_type] || 'bg-slate-100 text-slate-600'}>
                          {item.line_type.replaceAll('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.description}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">${Number(item.unit_price).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">${Number(item.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {invoice.notes && (
              <Card className="py-4">
                <CardContent>
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</div>
                  <div className="text-sm text-muted-foreground">{invoice.notes}</div>
                </CardContent>
              </Card>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice {invoice.invoice_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invoice and unlink its loads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmStatus} onOpenChange={(open) => !open && setConfirmStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>Change invoice status to {confirmStatus}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { statusMutation.mutate(confirmStatus); setConfirmStatus(null); }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
