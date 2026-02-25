import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDrivers, assignDriver, checkDriverAvailability } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function DriverAssignModal({ load, onClose, onAssigned }) {
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  const assignMutation = useMutation({
    mutationFn: (driverId) => assignDriver(load.id, driverId),
    onSuccess: () => {
      toast.success('Driver assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onAssigned();
    },
    onError: (error) => {
      if (error.response?.data?.conflicts) {
        setConflicts(error.response.data.conflicts);
      } else {
        toast.error(error.response?.data?.error || 'Failed to assign driver');
      }
    },
  });

  const handleCheckAvailability = async (driverId) => {
    if (!driverId) { setConflicts(null); return; }
    if (!load.stops?.length) return;
    setChecking(true);
    setConflicts(null);
    try {
      const pickupDate = load.stops[0]?.appointment_start;
      const deliveryDate = load.stops[load.stops.length - 1]?.appointment_end;
      const result = await checkDriverAvailability(driverId, pickupDate, deliveryDate);
      if (!result.available) {
        setConflicts(result.conflicts);
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleAssign = () => {
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }
    setShowConfirm(true);
  };

  const availableDrivers = drivers.filter(d => d.status !== 'OUT_OF_SERVICE');

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Assign Driver to Load #{load.id}</DialogTitle>
            <DialogDescription>Select a driver and check availability</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="py-3">
              <CardContent className="text-sm">
                <div className="font-medium">
                  {load.pickup_city}, {load.pickup_state} &rarr; {load.delivery_city}, {load.delivery_state}
                </div>
                {load.stops?.length > 0 && (
                  <div className="text-muted-foreground mt-1">
                    {load.stops[0]?.appointment_start ? new Date(load.stops[0].appointment_start).toLocaleDateString() : 'TBD'}
                    {' - '}
                    {load.stops[load.stops.length - 1]?.appointment_end ? new Date(load.stops[load.stops.length - 1].appointment_end).toLocaleDateString() : 'TBD'}
                  </div>
                )}
              </CardContent>
            </Card>

            <div>
              <Label className="mb-2 block">Select Driver</Label>
              <Select
                value={selectedDriverId || undefined}
                onValueChange={(v) => {
                  setSelectedDriverId(v);
                  handleCheckAvailability(v);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="-- Select a driver --" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map(driver => (
                    <SelectItem key={driver.id} value={String(driver.id)}>
                      {driver.full_name} ({driver.pay_model} - {driver.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {checking && (
              <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking driver availability...
              </div>
            )}

            {conflicts && conflicts.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-red-800 mb-2">Driver has conflicting loads:</div>
                    <div className="space-y-2">
                      {conflicts.map(conflict => (
                        <Card key={conflict.id} className="py-2 border-red-200">
                          <CardContent className="text-sm">
                            <div className="font-medium">Load #{conflict.id} - {conflict.reference_number}</div>
                            <div className="text-muted-foreground">{conflict.pickup} &rarr; {conflict.delivery}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(conflict.pickup_date).toLocaleDateString()} - {new Date(conflict.delivery_date).toLocaleDateString()}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedDriverId && !conflicts?.length && !checking && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Driver is available for this load
              </div>
            )}

            {selectedDriverId && (() => {
              const driver = drivers.find(d => String(d.id) === selectedDriverId);
              return driver ? (
                <Card className="py-4">
                  <CardContent>
                    <div className="text-sm font-semibold text-muted-foreground mb-2">Selected Driver Details</div>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{driver.full_name}</span></div>
                      <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{driver.phone}</span></div>
                      <div><span className="text-muted-foreground">Pay Model:</span> <span className="font-medium">{driver.pay_model} - ${driver.pay_rate}</span></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary">{driver.status}</Badge></div>
                      <div><span className="text-muted-foreground">Active Loads:</span> <span className="font-medium">{driver.stats?.active_loads || 0}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedDriverId || conflicts?.length > 0 || assignMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {assignMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</>
              ) : 'Assign Driver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Assignment</AlertDialogTitle>
            <AlertDialogDescription>Assign this load to the selected driver?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              assignMutation.mutate(selectedDriverId);
              setShowConfirm(false);
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
