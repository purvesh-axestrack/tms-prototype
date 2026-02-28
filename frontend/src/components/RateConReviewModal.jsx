import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createLoadFromExtract, getCustomers } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, CheckCircle, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { EQUIPMENT_TYPES } from '@/lib/constants';

function ConfidenceDot({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-green-500' : score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-[10px] text-muted-foreground">{pct}%</span>
    </span>
  );
}

export default function RateConReviewModal({ data, onClose }) {
  const { extracted, document_id, filename } = data;
  const ext = extracted.data || {};
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const customerOpts = customers.filter(c => c.is_active).map(c => ({ value: String(c.id), label: c.company_name }));

  // Build editable form from extracted data
  const [form, setForm] = useState({
    reference_number: ext.reference_number?.value || '',
    customer_id: null,
    broker_name: ext.broker_name?.value || '',
    rate_amount: ext.rate_amount?.value || '',
    rate_type: ext.rate_type?.value || 'FLAT',
    loaded_miles: ext.loaded_miles?.value || '',
    commodity: ext.commodity?.value || '',
    weight: ext.weight?.value || '',
    equipment_type: ext.equipment_type?.value || 'DRY_VAN',
    special_instructions: ext.special_instructions?.value || '',
    stops: (ext.stops || []).map(s => ({
      stop_type: s.stop_type || 'PICKUP',
      facility_name: s.facility_name || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      zip: s.zip || '',
      appointment_start: s.appointment_start || '',
      appointment_end: s.appointment_end || '',
    })),
  });

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const updateStop = (idx, field, value) => {
    const stops = [...form.stops];
    stops[idx] = { ...stops[idx], [field]: value };
    setForm(f => ({ ...f, stops }));
  };

  const createMutation = useMutation({
    mutationFn: createLoadFromExtract,
    onSuccess: () => {
      toast.success('Load created from rate con');
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create load');
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({
      document_id,
      data: {
        ...form,
        rate_amount: parseFloat(form.rate_amount) || 0,
        loaded_miles: parseInt(form.loaded_miles) || 0,
        weight: parseInt(form.weight) || 0,
        confidence: extracted.confidence,
      },
    });
  };

  const overallConf = extracted.confidence;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Review Extracted Rate Con
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {filename}
            {overallConf != null && (
              <Badge variant="outline" className="text-xs">
                Confidence: {Math.round(overallConf * 100)}%
                <ConfidenceDot score={overallConf} />
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Reference # <ConfidenceDot score={ext.reference_number?.confidence} /></Label>
              <Input value={form.reference_number} onChange={e => updateField('reference_number', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Customer</Label>
              <Combobox
                value={form.customer_id}
                onChange={(v) => updateField('customer_id', v)}
                options={customerOpts}
                placeholder={form.broker_name ? `Match: "${form.broker_name}"` : 'Select customer...'}
                searchPlaceholder="Search customers..."
              />
            </div>
          </div>

          {/* Rate info */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Rate <ConfidenceDot score={ext.rate_amount?.confidence} /></Label>
              <Input type="number" value={form.rate_amount} onChange={e => updateField('rate_amount', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Rate Type</Label>
              <Input value={form.rate_type} onChange={e => updateField('rate_type', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Miles <ConfidenceDot score={ext.loaded_miles?.confidence} /></Label>
              <Input type="number" value={form.loaded_miles} onChange={e => updateField('loaded_miles', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Weight <ConfidenceDot score={ext.weight?.confidence} /></Label>
              <Input type="number" value={form.weight} onChange={e => updateField('weight', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Commodity <ConfidenceDot score={ext.commodity?.confidence} /></Label>
              <Input value={form.commodity} onChange={e => updateField('commodity', e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Equipment <ConfidenceDot score={ext.equipment_type?.confidence} /></Label>
              <Input value={form.equipment_type} onChange={e => updateField('equipment_type', e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <Separator />

          {/* Stops */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Stops ({form.stops.length})
            </Label>
            <div className="space-y-3">
              {form.stops.map((stop, i) => (
                <div key={i} className="p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge variant={stop.stop_type === 'PICKUP' ? 'default' : 'secondary'} className="text-[10px]">
                      {stop.stop_type}
                    </Badge>
                    <ConfidenceDot score={ext.stops?.[i]?.confidence} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Facility</Label>
                      <Input value={stop.facility_name} onChange={e => updateStop(i, 'facility_name', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">Address</Label>
                      <Input value={stop.address} onChange={e => updateStop(i, 'address', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 col-span-2">
                      <Input placeholder="City" value={stop.city} onChange={e => updateStop(i, 'city', e.target.value)} className="h-7 text-xs" />
                      <Input placeholder="State" value={stop.state} onChange={e => updateStop(i, 'state', e.target.value)} className="h-7 text-xs" />
                      <Input placeholder="ZIP" value={stop.zip} onChange={e => updateStop(i, 'zip', e.target.value)} className="h-7 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
              {form.stops.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No stops extracted — you can add them after creation</p>
              )}
            </div>
          </div>

          {/* Special instructions */}
          {form.special_instructions && (
            <>
              <Separator />
              <div>
                <Label className="text-xs">Special Instructions</Label>
                <Input value={form.special_instructions} onChange={e => updateField('special_instructions', e.target.value)} className="h-8 text-sm" />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="theme-brand-bg text-white">
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Create Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
