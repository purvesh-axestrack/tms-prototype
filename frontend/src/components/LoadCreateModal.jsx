import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, getCarriers, getUsers, createLoad } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Loader2, AlertTriangle, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { EQUIPMENT_TYPES, STOP_ACTION_TYPES, STOP_ACTION_TYPE_LABELS, APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS, STOP_REEFER_MODES, STOP_REEFER_MODE_LABELS, QUANTITY_TYPES, QUANTITY_TYPE_LABELS } from '@/lib/constants';
import LocationAutocomplete from './LocationAutocomplete';

const emptyStop = () => ({
  stop_type: 'PICKUP',
  facility_name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  appointment_start: '',
  appointment_end: '',
  action_type: '',
  appointment_type: 'APPOINTMENT',
  quantity: '',
  quantity_type: '',
  commodity: '',
  weight: '',
  stop_reefer_mode: '',
  stop_set_temp: '',
  bol_number: '',
  po_number: '',
  ref_number: '',
  instructions: '',
});

export default function LoadCreateModal({ onClose }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    reference_number: '',
    customer_id: '',
    equipment_type: 'DRY_VAN',
    commodity: '',
    weight: '',
    rate_amount: '',
    rate_type: 'FLAT',
    loaded_miles: '',
    empty_miles: '',
    fuel_surcharge_pct: '',
    special_instructions: '',
    is_ltl: false,
    // New load metadata
    booking_authority_id: '',
    sales_agent_id: '',
    customer_ref_number: '',
    stops: [
      { ...emptyStop(), stop_type: 'PICKUP' },
      { ...emptyStop(), stop_type: 'DELIVERY' },
    ],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const createMutation = useMutation({
    mutationFn: (loadData) => createLoad(loadData),
    onSuccess: () => {
      toast.success('Load created successfully');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to create load');
    },
  });

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateStop = (index, field, value) => {
    setForm(prev => {
      const stops = [...prev.stops];
      stops[index] = { ...stops[index], [field]: value };
      return { ...prev, stops };
    });
  };

  const addStop = () => {
    setForm(prev => ({
      ...prev,
      stops: [...prev.stops, emptyStop()],
    }));
  };

  const removeStop = (index) => {
    if (form.stops.length <= 2) return;
    setForm(prev => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.customer_id) { setError('Customer is required'); return; }
    if (!form.rate_amount || parseFloat(form.rate_amount) <= 0) { setError('Valid rate amount is required'); return; }
    if (form.stops.length < 2) { setError('At least 2 stops are required'); return; }

    const fuelSurchargeAmount = form.fuel_surcharge_pct
      ? (parseFloat(form.rate_amount) * parseFloat(form.fuel_surcharge_pct) / 100)
      : 0;

    createMutation.mutate({
      reference_number: form.reference_number || undefined,
      customer_id: form.customer_id,
      equipment_type: form.equipment_type,
      commodity: form.commodity,
      weight: form.weight ? parseInt(form.weight) : 0,
      rate_amount: parseFloat(form.rate_amount),
      rate_type: form.rate_type,
      loaded_miles: form.loaded_miles ? parseInt(form.loaded_miles) : 0,
      empty_miles: form.empty_miles ? parseInt(form.empty_miles) : 0,
      fuel_surcharge_amount: fuelSurchargeAmount,
      special_instructions: form.special_instructions || null,
      is_ltl: form.is_ltl,
      booking_authority_id: form.booking_authority_id || null,
      sales_agent_id: form.sales_agent_id || null,
      customer_ref_number: form.customer_ref_number || null,
      stops: form.stops.map(stop => ({
        stop_type: stop.stop_type,
        facility_name: stop.facility_name,
        address: stop.address,
        city: stop.city,
        state: stop.state,
        zip: stop.zip,
        appointment_start: stop.appointment_start || null,
        appointment_end: stop.appointment_end || null,
        action_type: stop.action_type || null,
        appointment_type: stop.appointment_type || 'APPOINTMENT',
        quantity: stop.quantity ? parseFloat(stop.quantity) : null,
        quantity_type: stop.quantity_type || null,
        commodity: stop.commodity || null,
        weight: stop.weight ? parseFloat(stop.weight) : null,
        stop_reefer_mode: stop.stop_reefer_mode || null,
        stop_set_temp: stop.stop_set_temp ? parseFloat(stop.stop_set_temp) : null,
        bol_number: stop.bol_number || null,
        po_number: stop.po_number || null,
        ref_number: stop.ref_number || null,
        instructions: stop.instructions || null,
      })),
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Create New Load</DialogTitle>
          <DialogDescription>Fill in the load details below</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input type="text" value={form.reference_number} onChange={(e) => updateField('reference_number', e.target.value)} placeholder="Auto-generated if empty" />
              </div>
              <div className="space-y-2">
                <Label>Customer <span className="text-red-400">*</span></Label>
                <Select value={form.customer_id || undefined} onValueChange={(v) => updateField('customer_id', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Equipment Type</Label>
                <Select value={form.equipment_type} onValueChange={(v) => updateField('equipment_type', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Input type="text" value={form.commodity} onChange={(e) => updateField('commodity', e.target.value)} placeholder="e.g. General Freight" />
              </div>
              <div className="space-y-2">
                <Label>Weight (lbs)</Label>
                <Input type="number" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} placeholder="0" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Checkbox id="is_ltl" checked={form.is_ltl} onCheckedChange={(v) => updateField('is_ltl', !!v)} />
                <Label htmlFor="is_ltl" className="text-sm cursor-pointer">LTL (Less Than Truckload)</Label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">Load Metadata</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer Ref #</Label>
                <Input value={form.customer_ref_number} onChange={(e) => updateField('customer_ref_number', e.target.value)} placeholder="Customer reference" />
              </div>
              <div className="space-y-2">
                <Label>Booking Authority</Label>
                <Select value={form.booking_authority_id || undefined} onValueChange={(v) => updateField('booking_authority_id', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select carrier..." /></SelectTrigger>
                  <SelectContent>
                    {carriers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sales Agent</Label>
                <Select value={form.sales_agent_id || undefined} onValueChange={(v) => updateField('sales_agent_id', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select user..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">Rate Information</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Rate Amount <span className="text-red-400">*</span></Label>
                <Input type="number" step="0.01" value={form.rate_amount} onChange={(e) => updateField('rate_amount', e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label>Rate Type</Label>
                <Select value={form.rate_type} onValueChange={(v) => updateField('rate_type', v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select rate type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FLAT">Flat Rate</SelectItem>
                    <SelectItem value="CPM">Per Mile</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loaded Miles</Label>
                <Input type="number" value={form.loaded_miles} onChange={(e) => updateField('loaded_miles', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Empty Miles</Label>
                <Input type="number" value={form.empty_miles} onChange={(e) => updateField('empty_miles', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Stops ({form.stops.length})</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addStop} className="theme-brand-text">
                <Plus className="w-3.5 h-3.5" />
                Add Stop
              </Button>
            </div>
            <div className="space-y-3">
              {form.stops.map((stop, index) => (
                <Card key={index} className={`py-3 border-l-4 ${stop.stop_type === 'PICKUP' ? 'border-l-blue-400' : 'border-l-green-400'}`}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          stop.stop_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {index + 1}
                        </div>
                        <Select value={stop.stop_type} onValueChange={(v) => updateStop(index, 'stop_type', v)}>
                          <SelectTrigger className="h-7 w-auto px-2 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PICKUP">PICKUP</SelectItem>
                            <SelectItem value="DELIVERY">DELIVERY</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={stop.action_type || 'NONE'} onValueChange={(v) => updateStop(index, 'action_type', v === 'NONE' ? '' : v)}>
                          <SelectTrigger className="h-7 w-auto px-2 text-xs">
                            <SelectValue placeholder="Action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">No Action</SelectItem>
                            {STOP_ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{STOP_ACTION_TYPE_LABELS[t]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {form.stops.length > 2 && (
                        <Button type="button" variant="ghost" size="xs" onClick={() => removeStop(index)} className="text-red-400 hover:text-red-600">
                          <X className="w-3 h-3" /> Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Facility</Label>
                        <LocationAutocomplete
                          value={stop.facility_name}
                          onChange={(val) => updateStop(index, 'facility_name', val)}
                          onSelect={(loc) => {
                            setForm(prev => {
                              const stops = [...prev.stops];
                              stops[index] = {
                                ...stops[index],
                                facility_name: loc.facility_name,
                                address: loc.address || '',
                                city: loc.city || '',
                                state: loc.state || '',
                                zip: loc.zip || '',
                              };
                              return { ...prev, stops };
                            });
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="lg:col-span-2 space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input value={stop.address} onChange={(e) => updateStop(index, 'address', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">City</Label>
                        <Input value={stop.city} onChange={(e) => updateStop(index, 'city', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">State</Label>
                        <Input value={stop.state} onChange={(e) => updateStop(index, 'state', e.target.value)} className="h-8 text-sm" maxLength={2} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">ZIP</Label>
                        <Input value={stop.zip} onChange={(e) => updateStop(index, 'zip', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Appt Type</Label>
                        <Select value={stop.appointment_type || 'APPOINTMENT'} onValueChange={(v) => updateStop(index, 'appointment_type', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {APPOINTMENT_TYPES.map(t => <SelectItem key={t} value={t}>{APPOINTMENT_TYPE_LABELS[t]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Appt Start</Label>
                        <Input type="datetime-local" value={stop.appointment_start} onChange={(e) => updateStop(index, 'appointment_start', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Appt End</Label>
                        <Input type="datetime-local" value={stop.appointment_end} onChange={(e) => updateStop(index, 'appointment_end', e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Commodity</Label>
                        <Input value={stop.commodity} onChange={(e) => updateStop(index, 'commodity', e.target.value)} className="h-8 text-sm" placeholder="e.g. General Freight" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Weight (lbs)</Label>
                        <Input type="number" step="0.01" value={stop.weight} onChange={(e) => updateStop(index, 'weight', e.target.value)} className="h-8 text-sm" placeholder="0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" step="0.01" value={stop.quantity} onChange={(e) => updateStop(index, 'quantity', e.target.value)} className="h-8 text-sm" placeholder="0" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty Type</Label>
                        <Select value={stop.quantity_type || 'NONE'} onValueChange={(v) => updateStop(index, 'quantity_type', v === 'NONE' ? '' : v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            {QUANTITY_TYPES.map(t => <SelectItem key={t} value={t}>{QUANTITY_TYPE_LABELS[t]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {stop.stop_type === 'PICKUP' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1"><Snowflake className="w-3 h-3 text-sky-500" /> Reefer Mode</Label>
                          <Select value={stop.stop_reefer_mode || 'NONE'} onValueChange={(v) => updateStop(index, 'stop_reefer_mode', v === 'NONE' ? '' : v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              {STOP_REEFER_MODES.map(m => <SelectItem key={m} value={m}>{STOP_REEFER_MODE_LABELS[m]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Set Temp (&deg;F)</Label>
                          <Input type="number" step="0.1" value={stop.stop_set_temp} onChange={(e) => updateStop(index, 'stop_set_temp', e.target.value)} className="h-8 text-sm" placeholder="e.g. -10" />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">BOL #</Label>
                        <Input value={stop.bol_number} onChange={(e) => updateStop(index, 'bol_number', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">PO #</Label>
                        <Input value={stop.po_number} onChange={(e) => updateStop(index, 'po_number', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{stop.stop_type === 'PICKUP' ? 'PU #' : 'DEL #'}</Label>
                        <Input value={stop.ref_number} onChange={(e) => updateStop(index, 'ref_number', e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Instructions</Label>
                      <Input value={stop.instructions} onChange={(e) => updateStop(index, 'instructions', e.target.value)} className="h-8 text-sm" placeholder="Stop-specific instructions" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Special Instructions</Label>
            <Textarea
              value={form.special_instructions}
              onChange={(e) => updateField('special_instructions', e.target.value)}
              rows={3}
              placeholder="Any special handling or delivery instructions..."
            />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="theme-brand-bg text-white">
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : 'Create Load'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
