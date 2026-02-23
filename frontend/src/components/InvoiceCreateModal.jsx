import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, getUninvoicedLoads, createInvoice } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceCreateModal({ onClose }) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [selectedLoadIds, setSelectedLoadIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: uninvoicedLoads = [], isLoading: loadsLoading } = useQuery({
    queryKey: ['uninvoicedLoads', customerId],
    queryFn: () => getUninvoicedLoads(customerId ? { customer_id: customerId } : {}),
    enabled: !!customerId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => createInvoice(data),
    onSuccess: () => {
      toast.success('Invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create invoice');
    },
  });

  const toggleLoad = (loadId) => {
    setSelectedLoadIds(prev =>
      prev.includes(loadId) ? prev.filter(id => id !== loadId) : [...prev, loadId]
    );
  };

  const selectAll = () => {
    if (selectedLoadIds.length === uninvoicedLoads.length) {
      setSelectedLoadIds([]);
    } else {
      setSelectedLoadIds(uninvoicedLoads.map(l => l.id));
    }
  };

  const selectedLoads = uninvoicedLoads.filter(l => selectedLoadIds.includes(l.id));
  const previewTotal = selectedLoads.reduce((sum, l) => sum + parseFloat(l.total_amount || l.rate_amount), 0);

  const handleSubmit = () => {
    if (!customerId || selectedLoadIds.length === 0) {
      setError('Select a customer and at least one load');
      return;
    }
    createMutation.mutate({ customer_id: customerId, load_ids: selectedLoadIds, notes });
  };

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Create Invoice</DialogTitle>
          <DialogDescription>Select customer and delivered loads to invoice</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Customer</Label>
            <select
              value={customerId}
              onChange={(e) => { setCustomerId(e.target.value); setSelectedLoadIds([]); }}
              className={selectClass}
            >
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          {customerId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Delivered Loads ({uninvoicedLoads.length} available)</Label>
                {uninvoicedLoads.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-amber-600 hover:text-amber-700">
                    {selectedLoadIds.length === uninvoicedLoads.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              {loadsLoading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : uninvoicedLoads.length === 0 ? (
                <Card className="py-8">
                  <CardContent className="flex flex-col items-center">
                    <Package className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <span className="text-sm text-muted-foreground">No uninvoiced delivered loads for this customer</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-auto">
                  {uninvoicedLoads.map(load => (
                    <label
                      key={load.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedLoadIds.includes(load.id) ? 'border-amber-400 bg-amber-50' : 'border-input hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedLoadIds.includes(load.id)}
                        onCheckedChange={() => toggleLoad(load.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">#{load.id} &middot; {load.reference_number}</span>
                          <span className="font-bold text-green-700 text-sm">${Number(load.total_amount || load.rate_amount).toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {load.pickup_city}, {load.pickup_state} &rarr; {load.delivery_city}, {load.delivery_state}
                          {load.delivered_at && ` | Delivered ${new Date(load.delivered_at).toLocaleDateString()}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedLoadIds.length > 0 && (
            <Card className="py-4 bg-amber-50 border-amber-100">
              <CardContent className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{selectedLoadIds.length} load(s) selected</span>
                <span className="text-lg font-bold">Total: ${previewTotal.toFixed(2)}</span>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional invoice notes..."
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!customerId || selectedLoadIds.length === 0 || createMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {createMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
