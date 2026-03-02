import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeductionTypes, getDriverDeductions, addDriverDeduction, removeDriverDeduction } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DriverDeductionsEditor({ driverId }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: types = [] } = useQuery({
    queryKey: ['deductionTypes'],
    queryFn: getDeductionTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: deductions = [] } = useQuery({
    queryKey: ['driverDeductions', driverId],
    queryFn: () => getDriverDeductions(driverId),
  });

  const addMutation = useMutation({
    mutationFn: (data) => addDriverDeduction(driverId, data),
    onSuccess: () => {
      toast.success('Deduction added');
      queryClient.invalidateQueries({ queryKey: ['driverDeductions', driverId] });
      setSelectedType('');
      setAmount('');
      setNotes('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add'),
  });

  const removeMutation = useMutation({
    mutationFn: (deductionId) => removeDriverDeduction(driverId, deductionId),
    onSuccess: () => {
      toast.success('Deduction removed');
      queryClient.invalidateQueries({ queryKey: ['driverDeductions', driverId] });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove deduction'),
  });

  const handleTypeChange = (typeId) => {
    setSelectedType(typeId);
    const type = types.find(t => t.id === parseInt(typeId));
    if (type && type.default_amount > 0) {
      setAmount(type.default_amount.toString());
    }
  };

  const handleAdd = () => {
    if (!selectedType || !amount) return;
    addMutation.mutate({
      deduction_type_id: parseInt(selectedType),
      amount: parseFloat(amount),
      notes,
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recurring Deductions</div>

      {deductions.length > 0 && (
        <div className="space-y-1.5">
          {deductions.map(ded => (
            <div key={ded.id} className="flex items-center justify-between text-sm bg-muted p-2.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium">{ded.type_name}</span>
                {ded.notes && <span className="text-muted-foreground truncate">- {ded.notes}</span>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-semibold text-red-600">-${parseFloat(ded.amount).toFixed(2)}</span>
                <Badge variant={ded.is_active ? 'default' : 'secondary'} className={ded.is_active ? 'bg-green-100 text-green-700' : ''}>
                  {ded.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="xs" disabled={removeMutation.isPending} className="text-red-400 hover:text-red-600">Remove</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove deduction?</AlertDialogTitle>
                      <AlertDialogDescription>This will remove the recurring deduction from the driver's settlements.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeMutation.mutate(ded.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Select value={selectedType || undefined} onValueChange={(v) => handleTypeChange(v)}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Add deduction..." />
            </SelectTrigger>
            <SelectContent>
              {types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} {t.is_recurring ? '(Recurring)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-24 space-y-1">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-sm" placeholder="Amount" step="0.01" />
        </div>
        <div className="w-32 space-y-1">
          <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8 text-sm" placeholder="Notes" />
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!selectedType || !amount || addMutation.isPending}
          className="theme-brand-bg text-white"
        >
          {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
        </Button>
      </div>
    </div>
  );
}
