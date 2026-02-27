import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignDriver, getVehicleByDriver, checkDriverAvailability } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Truck } from 'lucide-react';
import { toast } from 'sonner';
import EditableSelect from './EditableSelect';

export default function DispatchCard({ load, drivers, trucks, trailers, saveField, saveFields, isSaving }) {
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const queryClient = useQueryClient();

  const driverOpts = drivers
    .filter(d => d.status !== 'OUT_OF_SERVICE')
    .map(d => ({ value: String(d.id), label: d.full_name }));

  const truckOpts = trucks.map(v => ({ value: String(v.id), label: `${v.unit_number} - ${v.make} ${v.model}` }));
  const trailerOpts = trailers.map(v => ({ value: String(v.id), label: `${v.unit_number} - ${v.make} ${v.model}` }));
  const driver2Opts = drivers
    .filter(d => d.id !== load.driver_id && d.status !== 'OUT_OF_SERVICE')
    .map(d => ({ value: String(d.id), label: d.full_name }));

  const currentDriver = drivers.find(d => d.id === load.driver_id);

  const assignMutation = useMutation({
    mutationFn: ({ driverId, truck_id, trailer_id }) => assignDriver(load.id, driverId, { truck_id, trailer_id }),
    onSuccess: (data) => {
      const autoFilled = [];
      if (data.truck_id && !load.truck_id) autoFilled.push(`Truck ${data.truck_unit || data.truck_id}`);
      if (data.trailer_id && !load.trailer_id) autoFilled.push(`Trailer ${data.trailer_unit || data.trailer_id}`);
      const msg = autoFilled.length > 0
        ? `Driver assigned (auto-filled: ${autoFilled.join(', ')})`
        : 'Driver assigned';
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['loads', load.id] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setConflicts(null);
    },
    onError: (error) => {
      if (error.response?.data?.conflicts) {
        setConflicts(error.response.data.conflicts);
      } else {
        toast.error(error.response?.data?.error || 'Failed to assign driver');
      }
    },
  });

  const handleDriverSelect = async (driverId) => {
    if (!driverId) {
      setConflicts(null);
      return;
    }

    setChecking(true);
    setConflicts(null);

    try {
      // 1. Check availability
      const pickupDate = load.stops?.[0]?.appointment_start;
      const deliveryDate = load.stops?.[load.stops.length - 1]?.appointment_end;
      const availability = await checkDriverAvailability(driverId, pickupDate, deliveryDate);

      if (!availability.available) {
        setConflicts(availability.conflicts);
        setChecking(false);
        return;
      }

      // 2. Get driver's current truck + suggested trailer
      const vehicleInfo = await getVehicleByDriver(driverId);

      // 3. Build payload — never overwrite fields dispatcher already set
      const payload = { driverId };
      if (!load.truck_id && vehicleInfo.truck) {
        payload.truck_id = vehicleInfo.truck.id;
      }
      if (!load.trailer_id && vehicleInfo.suggested_trailer) {
        payload.trailer_id = vehicleInfo.suggested_trailer.id;
      }

      setChecking(false);

      // 4. Atomic assign
      assignMutation.mutate(payload);
    } catch (error) {
      setChecking(false);
      toast.error('Failed to check driver availability');
    }
  };

  const isLoading = checking || assignMutation.isPending;

  return (
    <Card className="py-4">
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dispatch</div>
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>

        <div className="space-y-3 text-sm">
          {/* Driver */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-muted-foreground">Driver</label>
              {load.driver_id ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] font-bold theme-brand-badge">
                      {load.driver_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">{load.driver_name}</div>
                    {currentDriver && (
                      <div className="text-[11px] text-muted-foreground">{currentDriver.phone} &middot; {currentDriver.pay_model}</div>
                    )}
                  </div>
                </div>
              ) : (
                <EditableSelect
                  value={null}
                  displayValue={null}
                  onSave={handleDriverSelect}
                  options={driverOpts}
                  placeholder="Select driver..."
                  allowNone
                />
              )}
            </div>
          </div>

          {/* Conflicts */}
          {conflicts && conflicts.length > 0 && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-red-800 mb-1">Conflicts:</div>
                  {conflicts.map(c => (
                    <div key={c.id} className="text-xs text-red-700">
                      Load #{c.id} {c.reference_number && `(${c.reference_number})`} &mdash; {c.pickup} &rarr; {c.delivery}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Truck */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Truck</label>
            <EditableSelect
              value={load.truck_id ? String(load.truck_id) : null}
              displayValue={load.truck_unit ? `${load.truck_unit} ${load.truck_info ? `(${load.truck_info})` : ''}` : null}
              onSave={(v) => saveField('truck_id', v)}
              options={truckOpts}
              placeholder="None"
              allowNone
            />
          </div>

          {/* Trailer */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Trailer</label>
            <EditableSelect
              value={load.trailer_id ? String(load.trailer_id) : null}
              displayValue={load.trailer_unit ? `${load.trailer_unit} ${load.trailer_info ? `(${load.trailer_info})` : ''}` : null}
              onSave={(v) => saveField('trailer_id', v)}
              options={trailerOpts}
              placeholder="None"
              allowNone
            />
          </div>

          {/* Team Driver */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Team Driver</label>
            <EditableSelect
              value={load.driver2_id ? String(load.driver2_id) : null}
              displayValue={load.driver2_name}
              onSave={(v) => saveField('driver2_id', v)}
              options={driver2Opts}
              placeholder="None"
              allowNone
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
