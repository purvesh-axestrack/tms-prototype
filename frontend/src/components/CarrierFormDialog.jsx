import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCarrier, updateCarrier } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { CARRIER_STATUSES } from '@/lib/constants';

const EMPTY_FORM = {
  company_name: '', mc_number: '', dot_number: '', scac_code: '',
  contact_name: '', contact_email: '', contact_phone: '',
  address: '', city: '', state: '', zip: '',
  status: 'PROSPECT', notes: '',
};

export default function CarrierFormDialog({ open, onOpenChange, editingCarrier, onSuccess }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    if (editingCarrier) {
      return {
        company_name: editingCarrier.company_name || '',
        mc_number: editingCarrier.mc_number || '',
        dot_number: editingCarrier.dot_number || '',
        scac_code: editingCarrier.scac_code || '',
        contact_name: editingCarrier.contact_name || '',
        contact_email: editingCarrier.contact_email || '',
        contact_phone: editingCarrier.contact_phone || '',
        address: editingCarrier.address || '',
        city: editingCarrier.city || '',
        state: editingCarrier.state || '',
        zip: editingCarrier.zip || '',
        status: editingCarrier.status || 'PROSPECT',
        notes: editingCarrier.notes || '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const setInput = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const set = (field) => (v) => setForm(prev => ({ ...prev, [field]: v }));

  const createMutation = useMutation({
    mutationFn: createCarrier,
    onSuccess: (data) => {
      toast.success('Carrier created');
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      onOpenChange(false);
      onSuccess?.(data);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create carrier'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateCarrier(editingCarrier.id, data),
    onSuccess: () => {
      toast.success('Carrier updated');
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      queryClient.invalidateQueries({ queryKey: ['carrier', editingCarrier.id] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update carrier'),
  });

  const handleSubmit = () => {
    if (!form.company_name) return toast.error('Company name is required');
    if (editingCarrier) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editingCarrier ? 'Edit Carrier' : 'Add Carrier'}</DialogTitle>
          {!editingCarrier && <DialogDescription>Add a new carrier for brokered loads</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Company Details</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.company_name} onChange={setInput('company_name')} placeholder="Carrier company name" />
            </div>
            <div className="space-y-1.5">
              <Label>MC Number</Label>
              <Input value={form.mc_number} onChange={setInput('mc_number')} placeholder="e.g., MC-123456" />
            </div>
            <div className="space-y-1.5">
              <Label>DOT Number</Label>
              <Input value={form.dot_number} onChange={setInput('dot_number')} placeholder="e.g., 1234567" />
            </div>
            <div className="space-y-1.5">
              <Label>SCAC Code</Label>
              <Input value={form.scac_code} onChange={setInput('scac_code')} placeholder="2-4 letter code" maxLength={4} />
            </div>
            {editingCarrier && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={set('status')}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input value={form.contact_name} onChange={setInput('contact_name')} placeholder="Primary contact" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.contact_phone} onChange={setInput('contact_phone')} placeholder="(555) 123-4567" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input value={form.contact_email} onChange={setInput('contact_email')} placeholder="dispatch@carrier.com" type="email" />
            </div>
          </div>

          <Separator />
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Address</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Street Address</Label>
              <Input value={form.address} onChange={setInput('address')} placeholder="123 Main St" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={setInput('city')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={setInput('state')} maxLength={2} placeholder="TX" />
              </div>
              <div className="space-y-1.5">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={setInput('zip')} placeholder="75001" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={setInput('notes')} rows={2} placeholder="Any additional notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="theme-brand-bg text-white">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingCarrier ? 'Save Changes' : 'Create Carrier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
