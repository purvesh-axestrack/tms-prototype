import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignDriver, getVehicleByDriver, checkDriverAvailability } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { EditableCombobox } from '@/components/ui/combobox';

export default function DispatchCard({ load, drivers, trucks, trailers, carriers, saveField, saveFields, isSaving, disabled = false }) {
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const queryClient = useQueryClient();

  const isBrokered = !!load.carrier_id;

  // In brokered mode, filter drivers/trucks to that carrier
  const filteredDrivers = useMemo(() => {
    const base = drivers.filter(d => d.status !== 'OUT_OF_SERVICE');
    if (isBrokered) return base.filter(d => Number(d.carrier_id) === Number(load.carrier_id));
    return base;
  }, [drivers, isBrokered, load.carrier_id]);

  const filteredTrucks = useMemo(() => {
    if (isBrokered) return trucks.filter(v => Number(v.carrier_id) === Number(load.carrier_id));
    return trucks;
  }, [trucks, isBrokered, load.carrier_id]);

  const driverOpts = filteredDrivers.map(d => ({ value: String(d.id), label: d.full_name }));
  const truckOpts = filteredTrucks.map(v => ({ value: String(v.id), label: `${v.unit_number} - ${v.make} ${v.model}` }));
  const trailerOpts = trailers.map(v => ({ value: String(v.id), label: `${v.unit_number} - ${v.make} ${v.model}` }));
  const driver2Opts = filteredDrivers
    .filter(d => d.id !== load.driver_id)
    .map(d => ({ value: String(d.id), label: d.full_name }));

  const carrierOpts = carriers
    ?.filter(c => c.status !== 'INACTIVE')
    .map(c => ({ value: String(c.id), label: c.company_name })) || [];

  const currentDriver = drivers.find(d => d.id === load.driver_id);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['loads'] });
    queryClient.invalidateQueries({ queryKey: ['loads', load.id] });
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ driverId, truck_id, trailer_id, driver2_id }) =>
      assignDriver(load.id, driverId, { truck_id, trailer_id, driver2_id }),
    onSuccess: (data) => {
      const autoFilled = [];
      if (data.truck_id && !load.truck_id) autoFilled.push(`Truck ${data.truck_unit || data.truck_id}`);
      if (data.trailer_id && !load.trailer_id) autoFilled.push(`Trailer ${data.trailer_unit || data.trailer_id}`);
      if (data.driver2_id && !load.driver2_id) autoFilled.push(`Team ${data.driver2_name || data.driver2_id}`);
      const msg = autoFilled.length > 0
        ? `Driver assigned (auto-filled: ${autoFilled.join(', ')})`
        : 'Driver assigned';
      toast.success(msg);
      invalidate();
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

  // Driver-first auto-fill
  const handleDriverSelect = async (driverId) => {
    if (!driverId) {
      setConflicts(null);
      // Unassign driver
      if (load.driver_id) saveField('driver_id', null);
      return;
    }

    // Skip if selecting the same driver
    if (String(driverId) === String(load.driver_id)) return;

    setChecking(true);
    setConflicts(null);

    try {
      // 1. Check availability (skip if no appointment dates yet)
      const pickupDate = load.stops?.[0]?.appointment_start;
      const deliveryDate = load.stops?.[load.stops.length - 1]?.appointment_end;

      if (pickupDate && deliveryDate) {
        const availability = await checkDriverAvailability(driverId, pickupDate, deliveryDate);
        if (!availability.available) {
          setConflicts(availability.conflicts);
          setChecking(false);
          return;
        }
      }

      // 2. Get driver's current truck + suggested trailer + team driver
      const vehicleInfo = await getVehicleByDriver(driverId);

      // 3. Build payload — never overwrite fields dispatcher already set
      const payload = { driverId };
      if (!load.truck_id && vehicleInfo.truck) {
        payload.truck_id = vehicleInfo.truck.id;
      }
      if (!load.trailer_id && vehicleInfo.suggested_trailer) {
        payload.trailer_id = vehicleInfo.suggested_trailer.id;
      }
      if (!load.driver2_id && vehicleInfo.team_driver) {
        payload.driver2_id = vehicleInfo.team_driver.id;
      }

      setChecking(false);

      // 4. Atomic assign
      assignMutation.mutate(payload);
    } catch (error) {
      setChecking(false);
      toast.error(error.response?.data?.error || 'Failed to check driver availability');
    }
  };

  // Truck-first auto-fill
  const handleTruckSelect = async (truckId) => {
    if (!truckId) {
      saveField('truck_id', null);
      return;
    }

    const truck = trucks.find(t => String(t.id) === String(truckId));
    const updates = { truck_id: truckId };

    // Auto-fill drivers from truck assignment if not already set
    if (!load.driver_id && truck?.current_driver_id) {
      updates.driver_id = truck.current_driver_id;
    }
    if (!load.driver2_id && truck?.current_driver2_id) {
      updates.driver2_id = truck.current_driver2_id;
    }

    saveFields(updates);

    const autoFilled = [];
    if (updates.driver_id) autoFilled.push(`Driver ${truck?.driver_name || ''}`);
    if (updates.driver2_id) autoFilled.push(`Team ${truck?.driver2_name || ''}`);
    if (autoFilled.length > 0) {
      toast.success(`Truck set (auto-filled: ${autoFilled.join(', ')})`);
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
          {/* Carrier (brokered mode) */}
          {carriers && carriers.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Carrier</label>
              <EditableCombobox
                value={load.carrier_id ? String(load.carrier_id) : null}
                displayValue={load.carrier_name}
                onSave={(v) => {
                  const newCarrierId = v ? parseInt(v) : null;
                  if (newCarrierId !== load.carrier_id) {
                    // Carrier changed — clear stale dispatch fields
                    saveFields({
                      carrier_id: newCarrierId,
                      driver_id: null,
                      driver2_id: null,
                      truck_id: null,
                      trailer_id: null,
                    });
                    setConflicts(null);
                  }
                }}
                options={carrierOpts}
                placeholder="Own fleet"
                searchPlaceholder="Search carriers..."
                allowNone
                disabled={disabled}
              />
              {isBrokered && (
                <Badge variant="outline" className="text-[10px] mt-1">Brokered</Badge>
              )}
            </div>
          )}

          {/* Driver */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Driver</label>
            <EditableCombobox
              value={load.driver_id ? String(load.driver_id) : null}
              displayValue={load.driver_name}
              onSave={handleDriverSelect}
              options={driverOpts}
              placeholder="Select driver..."
              searchPlaceholder="Search drivers..."
              allowNone
              disabled={disabled}
            />
            {currentDriver && load.driver_id && (
              <div className="text-[11px] text-muted-foreground ml-1">{currentDriver.phone} &middot; {currentDriver.pay_model}</div>
            )}
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
            <EditableCombobox
              value={load.truck_id ? String(load.truck_id) : null}
              displayValue={load.truck_unit ? `${load.truck_unit} ${load.truck_info ? `(${load.truck_info})` : ''}` : null}
              onSave={handleTruckSelect}
              options={truckOpts}
              placeholder="None"
              searchPlaceholder="Search trucks..."
              allowNone
              disabled={disabled}
            />
          </div>

          {/* Trailer */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Trailer</label>
            <EditableCombobox
              value={load.trailer_id ? String(load.trailer_id) : null}
              displayValue={load.trailer_unit ? `${load.trailer_unit} ${load.trailer_info ? `(${load.trailer_info})` : ''}` : null}
              onSave={(v) => saveField('trailer_id', v)}
              options={trailerOpts}
              placeholder="None"
              searchPlaceholder="Search trailers..."
              allowNone
              disabled={disabled}
            />
          </div>

          {/* Team Driver */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Team Driver</label>
            <EditableCombobox
              value={load.driver2_id ? String(load.driver2_id) : null}
              displayValue={load.driver2_name}
              onSave={(v) => saveField('driver2_id', v)}
              options={driver2Opts}
              placeholder="None"
              searchPlaceholder="Search drivers..."
              allowNone
              disabled={disabled}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
