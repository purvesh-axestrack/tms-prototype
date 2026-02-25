import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAccessorialTypes, getLoadAccessorials, addLoadAccessorial, removeLoadAccessorial } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccessorialEditor({ loadId }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState('');
  const [description, setDescription] = useState('');

  const { data: types = [] } = useQuery({
    queryKey: ['accessorialTypes'],
    queryFn: getAccessorialTypes,
  });

  const { data: accessorials = [] } = useQuery({
    queryKey: ['loadAccessorials', loadId],
    queryFn: () => getLoadAccessorials(loadId),
  });

  const addMutation = useMutation({
    mutationFn: (data) => addLoadAccessorial(loadId, data),
    onSuccess: () => {
      toast.success('Accessorial added');
      queryClient.invalidateQueries({ queryKey: ['loadAccessorials', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      setSelectedType('');
      setQuantity(1);
      setRate('');
      setDescription('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add'),
  });

  const removeMutation = useMutation({
    mutationFn: (accessorialId) => removeLoadAccessorial(loadId, accessorialId),
    onSuccess: () => {
      toast.success('Accessorial removed');
      queryClient.invalidateQueries({ queryKey: ['loadAccessorials', loadId] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
    },
  });

  const handleTypeChange = (typeId) => {
    setSelectedType(typeId);
    const type = types.find(t => t.id === parseInt(typeId));
    if (type) {
      setRate(type.default_amount.toString());
      setDescription(type.name);
    }
  };

  const handleAdd = () => {
    if (!selectedType || !rate) return;
    addMutation.mutate({
      accessorial_type_id: parseInt(selectedType),
      description,
      quantity: parseFloat(quantity),
      rate: parseFloat(rate),
    });
  };

  const total = accessorials.reduce((sum, a) => sum + parseFloat(a.total), 0);

  return (
    <Card className="py-4">
      <CardContent>
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Accessorial Charges</div>

        {accessorials.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {accessorials.map(acc => (
              <div key={acc.id} className="flex items-center justify-between text-sm bg-muted p-2.5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{acc.type_name || acc.description}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {acc.quantity} x ${parseFloat(acc.rate).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold">${parseFloat(acc.total).toFixed(2)}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => removeMutation.mutate(acc.id)}
                    disabled={removeMutation.isPending}
                    className="text-red-400 hover:text-red-600"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end text-sm font-bold pt-2 border-t">
              Accessorials Total: ${total.toFixed(2)}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={selectedType || undefined} onValueChange={(v) => handleTypeChange(v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Add accessorial..." />
              </SelectTrigger>
              <SelectContent>
                {types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.unit})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-16 space-y-1">
            <Label className="text-xs">Qty</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-8 text-sm" min="1" step="0.5" />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Rate</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="h-8 text-sm" step="0.01" />
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedType || !rate || addMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {addMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
