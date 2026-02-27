import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDrivers, generateSettlements } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SettlementBatchModal({ onClose }) {
  const queryClient = useQueryClient();
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedDriverIds, setSelectedDriverIds] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  const generateMutation = useMutation({
    mutationFn: (data) => generateSettlements(data),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Generated ${data.generated} settlement(s)`);
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to generate settlements');
    },
  });

  const toggleDriver = (driverId) => {
    setSelectedDriverIds(prev =>
      prev.includes(driverId) ? prev.filter(id => id !== driverId) : [...prev, driverId]
    );
  };

  const handleGenerate = () => {
    if (!periodStart || !periodEnd) {
      setError('Date range is required');
      return;
    }
    setError('');
    generateMutation.mutate({
      period_start: periodStart,
      period_end: periodEnd,
      driver_ids: selectedDriverIds.length > 0 ? selectedDriverIds : undefined,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Generate Settlements</DialogTitle>
          <DialogDescription>Calculate driver pay for a date range</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              {result.generated > 0 && (
                <Card className="py-4 bg-green-50 border-green-100">
                  <CardContent>
                    <div className="flex items-center gap-2 font-semibold text-green-700 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      Generated {result.generated} settlement(s)
                    </div>
                    <div className="space-y-1">
                      {result.settlements?.map(s => (
                        <div key={s.id} className="text-sm text-green-600 flex items-center justify-between py-1">
                          <span className="font-medium">{s.settlement_number}</span>
                          <span className="font-bold">${Number(s.net_pay).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {result.generated === 0 && !result.errors?.length && (
                <Card className="py-4 bg-amber-50 border-amber-100">
                  <CardContent>
                    <div className="flex items-center gap-2 font-semibold text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      No settlements generated
                    </div>
                    <p className="text-sm text-amber-600 mt-1">
                      No drivers had eligible completed/invoiced loads in this period. Check that loads are marked COMPLETED with a delivery date in the selected range.
                    </p>
                  </CardContent>
                </Card>
              )}
              {result.skipped_drivers?.length > 0 && (
                <Card className="py-4 bg-slate-50 border-slate-100">
                  <CardContent>
                    <div className="font-semibold text-muted-foreground text-sm mb-2">Skipped ({result.skipped} drivers — no loads in period):</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {result.skipped_drivers.map((s, i) => (
                        <div key={i}>{s.driver_name}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {result.errors?.length > 0 && (
                <Card className="py-4 bg-red-50 border-red-100">
                  <CardContent>
                    <div className="font-semibold text-red-700 mb-2">Errors:</div>
                    {result.errors.map((e, i) => (
                      <div key={i} className="text-sm text-red-600">{e.driver_name}: {e.error}</div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <DialogFooter>
                <Button onClick={onClose} className="theme-brand-bg text-white">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Period Start</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Period End</Label>
                  <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">
                  Drivers <span className="text-muted-foreground font-normal">(leave empty for all)</span>
                </Label>
                <div className="space-y-1.5 max-h-48 overflow-auto">
                  {drivers.map(driver => (
                    <label
                      key={driver.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        selectedDriverIds.includes(driver.id) ? 'theme-brand-selected' : 'border-input hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedDriverIds.includes(driver.id)}
                        onCheckedChange={() => toggleDriver(driver.id)}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{driver.full_name}</span>
                        <span className="text-xs text-muted-foreground">{driver.pay_model} @ ${driver.pay_rate}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!periodStart || !periodEnd || generateMutation.isPending}
                  className="theme-brand-bg text-white"
                >
                  {generateMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : 'Generate Settlements'}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
