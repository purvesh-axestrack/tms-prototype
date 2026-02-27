import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer, updateCustomer } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY_FORM = { company_name: '', customer_type: '', mc_number: '', dot_number: '', billing_email: '', payment_terms: 30, phone: '', contact_name: '', address: '', city: '', state: '', zip: '', credit_limit: '' };

export default function CustomerFormDialog({ open, onOpenChange, editingCustomer, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() => {
    if (editingCustomer) {
      return {
        company_name: editingCustomer.company_name || '',
        customer_type: editingCustomer.customer_type || '',
        mc_number: editingCustomer.mc_number || '',
        dot_number: editingCustomer.dot_number || '',
        billing_email: editingCustomer.billing_email || '',
        payment_terms: editingCustomer.payment_terms || 30,
        phone: editingCustomer.phone || '',
        contact_name: editingCustomer.contact_name || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        state: editingCustomer.state || '',
        zip: editingCustomer.zip || '',
        credit_limit: editingCustomer.credit_limit || '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (data) => {
      toast.success('Customer created');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.(data);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => {
      toast.success('Customer updated');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', editingCustomer?.id] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const handleSubmit = () => {
    if (!formData.company_name.trim()) return toast.error('Company name is required');
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="e.g., CH Robinson" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={formData.customer_type || 'NONE'} onValueChange={(v) => setFormData({ ...formData, customer_type: v === 'NONE' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not specified</SelectItem>
                  <SelectItem value="BROKER">Broker</SelectItem>
                  <SelectItem value="SHIPPER">Shipper</SelectItem>
                  <SelectItem value="PARTNER">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contact Name</Label>
              <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Billing Email</Label>
            <Input type="email" value={formData.billing_email} onChange={(e) => setFormData({ ...formData, billing_email: e.target.value })} placeholder="ap@company.com" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>MC Number</Label>
              <Input value={formData.mc_number} onChange={(e) => setFormData({ ...formData, mc_number: e.target.value })} placeholder="MC123456" />
            </div>
            <div className="space-y-1.5">
              <Label>DOT Number</Label>
              <Input value={formData.dot_number} onChange={(e) => setFormData({ ...formData, dot_number: e.target.value })} placeholder="DOT123456" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Input type="number" value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Chicago" />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="IL" maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} placeholder="60601" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Credit Limit ($)</Label>
            <Input type="number" step="0.01" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })} placeholder="50000.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="theme-brand-bg text-white">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editingCustomer ? 'Save Changes' : 'Create Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
